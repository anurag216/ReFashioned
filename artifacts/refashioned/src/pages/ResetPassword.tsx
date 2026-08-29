import { useEffect, useState } from "react";
import { Grid } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setError("Authentication is not configured. Please contact support.");
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setReady(true);
    });

    void supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError("This password reset link could not be validated.");
      else if (session) setReady(true);
      else setError("This password reset link is invalid or has expired. Request a new link from the sign-in page.");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Authentication is not configured. Please contact support.");
      return;
    }
    if (password.length < 12) {
      setError("Use a password with at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    setCompleted(true);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(152 53% 8%)" }}>
      <div className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl" style={{ background: "hsl(152 40% 11%)", borderColor: "hsl(152 40% 18%)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{ background: "hsl(145 65% 66%)" }}>
            <Grid className="w-5 h-5" style={{ color: "hsl(152 53% 11%)" }} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: "hsl(0 0% 95% / 0.45)" }}>RE:Fashioned</p>
            <h1 className="text-lg font-semibold" style={{ color: "hsl(0 0% 95%)" }}>Choose a new password</h1>
          </div>
        </div>

        {completed ? (
          <div className="space-y-4">
            <p role="status" className="text-sm" style={{ color: "hsl(145 65% 75%)" }}>Your password has been updated. Sign in again with the new password.</p>
            <a href="/" className="block w-full rounded-lg py-2.5 text-center text-sm font-semibold" style={{ background: "hsl(145 65% 66%)", color: "hsl(152 53% 11%)" }}>Return to sign in</a>
          </div>
        ) : (
          <form onSubmit={updatePassword} className="space-y-4">
            {!ready && !error && <p className="text-sm" style={{ color: "hsl(0 0% 95% / 0.55)" }}>Validating your reset link…</p>}
            {ready && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="block text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(0 0% 95% / 0.55)" }}>New password</label>
                  <input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" />
                  <p className="text-xs" style={{ color: "hsl(0 0% 95% / 0.45)" }}>At least 12 characters.</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="confirm-new-password" className="block text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(0 0% 95% / 0.55)" }}>Confirm new password</label>
                  <input id="confirm-new-password" type="password" autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" />
                </div>
                <button type="submit" disabled={submitting} className="w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60" style={{ background: "hsl(145 65% 66%)", color: "hsl(152 53% 11%)" }}>{submitting ? "Updating password…" : "Update password"}</button>
              </>
            )}
            {error && <div role="alert" className="rounded-lg border px-3 py-2.5 text-xs" style={{ color: "hsl(0 84% 75%)", borderColor: "hsl(0 84% 60% / 0.3)" }}>{error}</div>}
            {error && <a href="/" className="block text-center text-xs font-medium" style={{ color: "hsl(145 65% 66%)" }}>Back to sign in</a>}
          </form>
        )}
      </div>
    </div>
  );
}
