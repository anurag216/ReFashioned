import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RequestBody = {
  evidenceId: string;
  bucket: string;
  path: string;
  sizeBytes: number;
  declaredMime: "application/pdf" | "image/png" | "image/jpeg";
  verdict: "clean" | "infected" | "error";
  engine: string;
  result: string;
};

function detectedMime(bytes: Uint8Array): RequestBody["declaredMime"] | null {
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-") return "application/pdf";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  const scannerToken = Deno.env.get("EVIDENCE_SCANNER_TOKEN");
  if (!scannerToken || request.headers.get("authorization") !== `Bearer ${scannerToken}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid request", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: object, error: downloadError } = await supabase.storage.from(body.bucket).download(body.path);
  if (downloadError || !object) return new Response("Object unavailable", { status: 409 });

  const bytes = new Uint8Array(await object.arrayBuffer());
  const mime = detectedMime(bytes);
  if (!mime || mime !== body.declaredMime || bytes.byteLength !== body.sizeBytes) {
    return new Response("Object identity mismatch", { status: 409 });
  }
  const sha256 = hex(await crypto.subtle.digest("SHA-256", bytes));
  const { error } = await supabase.rpc("record_evidence_scan_result", {
    p_evidence_id: body.evidenceId,
    p_storage_bucket: body.bucket,
    p_storage_path: body.path,
    p_size_bytes: body.sizeBytes,
    p_declared_mime: body.declaredMime,
    p_detected_mime: mime,
    p_content_sha256: sha256,
    p_verdict: body.verdict,
    p_scan_engine: body.engine,
    p_scan_result: body.result,
  });
  return error ? new Response("Scan result rejected", { status: 409 }) : new Response(null, { status: 204 });
});
