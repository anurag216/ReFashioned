import { useEffect, useState } from "react";
import { Grid } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError("Authentication is not configured. Please contact support.");
      return;
    }

    let active = true;
    let completed = false;

    const finish = () => {
      if (!active || completed) return;
      completed = true;
      window.location.replace("/dashboard");
    };

    const params = new URLSearchParams(window.location.search);
    const providerError = params.get("error_description") ?? params.get("error");
    if (providerError) {
      setError(providerError);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish();
    });

    void supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError("We could not complete Google sign-in. Please try again.");
        return;
      }
      if (session) finish();
    });

    const timeout = window.setTimeout(() => {
      if (active && !completed) setError("Google sign-in could not be completed. Please return to sign in and try again.");
    }, 8000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(152 53% 8%)" }}>
      <div className="w-full max-w-sm rounded-2xl border p-6 text-center shadow-2xl" style={{ background: "hsl(152 40% 11%)", borderColor: "hsl(152 40% 18%)" }}>
        <div className="mx-auto mb-4 w-fit rounded-lg p-2" style={{ background: "hsl(145 65% 66%)" }}>
          <Grid className="w-5 h-5" style={{ color: "hsl(152 53% 11%)" }} />
        </div>
        <h1 className="text-lg font-semibold" style={{ color: "hsl(0 0% 95%)" }}>Completing sign in</h1>
        {!error ? (
          <p role="status" className="mt-2 text-sm" style={{ color: "hsl(0 0% 95% / 0.55)" }}>Securely finishing your Google sign-in…</p>
        ) : (
          <div className="mt-4 space-y-4">
            <p role="alert" className="text-sm" style={{ color: "hsl(0 84% 75%)" }}>{error}</p>
            <a href="/" className="block w-full rounded-lg py-2.5 text-sm font-semibold" style={{ background: "hsl(145 65% 66%)", color: "hsl(152 53% 11%)" }}>Return to sign in</a>
          </div>
        )}
      </div>
    </div>
  );
}
