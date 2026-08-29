import { useEffect, useState } from "react";
import { Grid, PackageSearch } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { PassportView } from "../components/passport/PassportView";
import type { PublicPassportResponse } from "../lib/passport";

function Unavailable() {
  return <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-center"><section className="bg-white rounded-2xl border p-10 max-w-md">
    <PackageSearch className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
    <h1 className="text-xl font-semibold mb-2">Passport unavailable</h1>
    <p className="text-sm text-muted-foreground">This public passport is unavailable. Please contact the brand for a valid link.</p>
    <p className="mt-6 text-xs text-muted-foreground">Powered by RE:Fashioned</p>
  </section></main>;
}

export function PublicPassport({ publicSlug }: { publicSlug: string }) {
  const [passport, setPassport] = useState<PublicPassportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_public_product_passport", { p_public_slug: publicSlug });
      if (active) { setPassport(error ? null : data as PublicPassportResponse | null); setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [publicSlug]);
  if (loading) return <main className="min-h-screen bg-[#12382B] flex items-center justify-center text-white">Loading passport…</main>;
  if (!passport?.payload || passport.schema_version !== passport.payload.schema_version || ![1, 2].includes(passport.schema_version)) return <Unavailable />;
  return <div className="min-h-screen bg-[#F8FAFC]">
    <header className="bg-white border-b"><div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-2"><Grid className="w-4 h-4"/><span className="font-semibold">RE:Fashioned</span></div></header>
    <main className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-10"><PassportView payload={passport.payload} publishedAt={passport.published_at} generatedAt={passport.payload_generated_at}/></main>
  </div>;
}
