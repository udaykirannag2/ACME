import { Amplify } from 'aws-amplify'

export function configureAmplify(): void {
  const userPoolId     = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined
  const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined
  const domain         = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined
  const callbackUrl    = import.meta.env.VITE_APP_CALLBACK_URL as string | undefined

  // No-op in local dev (no Cognito configured)
  if (!userPoolId || !userPoolClientId) return

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          oauth: {
            domain: domain?.replace('https://', '') ?? '',
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: [callbackUrl ?? 'http://localhost:5173/'],
            redirectSignOut: [callbackUrl ? callbackUrl.replace(/\/$/, '/login') : 'http://localhost:5173/login'],
            responseType: 'code',
          },
        },
      },
    },
  })
}
