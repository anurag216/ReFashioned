import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { ArrowLeft, Copy, ExternalLink, EyeOff, Globe, QrCode, RefreshCw, RotateCw, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PassportView } from "../components/passport/PassportView";
import { supabase } from "../lib/supabaseClient";
import { usePermissions } from "../lib/auth/usePermissions";
import { publicationState, type PublicPassportPayload, type PublicPassportResponse } from "../lib/passport";

type Publication = { public_slug: string | null; is_published: boolean; published_at: string | null; payload_generated_at: string | null; stored_payload_hash: string | null; current_payload_hash: string; has_unpublished_changes: boolean };
type PublishResult = { public_slug: string; published_at: string; payload_generated_at: string; payload_hash: string };
const stateLabels = { draft: "Draft", published: "Published", "updates-pending": "Updates pending publication", unpublished: "Not publicly accessible" } as const;

export function DigitalProductPassport({ onBack }: { onBack: () => void }) {
  const productId = new URLSearchParams(useSearch()).get("productId");
  const { isAdmin } = usePermissions();
  const [draft, setDraft] = useState<PublicPassportPayload | null>(null);
  const [published, setPublished] = useState<PublicPassportResponse | null>(null);
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true), [working, setWorking] = useState(false), [showQR, setShowQR] = useState(false);
  const [view, setView] = useState<"draft" | "published">("draft"), [message, setMessage] = useState<string | null>(null);

  async function load() {
    if (!supabase || !productId) { setLoading(false); return; }
    const [previewResult, publicationResult] = await Promise.all([
      supabase.rpc("get_product_passport_preview", { p_product_id: productId }),
      supabase.rpc("get_product_passport_publication_state", { p_product_id: productId }),
    ]);
    const nextPublication = publicationResult.data?.[0] as Publication | undefined;
    setDraft(previewResult.error ? null : previewResult.data as unknown as PublicPassportPayload);
    setPublication(nextPublication ?? null);
    if (nextPublication?.is_published && nextPublication.public_slug) {
      const result = await supabase.rpc("get_public_product_passport", { p_public_slug: nextPublication.public_slug });
      setPublished(result.error ? null : result.data as PublicPassportResponse | null);
    } else setPublished(null);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [productId]);
  async function act(name: "publish_product_passport" | "unpublish_product_passport" | "rotate_product_passport_slug") {
    if (!supabase || !productId) return; setWorking(true); setMessage(null);
    const { data, error } = await supabase.rpc(name, { p_product_id: productId });
    if (error) setMessage(error.message); else { void (data as unknown as PublishResult[] | null); setMessage(name === "unpublish_product_passport" ? "Passport unpublished." : name === "rotate_product_passport_slug" ? "Public link rotated." : "Passport snapshot published."); await load(); }
    setWorking(false);
  }
  const status = publicationState(publication), publicUrl = publication?.is_published && publication.public_slug ? `${window.location.origin}/p/${publication.public_slug}` : null;
  async function rotate() { if (window.confirm("Rotate the public link? The old URL and old QR code will stop working immediately.")) await act("rotate_product_passport_slug"); }
  if (loading) return <main className="p-10">Loading passport preview…</main>;
  if (!draft) return <main className="p-10">Product not found or passport preview unavailable.</main>;
  return <div className="min-h-screen bg-[#F8FAFC]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 p-4"><button onClick={onBack} className="flex items-center gap-2"><ArrowLeft className="h-4 w-4"/>Dashboard</button><div className="flex flex-wrap gap-2">
      {publicUrl && <><a href={publicUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded border px-3 py-2"><ExternalLink className="h-4 w-4"/>View live passport</a><button onClick={()=>void navigator.clipboard.writeText(publicUrl)} className="flex items-center gap-2 rounded border px-3 py-2"><Copy className="h-4 w-4"/>Copy public link</button><button onClick={()=>setShowQR(true)} className="flex items-center gap-2 rounded border px-3 py-2"><QrCode className="h-4 w-4"/>Show QR code</button></>}
      {isAdmin && <>{status === "draft" && <button disabled={working} onClick={()=>void act("publish_product_passport")} className="flex items-center gap-2 rounded bg-primary px-3 py-2 text-white"><Globe className="h-4 w-4"/>Publish Passport</button>}{status === "updates-pending" && <button disabled={working} onClick={()=>void act("publish_product_passport")} className="flex items-center gap-2 rounded bg-amber-600 px-3 py-2 text-white"><RefreshCw className="h-4 w-4"/>Publish updates</button>}{status === "unpublished" && <button disabled={working} onClick={()=>void act("publish_product_passport")} className="flex items-center gap-2 rounded bg-primary px-3 py-2 text-white"><Globe className="h-4 w-4"/>Publish Passport</button>}{publication?.is_published && <button disabled={working} onClick={()=>void act("unpublish_product_passport")} className="flex items-center gap-2 rounded border px-3 py-2"><EyeOff className="h-4 w-4"/>Unpublish</button>}{publication?.published_at && <button disabled={working} onClick={()=>void rotate()} className="flex items-center gap-2 rounded border px-3 py-2"><RotateCw className="h-4 w-4"/>Rotate public link</button>}</>}
    </div></div></header>
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      {message && <p className="rounded border bg-white p-3">{message}</p>}
      <section className={`rounded-xl border p-5 ${status === "updates-pending" ? "border-amber-300 bg-amber-50" : status === "published" ? "border-emerald-200 bg-emerald-50" : "bg-white"}`}><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Publication status</p><h1 className="mt-1 text-2xl font-bold">{stateLabels[status]}</h1><p className="mt-2 text-sm">{status === "draft" ? "This current draft has never been published and is not public." : status === "published" ? "The current draft matches the snapshot served by the public link." : status === "updates-pending" ? "Internal data has changed. The public link still serves the published snapshot until an admin publishes updates." : "This passport was previously published but is not publicly accessible."}</p>{publication?.published_at && <p className="mt-2 text-xs text-muted-foreground">Last published {new Date(publication.published_at).toLocaleString()}</p>}</section>
      {(status === "updates-pending" || status === "published") && <nav className="flex rounded-lg border bg-white p-1" aria-label="Passport versions"><button className={`flex-1 rounded px-4 py-2 ${view === "draft" ? "bg-primary text-white" : ""}`} onClick={()=>setView("draft")}>Current draft</button><button className={`flex-1 rounded px-4 py-2 ${view === "published" ? "bg-primary text-white" : ""}`} onClick={()=>setView("published")}>Published snapshot</button></nav>}
      {view === "published" && published ? <PassportView payload={published.payload} publishedAt={published.published_at} generatedAt={published.payload_generated_at} label="Published snapshot · currently public"/> : <PassportView payload={draft} label="Current draft · not public until published"/>}
    </main>
    {showQR && publicUrl && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setShowQR(false)}><div className="space-y-4 rounded-xl bg-white p-6" onClick={e=>e.stopPropagation()}><button aria-label="Close QR code" className="float-right" onClick={()=>setShowQR(false)}><X/></button><h2 className="font-semibold">Public passport QR code</h2><QRCodeSVG value={publicUrl} size={200}/><p className="max-w-xs break-all font-mono text-xs">{publicUrl}</p><button className="flex gap-2 rounded border px-3 py-2" onClick={()=>void navigator.clipboard.writeText(publicUrl)}><Copy className="h-4 w-4"/>Copy public link</button></div></div>}
  </div>;
}
