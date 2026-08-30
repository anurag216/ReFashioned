# Pilot auth rollout checklist

Before switching the live app to the Paris production Supabase project:

- [ ] Merge the production auth PR after all CI gates pass.
- [ ] Set the production Site URL to the deployed RE:Fashioned HTTPS origin.
- [ ] Add the exact production `/auth/callback` and `/auth/reset-password` redirect URLs.
- [ ] Enable email confirmation.
- [ ] Set password minimum length to at least 12 characters.
- [ ] Enable leaked-password protection when available on the production plan.
- [ ] Configure custom SMTP and test confirmation + recovery delivery.
- [ ] Create a dedicated Google production Web OAuth client.
- [ ] Configure Google's authorized redirect URI to the Paris Supabase Auth callback URL shown in the provider settings.
- [ ] Store Google Client ID/secret only in Supabase Auth provider settings.
- [ ] Enable only Google as the pilot social provider.
- [ ] Verify Google sign-in for an existing verified-email user and a new user.
- [ ] Verify password recovery, logout, and re-login.
- [ ] Re-run production-safe browser smoke after deployment.
