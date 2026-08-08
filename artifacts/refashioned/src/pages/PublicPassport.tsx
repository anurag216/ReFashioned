import { useEffect, useState } from "react";
import { Grid, PackageSearch, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface PublicCertification { name: string; valid_until?: string | null }
interface PublicLifecycleStage { order: number | null; name: string; summary?: string; co2_kg?: number | null; water_l?: number | null; certifications: PublicCertification[] }
interface PublicPassportPayload {
  schema_version: 1;
  brand: { name: string };
  product: { name: string; identifier?: string; season?: string };
  materials: Array<{ name: string; percentage: number | null }>;
  impact: { total_co2_kg: number; total_water_l: number };
  lifecycle: PublicLifecycleStage[];
}
interface PublicPassportResponse { schema_version: 1; published_at: string; payload_generated_at: string; payload: PublicPassportPayload }

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
  if (!passport?.payload || passport.schema_version !== 1 || passport.payload.schema_version !== 1) return <Unavailable />;
  const { payload } = passport;
  const certifications = payload.lifecycle.flatMap(stage => stage.certifications.map(cert => ({ ...cert, stage: stage.name })));
  return <div className="min-h-screen bg-[#F8FAFC]">
    <header className="bg-white border-b"><div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-2"><Grid className="w-4 h-4"/><span className="font-semibold">RE:Fashioned</span></div></header>
    <section className="bg-[#12382B] text-white"><div className="max-w-5xl mx-auto px-6 py-12">
      <p className="text-sm text-[#6AE096] mb-2">{payload.brand.name}</p><h1 className="text-4xl font-bold">{payload.product.name}</h1>
      {(payload.product.identifier || payload.product.season) && <p className="text-white/70 mt-3">{[payload.product.identifier, payload.product.season].filter(Boolean).join(" · ")}</p>}
    </div></section>
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {(payload.impact.total_co2_kg != null || payload.impact.total_water_l != null) && <section className="grid sm:grid-cols-2 gap-4">
        {payload.impact.total_co2_kg != null && <article className="bg-white border rounded-xl p-5"><p className="text-sm text-muted-foreground">Total CO₂ impact</p><p className="text-2xl font-semibold">{payload.impact.total_co2_kg} kg</p></article>}
        {payload.impact.total_water_l != null && <article className="bg-white border rounded-xl p-5"><p className="text-sm text-muted-foreground">Total water use</p><p className="text-2xl font-semibold">{payload.impact.total_water_l.toLocaleString()} L</p></article>}
      </section>}
      {payload.materials.length > 0 && <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-semibold mb-4">Materials</h2><ul className="space-y-2">{payload.materials.map((m,i)=><li key={`${m.name}-${i}`} className="flex justify-between"><span>{m.name}</span>{m.percentage != null && <span>{m.percentage}%</span>}</li>)}</ul></section>}
      <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-semibold mb-4">Lifecycle</h2>{payload.lifecycle.length === 0 ? <p className="text-sm text-muted-foreground">Not publicly available</p> : <ol className="space-y-5">{payload.lifecycle.map((stage,i)=><li key={`${stage.order}-${stage.name}-${i}`} className="border-l-2 border-primary pl-4"><h3 className="font-medium">{stage.name}</h3>{stage.summary && <p className="text-sm text-muted-foreground mt-1">{stage.summary}</p>}<div className="text-sm mt-2 flex gap-4">{stage.co2_kg != null && <span>{stage.co2_kg} kg CO₂</span>}{stage.water_l != null && <span>{stage.water_l.toLocaleString()} L water</span>}</div></li>)}</ol>}</section>
      {certifications.length > 0 && <section className="bg-white border rounded-xl p-6"><h2 className="text-lg font-semibold mb-4">Certifications</h2><ul className="space-y-3">{certifications.map((cert,i)=><li key={`${cert.name}-${i}`} className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-600"/><span>{cert.name}</span><span className="text-xs text-green-700">Verified</span></li>)}</ul></section>}
      <footer className="text-center text-xs text-muted-foreground">Powered by RE:Fashioned</footer>
    </main>
  </div>;
}
