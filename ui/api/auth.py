"""
JWT authentication for ACME Finance API.
Validates Cognito tokens issued by the IAM Identity Center-federated user pool.
When COGNITO_USER_POOL_ID is not set (local dev), auth is skipped entirely.
"""
import os
from functools import lru_cache
from typing import Optional

import httpx
import jwt  # PyJWT >= 2.8
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_REGION       = os.getenv("AWS_REGION", "us-east-1")
_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")
_CLIENT_ID    = os.getenv("COGNITO_CLIENT_ID", "")
_ISSUER       = f"https://cognito-idp.{_REGION}.amazonaws.com/{_USER_POOL_ID}"
_JWKS_URL     = f"{_ISSUER}/.well-known/jwks.json"

# Auth is only enforced when Cognito is configured (Lambda); skipped in local dev
_AUTH_ENABLED = bool(_USER_POOL_ID and _CLIENT_ID)


@lru_cache(maxsize=1)
def _jwks() -> dict:
    """Fetch and cache Cognito JWKS keys. Cache is process-lifetime (Lambda warm cache)."""
    resp = httpx.get(_JWKS_URL, timeout=10)
    resp.raise_for_status()
    return resp.json()


_bearer = HTTPBearer(auto_error=False)


def require_auth(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """
    FastAPI dependency — validates Cognito JWT and returns claims dict.
    Returns {} when auth is disabled (local dev, no COGNITO_USER_POOL_ID set).
    Raises HTTP 401 on invalid/missing token when auth is enabled.
    """
    if not _AUTH_ENABLED:
        return {}  # local dev: pass through

    if creds is None:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = creds.credentials
    try:
        header = jwt.get_unverified_header(token)
        key_data = next(
            (k for k in _jwks()["keys"] if k["kid"] == header["kid"]),
            None,
        )
        if key_data is None:
            raise HTTPException(status_code=401, detail="Unknown signing key")
        claims = jwt.decode(
            token,
            jwt.algorithms.RSAAlgorithm.from_jwk(key_data),
            algorithms=["RS256"],
            audience=_CLIENT_ID,
            issuer=_ISSUER,
        )
        return claims
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


# ── Role helpers ──────────────────────────────────────────────────────────────

def get_user_role(claims: dict) -> str:
    """
    Extract the highest role from JWT claims.
    Returns 'admin', 'viewer', or 'none'.
    Groups come from the `cognito:groups` claim populated by IDC federation.
    """
    groups = claims.get("cognito:groups", [])
    if "admin" in groups:
        return "admin"
    if "viewer" in groups:
        return "viewer"
    return "none"


def require_any_role(claims: dict = Depends(require_auth)) -> dict:
    """
    FastAPI dependency — allows admin and viewer users.
    Blocks authenticated users who have no group assignment.
    Passes through in local dev (auth disabled).
    """
    if not _AUTH_ENABLED:
        return claims
    if get_user_role(claims) == "none":
        raise HTTPException(
            status_code=403,
            detail="Access denied — you have not been assigned a role. Contact your admin.",
        )
    return claims


def require_admin(claims: dict = Depends(require_auth)) -> dict:
    """
    FastAPI dependency — allows admin users only.
    Use on write/generate routes: /commentary, /boardpack.
    Passes through in local dev (auth disabled).
    """
    if not _AUTH_ENABLED:
        return claims
    if get_user_role(claims) != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required.",
        )
    return claims
