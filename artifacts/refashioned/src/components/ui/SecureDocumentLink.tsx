import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

export function SecureDocumentLink({ path, label = "View Certificate" }: { path?: string | null; label?: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveSignedUrl() {
      if (!path || !supabase) {
        if (!cancelled) setSignedUrl(null);
        return;
      }

      const { data, error } = await supabase.storage
        .from("compliance_docs")
        .createSignedUrl(path, 3600);

      if (cancelled) return;

      if (error || !data?.signedUrl) {
        setSignedUrl(null);
        return;
      }

      setSignedUrl(data.signedUrl);
    }

    void resolveSignedUrl();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path || !signedUrl) return null;

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border bg-white text-foreground hover:bg-muted transition-colors"
    >
      <ExternalLink className="w-3 h-3" /> {label}
    </a>
  );
}
