import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { ArrowLeft, Copy, EyeOff, Globe, RefreshCw, RotateCw, Share, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabaseClient";
import { usePermissions } from "../lib/auth/usePermissions";

type Product = { id: string; name: string; sku: string | null; season: string | null; updated_at?: string | null };
type Stage = { stage_name: string; subtitle: string | null; stage_order: number | null; co2_impact_kg: number | null; water_usage_l: number | null };
type Publication = { public_slug: string; is_published: boolean | null; published_at: string | null; payload_generated_at: string | null; updated_at: string };
type PublishResult = { public_slug: string; published_at: string; payload_generated_at: string; payload_hash: string };

export function DigitalProductPassport({ onBack }: { onBack: () => void }) {
  const productId = new URLSearchParams(useSearch()).get("productId");
  const { isAdmin } = usePermissions();
  const [product, setProduct] = useState<Product | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    if (!supabase || !productId) { setLoading(false); return; }
    const [productResult, stageResult, publicationResult] = await Promise.all([
      supabase.from("products").select("id,name,sku,season").eq("id", productId).maybeSingle(),
      supabase.from("lifecycle_stages").select("stage_name,subtitle,stage_order,co2_impact_kg,water_usage_l").eq("product_id", productId).order("stage_order"),
      supabase.from("digital_product_passports").select("public_slug,is_published,published_at,payload_generated_at,updated_at").eq("product_id", productId).maybeSingle(),
    ]);
    setProduct(productResult.data);
    setStages(stageResult.data ?? []);
    setPublication(publicationResult.data);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [productId]);

  async function publish() {
    if (!supabase || !productId) return;
    setWorking(true); setMessage(null);
    const { data, error } = await supabase.rpc("publish_product_passport", { p_product_id: productId });
    if (error) setMessage(error.message); else {
      const row = (data as PublishResult[] | null)?.[0];
      if (row) setPublication({ ...row, is_published: true, updated_at: row.payload_generated_at });
      setMessage("Passport snapshot published.");
    }
    setWorking(false);
  }
  async function unpublish() {
    if (!supabase || !productId) return;
    setWorking(true); const { error } = await supabase.rpc("unpublish_product_passport", { p_product_id: productId });
    if (error) setMessage(error.message); else { setPublication(p => p ? { ...p, is_published: false } : p); setMessage("Passport unpublished."); }
    setWorking(false);
  }
  async function rotate() {
    if (!supabase || !productId || !window.confirm("Rotate the public link? The old URL and QR code will stop working immediately.")) return;
    setWorking(true); const { data, error } = await supabase.rpc("rotate_product_passport_slug", { p_product_id: productId });
    if (error) setMessage(error.message); else { setPublication(p => p ? { ...p, public_slug: data } : p); setMessage("Public link rotated."); }
    setWorking(false);
  }
  const publicUrl = publication?.public_slug ? `${window.location.origin}/p/${publication.public_slug}` : null;
  const hasChanges = Boolean(publication?.payload_generated_at && publication.updated_at > publication.payload_generated_at);

  if (loading) return <main className="p-10">Loading passport preview…</main>;
  if (!product) return <main className="p-10">Product not found.</main>;
  return <div className="min-h-screen bg-[#F8FAFC]">
    <header className="bg-white border-b"><div className="max-w-5xl mx-auto p-4 flex justify-between items-center">
      <button onClick={onBack} className="flex gap-2 items-center"><ArrowLeft className="w-4 h-4"/>Dashboard</button>
      <div className="flex gap-2">
        {isAdmin && <>{publication?.is_published ? <button disabled={working} onClick={unpublish} className="border rounded px-3 py-2 flex gap-2"><EyeOff className="w-4 h-4"/>Unpublish</button> : <button disabled={working} onClick={publish} className="bg-primary text-white rounded px-3 py-2 flex gap-2"><Globe className="w-4 h-4"/>Publish Passport</button>}
        {publication && <button disabled={working} onClick={publish} className="border rounded px-3 py-2 flex gap-2"><RefreshCw className="w-4 h-4"/>Republish changes</button>}
        {publication && <button disabled={working} onClick={rotate} className="border rounded px-3 py-2 flex gap-2"><RotateCw className="w-4 h-4"/>Rotate public link</button>}</>}
        <button disabled={!publication?.is_published || !publicUrl} onClick={()=>setShowQR(true)} className="border rounded px-3 py-2 flex gap-2 disabled:opacity-50"><Share className="w-4 h-4"/>Share</button>
      </div>
    </div></header>
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      {message && <p className="bg-white border rounded p-3">{message}</p>}
      <section className="bg-[#12382B] text-white rounded-xl p-8"><p className="text-sm text-white/70">Internal passport preview</p><h1 className="text-3xl font-bold mt-2">{product.name}</h1>{product.sku && <p className="mt-2">SKU: {product.sku}</p>}</section>
      <section className="bg-white border rounded-xl p-6"><h2 className="font-semibold">Publication</h2><dl className="grid sm:grid-cols-2 gap-3 mt-4 text-sm"><div><dt>Status</dt><dd>{publication?.is_published ? "Published" : "Draft"}</dd></div><div><dt>Public slug</dt><dd className="font-mono break-all">{publication?.public_slug ?? "Not created"}</dd></div><div><dt>Published</dt><dd>{publication?.published_at ?? "Not published"}</dd></div><div><dt>Snapshot generated</dt><dd>{publication?.payload_generated_at ?? "Not generated"}</dd></div></dl>{hasChanges && <p className="mt-4 text-amber-700">Internal data has changed. Republish to update the public snapshot.</p>}</section>
      <section className="bg-white border rounded-xl p-6"><h2 className="font-semibold mb-4">Lifecycle data</h2>{stages.length === 0 ? <p className="text-muted-foreground">No lifecycle data has been recorded for this product.</p> : <ol className="space-y-4">{stages.map((s,i)=><li key={`${s.stage_order}-${s.stage_name}-${i}`} className="border-l-2 pl-4"><h3>{s.stage_name}</h3>{s.subtitle && <p className="text-sm text-muted-foreground">{s.subtitle}</p>}<p className="text-sm">CO₂: {s.co2_impact_kg ?? "Not recorded"} · Water: {s.water_usage_l ?? "Not recorded"}</p></li>)}</ol>}</section>
    </main>
    {showQR && publicUrl && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={()=>setShowQR(false)}><div className="bg-white rounded-xl p-6 space-y-4" onClick={e=>e.stopPropagation()}><button className="float-right" onClick={()=>setShowQR(false)}><X/></button><h2 className="font-semibold">Share public passport</h2><QRCodeSVG value={publicUrl} size={180}/><p className="font-mono text-xs max-w-xs break-all">{publicUrl}</p><button className="border rounded px-3 py-2 flex gap-2" onClick={()=>void navigator.clipboard.writeText(publicUrl)}><Copy className="w-4 h-4"/>Copy URL</button></div></div>}
  </div>;
}
