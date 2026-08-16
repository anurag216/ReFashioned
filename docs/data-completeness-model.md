# Evidence-backed data completeness model

## Principles and scope

Readiness is calculated at request time by `get_organization_product_readiness()` from records belonging to the authenticated user's **active** organization. It is deterministic, is not AI-generated, never reads `suppliers.data_completeness`, and returns both atomic blockers and dimension results. The companion `get_organization_action_center()` formats those facts as `BLOCKED`, `NEEDS_ACTION`, or `READY` work. Neither routine returns evidence paths, private DPP payloads, or another tenant's data.

## Schema-backed dimensions

| Dimension | Existing records and exact checks | Applicability |
| --- | --- | --- |
| Core product | `products.name` is non-empty, `status` is not `archived`, and `sku` is populated. | Always. Two equal checks: identity/active and SKU. |
| Materials | At least one `product_materials` row; each percentage is positive and composition totals exactly 100. | Always in the current product model because it has no “materials not applicable” field. |
| Supply chain | At least one same-organization `lifecycle_stages` row linked to a supplier. | Always. |
| Evidence | Every same-organization lifecycle stage has an `evidence_uploads` row that is `approved`, `scan_status = clean`, and has a SHA-256 fingerprint. Quarantined, pending-review, rejected, unscanned, and legacy accepted evidence do not pass. | Only when lifecycle stages exist; an absent lifecycle is reported by supply chain instead. |
| Certifications | A material marked `certification_required` requires a same-organization `verified`, unexpired certification linked through trusted approved evidence to this product. Revoked and expired records fail. | Only when at least one material requires certification. |
| DPP | Mirrors enforced publication prerequisites: lifecycle exists and no stage is flagged or has negative impact values. Published snapshot hashes are compared to the current server-built projection to identify republish-needed state. | Always, but kept separate from internal completeness scoring. |

Overall percentage counts each applicable atomic requirement equally: completed checks divided by applicable checks, rounded down to a whole percent by integer division. It does not apply arbitrary weights or meaningless decimal precision. DPP status is deliberately not included in internal completeness. This makes internal record readiness distinct from publication readiness.

## Operational states

Evidence is reported as missing, quarantined, pending review, rejected, or trusted. Certification is not applicable, missing, valid, expiring soon, expired, or revoked. **Expiring soon is a product reminder threshold of 30 calendar days, not a legal retention rule.** DPP is draft, blocked, ready to publish, published, or republish recommended. Publication continues to use the existing immutable snapshot and filtered public projection; readiness never publishes or exposes private data.
