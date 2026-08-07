# Repository engineering rules

- Never commit credentials, tokens, browser storage state, or `.env` files.
- Production code must never include test-authentication fallbacks.
- Database security changes require migrations and tests.
- Prefer focused pull requests without unrelated product changes.
- Run typecheck, unit tests, and the production build before completion.
- Never force-push or rewrite history unless the task explicitly requests it.
