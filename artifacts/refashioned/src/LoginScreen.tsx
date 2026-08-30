import { useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { Grid, ArrowLeft } from "lucide-react";

type Mode = "sign-in" | "sign-up" | "forgot-password";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-4 h-4">
      <path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.509h3.232c1.891-1.741 2.981-4.309 2.981-7.35Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.809-1.759-5.595-4.123H3.064v2.591A9.998 9.998 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.405 13.9A6.012 6.012 0 0 1 6.091 12c0-.659.114-1.3.314-1.9V7.509H3.064A9.998 9.998 0 0 0 2 12c0 1.614.386 3.141 1.064 4.491L6.405 13.9Z" />
      <path fill="#EA4335" d="M12 5.977c1.468 0 2.786.505 3.823 1.495l2.868-2.868C16.959 2.991 14.695 2 12 2a9.998 9.998 0 0 0-8.936 5.509L6.405 10.1C7.191 7.736 9.395 5.977 12 5.977Z" />
    </svg>
  );
}

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  async function handleGoogleSignIn() {
    setError(null);
    setSuccess(null);
    if (!supabase) {
      setError("Authentication is not configured. Please contact support.");
      return;
    }

    setOauthLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(false);
    }
  }

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
      if (password.length < 12) {
        setError("Use a password with at least 12 characters.");
        setLoading(false);
        return;
      }
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
        redirectTo: `${window.location.origin}/auth/reset-password`,
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "hsl(152 53% 8%)" }}>
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 40%, hsl(145 65% 20% / 0.35) 0%, transparent 70%)" }} />

      <div className="relative mb-8 flex flex-col items-center gap-3">
        <div className="p-3 rounded-xl shadow-lg" style={{ background: "hsl(145 65% 66%)" }}>
          <Grid className="w-6 h-6" style={{ color: "hsl(152 53% 11%)" }} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "hsl(0 0% 95%)" }}>RE:Fashioned</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(0 0% 95% / 0.45)" }}>Sustainability Intelligence Platform</p>
        </div>
      </div>

      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: "hsl(152 40% 11%)", border: "1px solid hsl(152 40% 18%)" }}>
        <div className="px-6 pt-6 pb-5" style={{ borderBottom: "1px solid hsl(152 40% 18% / 0.7)" }}>
          {mode === "forgot-password" && (
            <button type="button" onClick={() => switchMode("sign-in")} className="flex items-center gap-1.5 mb-4 text-xs font-medium transition-colors" style={{ color: "hsl(0 0% 95% / 0.45)" }}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </button>
          )}
          <h2 className="text-lg font-semibold" style={{ color: "hsl(0 0% 95%)" }}>{titles[mode]}</h2>
          <p className="text-sm mt-1" style={{ color: "hsl(0 0% 95% / 0.45)" }}>{subtitles[mode]}</p>
        </div>

        {(mode === "sign-in" || mode === "sign-up") && (
          <div className="px-6 pt-5">
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={oauthLoading || loading}
              className="w-full flex items-center justify-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ borderColor: "hsl(152 40% 28%)", color: "hsl(0 0% 95%)" }}
            >
              <GoogleMark />
              {oauthLoading ? "Connecting to Google…" : "Continue with Google"}
            </button>
            <div className="flex items-center gap-3 pt-5" aria-hidden="true">
              <span className="h-px flex-1" style={{ background: "hsl(152 40% 22%)" }} />
              <span className="text-[11px] uppercase tracking-wider" style={{ color: "hsl(0 0% 95% / 0.35)" }}>or continue with email</span>
              <span className="h-px flex-1" style={{ background: "hsl(152 40% 22%)" }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="block text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(0 0% 95% / 0.55)" }}>Email address</label>
            <input id="auth-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2" style={{ background: "hsl(152 53% 8% / 0.6)", border: "1px solid hsl(152 40% 22%)", color: "hsl(0 0% 95%)" }} />
          </div>

          {mode !== "forgot-password" && (
            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="block text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(0 0% 95% / 0.55)" }}>Password</label>
              <input id="auth-password" type="password" required minLength={mode === "sign-up" ? 12 : undefined} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2" style={{ background: "hsl(152 53% 8% / 0.6)", border: "1px solid hsl(152 40% 22%)", color: "hsl(0 0% 95%)" }} />
              {mode === "sign-up" && <p className="text-xs" style={{ color: "hsl(0 0% 95% / 0.4)" }}>At least 12 characters.</p>}
            </div>
          )}

          {mode === "sign-up" && (
            <div className="space-y-1.5">
              <label htmlFor="auth-confirm-password" className="block text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(0 0% 95% / 0.55)" }}>Confirm password</label>
              <input id="auth-confirm-password" type="password" required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2" style={{ background: "hsl(152 53% 8% / 0.6)", border: "1px solid hsl(152 40% 22%)", color: "hsl(0 0% 95%)" }} />
            </div>
          )}

          {mode === "sign-in" && (
            <div className="flex items-center justify-between -mt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <span className="relative flex items-center justify-center w-4 h-4 rounded shrink-0 transition-colors" style={{ background: rememberMe ? "hsl(145 65% 66%)" : "transparent", border: rememberMe ? "1px solid hsl(145 65% 66%)" : "1px solid hsl(152 40% 30%)" }}>
                  {rememberMe && <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="hsl(152 53% 11%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </span>
                <span className="text-xs" style={{ color: "hsl(0 0% 95% / 0.55)" }}>Remember me</span>
              </label>
              <button type="button" onClick={() => switchMode("forgot-password")} className="text-xs font-medium" style={{ color: "hsl(145 65% 66%)" }}>Forgot password?</button>
            </div>
          )}

          {error && <div role="alert" className="rounded-lg px-3 py-2.5 text-xs leading-relaxed" style={{ background: "hsl(0 84% 60% / 0.1)", border: "1px solid hsl(0 84% 60% / 0.3)", color: "hsl(0 84% 75%)" }}>{error}</div>}
          {success && <div role="status" className="rounded-lg px-3 py-2.5 text-xs leading-relaxed" style={{ background: "hsl(145 65% 66% / 0.1)", border: "1px solid hsl(145 65% 66% / 0.3)", color: "hsl(145 65% 75%)" }}>{success}</div>}

          <button type="submit" disabled={loading || oauthLoading} className="w-full font-semibold text-sm py-2.5 rounded-lg transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: "hsl(145 65% 66%)", color: "hsl(152 53% 11%)" }}>
            {loading ? `${submitLabels[mode][1]}` : submitLabels[mode][0]}
          </button>
        </form>

        <div className="px-6 pb-6 flex justify-center" style={{ borderTop: "1px solid hsl(152 40% 18% / 0.5)" }}>
          <p className="text-xs pt-4" style={{ color: "hsl(0 0% 95% / 0.35)" }}>
            {mode === "sign-in" ? (
              <>Don&apos;t have an account?{" "}<button type="button" onClick={() => switchMode("sign-up")} className="font-semibold hover:opacity-75" style={{ color: "hsl(145 65% 66%)" }}>Create one</button></>
            ) : mode === "sign-up" ? (
              <>Already have an account?{" "}<button type="button" onClick={() => switchMode("sign-in")} className="font-semibold hover:opacity-75" style={{ color: "hsl(145 65% 66%)" }}>Sign in</button></>
            ) : (
              <span style={{ color: "hsl(0 0% 95% / 0.25)" }}>Enter your email above to receive a reset link.</span>
            )}
          </p>
        </div>
      </div>

      <p className="relative mt-8 text-xs text-center" style={{ color: "hsl(0 0% 95% / 0.2)" }}>© 2026 RE:Fashioned · Sustainability Intelligence</p>
    </div>
  );
}
