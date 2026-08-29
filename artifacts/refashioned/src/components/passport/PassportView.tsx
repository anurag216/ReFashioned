import { Droplets, Leaf, ShieldCheck } from "lucide-react";
import type { PublicPassportPayload } from "../../lib/passport";

const date = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(new Date(value));

export function PassportView({ payload, publishedAt, generatedAt, label = "Published product passport" }: { payload: PublicPassportPayload; publishedAt?: string | null; generatedAt?: string | null; label?: string }) {
  const certifications = payload.schema_version === 2 ? payload.certifications : [];
  return <article className="overflow-hidden rounded-2xl border bg-[#F8FAFC] shadow-sm">
    <section className="bg-[#12382B] px-5 py-10 text-white sm:px-10">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#6AE096]">{label}</p>
      <p className="mt-5 text-lg text-white/75">{payload.brand.name}</p><h1 className="mt-1 text-3xl font-bold sm:text-5xl">{payload.product.name}</h1>
      {(payload.product.identifier || payload.product.season) && <p className="mt-3 text-white/70">{[payload.product.identifier, payload.product.season].filter(Boolean).join(" · ")}</p>}
      {(publishedAt || generatedAt) && <dl className="mt-7 grid gap-2 text-xs text-white/65 sm:grid-cols-2">{publishedAt && <div><dt>Published</dt><dd className="text-white/90">{date(publishedAt)}</dd></div>}{generatedAt && <div><dt>Snapshot generated</dt><dd className="text-white/90">{date(generatedAt)}</dd></div>}</dl>}
    </section>
    <div className="space-y-6 p-4 sm:p-8">
      {(payload.impact?.total_co2_kg != null || payload.impact?.total_water_l != null) && <section className="grid gap-3 sm:grid-cols-2">
        {payload.impact?.total_co2_kg != null && <div className="rounded-xl border bg-white p-5"><Leaf className="mb-3 h-5 w-5 text-emerald-700"/><p className="text-sm text-muted-foreground">Recorded lifecycle CO₂ total</p><p className="text-2xl font-semibold">{payload.impact.total_co2_kg.toLocaleString()} kg</p></div>}
        {payload.impact?.total_water_l != null && <div className="rounded-xl border bg-white p-5"><Droplets className="mb-3 h-5 w-5 text-blue-700"/><p className="text-sm text-muted-foreground">Recorded lifecycle water total</p><p className="text-2xl font-semibold">{payload.impact.total_water_l.toLocaleString()} L</p></div>}
      </section>}
      {payload.materials.length > 0 && <section className="rounded-xl border bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Materials</h2><ul className="mt-4 grid gap-2 sm:grid-cols-2">{payload.materials.map((m,i)=><li key={`${m.name}-${i}`} className="flex justify-between rounded-lg bg-slate-50 px-4 py-3"><span>{m.name}</span>{m.percentage != null && <strong>{m.percentage}%</strong>}</li>)}</ul></section>}
      <section className="rounded-xl border bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Lifecycle</h2>{payload.lifecycle.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Not publicly available</p> : <ol className="mt-5 space-y-0">{payload.lifecycle.map((stage,i)=><li key={`${stage.order}-${stage.name}-${i}`} className="relative border-l-2 border-emerald-700 pb-7 pl-6 last:pb-0"><span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-emerald-700"/><h3 className="font-medium">{stage.name}</h3>{stage.summary && <p className="mt-1 text-sm text-muted-foreground">{stage.summary}</p>}<div className="mt-2 flex flex-wrap gap-4 text-sm">{stage.co2_kg != null && <span>{stage.co2_kg.toLocaleString()} kg CO₂</span>}{stage.water_l != null && <span>{stage.water_l.toLocaleString()} L water</span>}</div></li>)}</ol>}</section>
      {certifications.length > 0 && <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 sm:p-6"><h2 className="text-lg font-semibold">Verified certifications</h2><ul className="mt-4 grid gap-3">{certifications.map((cert,i)=><li key={`${cert.name}-${i}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3"><ShieldCheck className="h-5 w-5 text-emerald-700"/><strong>{cert.name}</strong><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Verified</span>{cert.valid_until && <span className="text-xs text-muted-foreground">Valid until {new Date(`${cert.valid_until}T00:00:00`).toLocaleDateString()}</span>}</li>)}</ul></section>}
      <footer className="border-t pt-5 text-center text-xs leading-5 text-muted-foreground">Product data is supplied by the brand. Items marked Verified are backed by trusted evidence recorded in RE:Fashioned.<br/><strong>Powered by RE:Fashioned</strong></footer>
    </div>
  </article>;
}
