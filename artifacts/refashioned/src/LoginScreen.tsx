import { useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { Grid, ArrowLeft } from "lucide-react";

type Mode = "sign-in" | "sign-up" | "forgot-password";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!supabase) {
      setError("Authentication is not configured. Please contact support.");
      setLoading(false);
      return;
    }

    if (mode === "sign-in") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
      } else if (!rememberMe) {
        Object.keys(localStorage)
          .filter(k => k.startsWith("sb-"))
          .forEach(k => localStorage.removeItem(k));
      }
    } else if (mode === "sign-up") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) setError(err.message);
      else setSuccess("Check your email to confirm your account before signing in.");
    } else {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (err) setError(err.message);
      else setSuccess("Reset link sent — check your inbox.");
    }

    setLoading(false);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSuccess(null);
    setPassword("");
    setConfirmPassword("");
  }

  const titles: Record<Mode, string> = {
    "sign-in": "Sign in to your account",
    "sign-up": "Create an account",
    "forgot-password": "Reset your password",
  };

  const subtitles: Record<Mode, string> = {
    "sign-in": "Enter your credentials to access the platform.",
    "sign-up": "Fill in the details below to get started.",
    "forgot-password": "We'll send a secure reset link to your email.",
  };

  const submitLabels: Record<Mode, [string, string]> = {
    "sign-in": ["Sign In", "Signing in…"],
    "sign-up": ["Create Account", "Creating account…"],
    "forgot-password": ["Send Reset Link", "Sending link…"],
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "hsl(152 53% 8%)" }}
    >
      {/* Subtle radial glow behind card */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, hsl(145 65% 20% / 0.35) 0%, transparent 70%)",
        }}
      />

      {/* Logo */}
      <div className="relative mb-8 flex flex-col items-center gap-3">
        <div
          className="p-3 rounded-xl shadow-lg"
          style={{ background: "hsl(145 65% 66%)" }}
        >
          <Grid className="w-6 h-6" style={{ color: "hsl(152 53% 11%)" }} />
        </div>
        <div className="text-center">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "hsl(0 0% 95%)" }}
          >
            RE:Fashioned
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(0 0% 95% / 0.45)" }}>
            Sustainability Intelligence Platform
          </p>
        </div>
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "hsl(152 40% 11%)",
          border: "1px solid hsl(152 40% 18%)",
        }}
      >
        {/* Card header */}
        <div
          className="px-6 pt-6 pb-5"
          style={{ borderBottom: "1px solid hsl(152 40% 18% / 0.7)" }}
        >
          {mode === "forgot-password" && (
            <button
              type="button"
              onClick={() => switchMode("sign-in")}
              className="flex items-center gap-1.5 mb-4 text-xs font-medium transition-colors"
              style={{ color: "hsl(0 0% 95% / 0.45)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(0 0% 95% / 0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "hsl(0 0% 95% / 0.45)")}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </button>
          )}
          <h2
            className="text-lg font-semibold"
            style={{ color: "hsl(0 0% 95%)" }}
          >
            {titles[mode]}
          </h2>
          <p className="text-sm mt-1" style={{ color: "hsl(0 0% 95% / 0.45)" }}>
            {subtitles[mode]}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              className="block text-xs font-medium uppercase tracking-wider"
              style={{ color: "hsl(0 0% 95% / 0.55)" }}
            >
              Email address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2"
              style={{
                background: "hsl(152 53% 8% / 0.6)",
                border: "1px solid hsl(152 40% 22%)",
                color: "hsl(0 0% 95%)",
              }}
            />
          </div>

          {/* Password */}
          {mode !== "forgot-password" && (
            <div className="space-y-1.5">
              <label
                className="block text-xs font-medium uppercase tracking-wider"
                style={{ color: "hsl(0 0% 95% / 0.55)" }}
              >
                Password
              </label>
              <input
                type="password"
                required
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2"
                style={{
                  background: "hsl(152 53% 8% / 0.6)",
                  border: "1px solid hsl(152 40% 22%)",
                  color: "hsl(0 0% 95%)",
                }}
              />
            </div>
          )}

          {/* Confirm password */}
          {mode === "sign-up" && (
            <div className="space-y-1.5">
              <label
                className="block text-xs font-medium uppercase tracking-wider"
                style={{ color: "hsl(0 0% 95% / 0.55)" }}
              >
                Confirm password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2"
                style={{
                  background: "hsl(152 53% 8% / 0.6)",
                  border: "1px solid hsl(152 40% 22%)",
                  color: "hsl(0 0% 95%)",
                }}
              />
            </div>
          )}

          {/* Forgot password + Remember me row */}
          {mode === "sign-in" && (
            <div className="flex items-center justify-between -mt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <span
                  className="relative flex items-center justify-center w-4 h-4 rounded shrink-0 transition-colors"
                  style={{
                    background: rememberMe ? "hsl(145 65% 66%)" : "transparent",
                    border: rememberMe
                      ? "1px solid hsl(145 65% 66%)"
                      : "1px solid hsl(152 40% 30%)",
                  }}
                >
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M1.5 5L4 7.5L8.5 2.5"
                        stroke="hsl(152 53% 11%)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </span>
                <span
                  className="text-xs transition-colors"
                  style={{ color: "hsl(0 0% 95% / 0.55)" }}
                >
                  Remember me
                </span>
              </label>
              <button
                type="button"
                onClick={() => switchMode("forgot-password")}
                className="text-xs font-medium transition-colors"
                style={{ color: "hsl(145 65% 66%)" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
              style={{
                background: "hsl(0 84% 60% / 0.1)",
                border: "1px solid hsl(0 84% 60% / 0.3)",
                color: "hsl(0 84% 75%)",
              }}
            >
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
              style={{
                background: "hsl(145 65% 66% / 0.1)",
                border: "1px solid hsl(145 65% 66% / 0.3)",
                color: "hsl(145 65% 75%)",
              }}
            >
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold text-sm py-2.5 rounded-lg transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "hsl(145 65% 66%)",
              color: "hsl(152 53% 11%)",
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                {submitLabels[mode][1]}
              </>
            ) : (
              submitLabels[mode][0]
            )}
          </button>
        </form>

        {/* Footer toggle */}
        <div
          className="px-6 pb-6 flex justify-center"
          style={{ borderTop: "1px solid hsl(152 40% 18% / 0.5)" }}
        >
          <p className="text-xs pt-4" style={{ color: "hsl(0 0% 95% / 0.35)" }}>
            {mode === "sign-in" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("sign-up")}
                  className="font-semibold transition-opacity hover:opacity-75"
                  style={{ color: "hsl(145 65% 66%)" }}
                >
                  Create one
                </button>
              </>
            ) : mode === "sign-up" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("sign-in")}
                  className="font-semibold transition-opacity hover:opacity-75"
                  style={{ color: "hsl(145 65% 66%)" }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <span style={{ color: "hsl(0 0% 95% / 0.25)" }}>
                Enter your email above to receive a reset link.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Page footer */}
      <p className="relative mt-8 text-xs text-center" style={{ color: "hsl(0 0% 95% / 0.2)" }}>
        © 2026 RE:Fashioned · Sustainability Intelligence
      </p>
    </div>
  );
}
