import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.1";

type SupportedMime = "application/pdf" | "image/png" | "image/jpeg";
type EvidenceRow = {
  id: string;
  lifecycle_stage_id: string;
  storage_bucket: string;
  storage_path: string;
  size_bytes: number;
  mime_type: SupportedMime;
  status: string;
  scan_status: string;
  integrity_legacy_accepted: boolean;
};
type VirusScanResponse = {
  CleanResult?: boolean;
  FoundViruses?: Array<{ FileName?: string; VirusName?: string }>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(message: string, status: number) {
  return new Response(message, { status, headers: corsHeaders });
}

function detectedMime(bytes: Uint8Array): SupportedMime | null {
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-") return "application/pdf";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response("Method not allowed", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const cloudmersiveKey = Deno.env.get("CLOUDMERSIVE_API_KEY") ?? "";
  const cloudmersiveBaseUrl = (Deno.env.get("CLOUDMERSIVE_VIRUS_API_BASE_URL") ?? "").replace(/\/+$/, "");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) return response("Scanner backend is not configured", 503);
  if (!cloudmersiveKey || !cloudmersiveBaseUrl) return response("Malware provider is not configured", 503);
  if (!/^https:\/\//i.test(cloudmersiveBaseUrl)) return response("Malware provider endpoint is invalid", 503);

  let body: { evidenceId?: string };
  try {
    body = await request.json();
  } catch {
    return response("Invalid request", 400);
  }
  if (!body.evidenceId || !/^[0-9a-f-]{36}$/i.test(body.evidenceId)) return response("Invalid evidence id", 400);

  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return response("Unauthorized", 401);
  const jwt = match[1];

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await service.auth.getUser(jwt);
  if (userError || !userData.user) return response("Unauthorized", 401);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error: evidenceError } = await service
    .from("evidence_uploads")
    .select("id,lifecycle_stage_id,storage_bucket,storage_path,size_bytes,mime_type,status,scan_status,integrity_legacy_accepted")
    .eq("id", body.evidenceId)
    .maybeSingle();
  if (evidenceError) return response("Evidence lookup failed", 500);
  if (!data) return response("Evidence not found", 404);
  const evidence = data as EvidenceRow;

  if (evidence.status !== "quarantined" || evidence.scan_status !== "pending" || evidence.integrity_legacy_accepted) {
    return response("Evidence is not scan eligible", 409);
  }

  // Re-use the authoritative live authorization predicate instead of trusting
  // the historical uploader identity. This permits current org admins/managers
  // to recover supplier or legacy pending evidence while preserving tenant and
  // supplier scope, and lets revoked users fail closed immediately.
  const { data: allowed, error: authorizationError } = await userClient.rpc("current_actor_can_upload_evidence", {
    p_lifecycle_stage_id: evidence.lifecycle_stage_id,
  });
  if (authorizationError || allowed !== true) return response("Not authorized", 403);

  const { data: object, error: downloadError } = await service.storage
    .from(evidence.storage_bucket)
    .download(evidence.storage_path);
  if (downloadError || !object) return response("Evidence object unavailable", 409);

  const bytes = new Uint8Array(await object.arrayBuffer());
  const mime = detectedMime(bytes);
  if (!mime || mime !== evidence.mime_type || bytes.byteLength !== evidence.size_bytes) {
    return response("Evidence object identity mismatch", 409);
  }
  const sha256 = hex(await crypto.subtle.digest("SHA-256", bytes));

  const form = new FormData();
  form.append("inputFile", new Blob([bytes], { type: mime }), "evidence");

  let providerResponse: Response;
  try {
    providerResponse = await fetch(`${cloudmersiveBaseUrl}/virus/scan/file`, {
      method: "POST",
      headers: { Apikey: cloudmersiveKey },
      body: form,
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return response("Malware provider unavailable; evidence remains quarantined", 502);
  }
  if (!providerResponse.ok) {
    return response("Malware provider rejected scan; evidence remains quarantined", 502);
  }

  let scan: VirusScanResponse;
  try {
    scan = await providerResponse.json();
  } catch {
    return response("Malware provider returned an invalid response; evidence remains quarantined", 502);
  }
  if (typeof scan.CleanResult !== "boolean") {
    return response("Malware provider returned an incomplete response; evidence remains quarantined", 502);
  }

  const verdict = scan.CleanResult ? "clean" : "infected";
  const foundCount = Array.isArray(scan.FoundViruses) ? scan.FoundViruses.length : 0;
  const normalizedResult = scan.CleanResult ? "clean" : foundCount > 0 ? `${foundCount} malware finding(s)` : "malware detected";
  const { error: recordError } = await service.rpc("record_evidence_scan_result", {
    p_evidence_id: evidence.id,
    p_storage_bucket: evidence.storage_bucket,
    p_storage_path: evidence.storage_path,
    p_size_bytes: evidence.size_bytes,
    p_declared_mime: evidence.mime_type,
    p_detected_mime: mime,
    p_content_sha256: sha256,
    p_verdict: verdict,
    p_scan_engine: "cloudmersive-virus-api",
    p_scan_result: normalizedResult,
  });
  if (recordError) return response("Scan result rejected", 409);

  return new Response(JSON.stringify({ status: verdict }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
