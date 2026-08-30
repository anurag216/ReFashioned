import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const login = await readFile(new URL("../artifacts/refashioned/src/LoginScreen.tsx", import.meta.url), "utf8");
const main = await readFile(new URL("../artifacts/refashioned/src/main.tsx", import.meta.url), "utf8");
const reset = await readFile(new URL("../artifacts/refashioned/src/pages/ResetPassword.tsx", import.meta.url), "utf8");
const callback = await readFile(new URL("../artifacts/refashioned/src/pages/AuthCallback.tsx", import.meta.url), "utf8");

test("Google OAuth uses a fixed first-party callback and never accepts a caller supplied redirect", () => {
  assert.match(login, /provider:\s*["']google["']/);
  assert.match(login, /redirectTo:\s*`\$\{window\.location\.origin\}\/auth\/callback`/);
  assert.match(main, /pathname === ["']\/auth\/callback["']/);
  assert.match(callback, /window\.location\.replace\(["']\/dashboard["']\)/);
  assert.doesNotMatch(callback, /returnTo|redirect_uri|next=/i);
});

test("password recovery uses a dedicated route and updates the authenticated user", () => {
  assert.match(login, /resetPasswordForEmail/);
  assert.match(login, /redirectTo:\s*`\$\{window\.location\.origin\}\/auth\/reset-password`/);
  assert.match(main, /pathname === ["']\/auth\/reset-password["']/);
  assert.match(reset, /updateUser\(\{ password \}\)/);
  assert.match(reset, /password\.length < 12/);
  assert.match(reset, /signOut\(\)/);
});

test("email sign-up enforces the same minimum password length as recovery", () => {
  assert.match(login, /password\.length < 12/);
  assert.match(login, /minLength=\{mode === ["']sign-up["'] \? 12 : undefined\}/);
});
