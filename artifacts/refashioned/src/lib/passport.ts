export interface PublicCertification { name: string; valid_until?: string | null }
export interface PublicLifecycleStage { order: number | null; name: string; summary?: string; co2_kg?: number | null; water_l?: number | null; certifications: PublicCertification[] }
export interface PublicPassportPayloadBase {
  brand: { name: string };
  product: { name: string; identifier?: string; season?: string };
  materials: Array<{ name: string; percentage: number | null }>;
  impact?: { total_co2_kg?: number; total_water_l?: number };
  lifecycle: PublicLifecycleStage[];
}
export interface PublicPassportPayloadV1 extends PublicPassportPayloadBase { schema_version: 1 }
export interface PublicPassportPayloadV2 extends PublicPassportPayloadBase { schema_version: 2; certifications: PublicCertification[] }
export type PublicPassportPayload = PublicPassportPayloadV1 | PublicPassportPayloadV2;
export interface PublicPassportResponse { schema_version: 1 | 2; published_at: string; payload_generated_at: string; payload: PublicPassportPayload }

export type PublicationState = "draft" | "published" | "updates-pending" | "unpublished";
export function publicationState(publication: { public_slug: string | null; is_published: boolean; published_at: string | null; has_unpublished_changes: boolean } | null): PublicationState {
  if (!publication?.published_at) return "draft";
  if (!publication.is_published) return "unpublished";
  return publication.has_unpublished_changes ? "updates-pending" : "published";
}
