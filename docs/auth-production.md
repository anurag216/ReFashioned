# Production authentication configuration

RE:Fashioned production authentication is intentionally limited to email/password and Google OAuth for the paying pilot.

## Application redirect endpoints

- Google OAuth return: `/auth/callback`
- Password recovery: `/auth/reset-password`

Production Supabase URL Configuration should use the deployed RE:Fashioned HTTPS origin as the Site URL and allow only the exact production callback/recovery URLs needed by the app. Avoid broad production wildcards.

## Google OAuth

Configure a dedicated production Google Web OAuth client. In Google Cloud, the authorized redirect URI is the Supabase Auth callback URL shown on the Google provider page for the Paris production project. Store the Google Client ID and Client Secret only in Supabase Auth provider configuration; never commit them to Git.

The app calls `signInWithOAuth` with provider `google` and a fixed first-party `/auth/callback` redirect. The callback does not honor caller-supplied destinations.

## Email/password

- Require email confirmation in production.
- Set the minimum password length to at least 12 characters in Supabase Auth.
- Enable leaked-password protection when the production project is on a plan that supports it.
- Configure custom SMTP before external pilot onboarding.
- Password recovery emails redirect to the dedicated `/auth/reset-password` route, where the authenticated recovery session can update the password.

## Pilot provider scope

Google is the only social provider enabled for the pilot. Microsoft/Entra is the next enterprise provider to evaluate. Apple and consumer/social providers remain disabled until there is a concrete product need.
