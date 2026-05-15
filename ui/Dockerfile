# syntax=docker/dockerfile:1
# Build context must be repo root: docker build -f ui/Dockerfile .
#
# Lambda Web Adapter pattern — based on the official aws-lambda-web-adapter
# FastAPI example. LWA bridges Lambda invocations to uvicorn on $PORT.

FROM public.ecr.aws/docker/library/python:3.12-slim

# Lambda Web Adapter — intercepts Lambda invocations, forwards as HTTP
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

ENV PORT=8000
ENV AWS_LWA_PORT=8000
ENV AWS_LWA_READINESS_CHECK_PATH=/health
ENV AWS_LWA_INVOKE_MODE=response_stream
ENV PYTHONPATH=/var/task

WORKDIR /var/task

# Install Python deps (uvicorn ends up in /usr/local/bin/uvicorn on PATH)
RUN pip install --no-cache-dir \
      "fastapi>=0.115.0" \
      "uvicorn[standard]>=0.30.0" \
      "boto3>=1.35.0" \
      "botocore>=1.35.0" \
      "pydantic>=2.9.0" \
      "pandas>=2.2.0" \
      "reportlab>=4.2.0" \
      "PyJWT[crypto]>=2.8.0" \
      "httpx>=0.27.0"

COPY ui/api/ /var/task/ui/api/
RUN touch /var/task/ui/__init__.py

CMD exec uvicorn --host 0.0.0.0 --port $PORT --log-level info ui.api.main:app
