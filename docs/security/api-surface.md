# Public API surface

This document is the authorization contract for objects in the `public` schema.
Generated client types describe signatures, not permission to call them.

## Anonymous API

Anonymous clients have no direct table access. They may call only:

- `get_public_product_passport(text)` — returns the curated published snapshot;
- `get_supplier_invite_metadata(text)` — returns the minimal metadata needed to accept an invitation.

## Authenticated RPC API

### Organization

- `create_organization_with_admin`
- Current-actor RLS helpers: `is_org_member`, `has_org_role`

### Supplier

- Invitations/access: `create_supplier_invite`, `get_supplier_invite_metadata`,
  `redeem_supplier_invite`, `revoke_supplier_invite`, `revoke_supplier_access`,
  `get_my_supplier_access`, `get_supplier_access_admin`
- Contacts: `create_supplier_contact`, `update_supplier_contact`,
  `delete_supplier_contact`
- Current-actor helper: `current_actor_is_active_supplier_for`

### DPP

- `publish_product_passport`, `unpublish_product_passport`,
  `rotate_product_passport_slug`, `get_product_passport_publication_state`,
  `get_public_product_passport`

### Evidence/certification

- Lifecycle: `create_evidence_upload_intent`, `finalize_evidence_upload`,
  `cancel_evidence_upload_intent`, `get_evidence_download_target`,
  `review_evidence_upload`, `get_my_supplier_evidence_tasks`,
  `get_my_organization_evidence`
- Certification: `create_certification_from_evidence`, `revoke_certification`
- Storage policy helpers: `current_actor_can_upload_evidence`,
  `current_actor_can_read_evidence_object`

## Direct authenticated tables

These tables intentionally use tenant- or actor-scoped RLS access:

- `organizations` and `organization_members`;
- `profiles` (self-scoped onboarding access; no client delete);
- `products`, `product_materials`, `suppliers`, and `lifecycle_stages`;
- `data_requests` and `compliance_reports`;
- `audit_logs` (admin/manager read-only).

## Server-only tables

Application roles have no direct access to `brands`, `users`, `audit_events`,
`supplier_invites`, `supplier_contacts`, `supplier_access_memberships`,
`evidence_uploads`, `certifications`, or `digital_product_passports`.
Sensitive mutations and projections use the RPCs above. The `compliance_docs`
bucket remains private; its object policies use current-actor access helpers, so
supplier revocation takes effect on the next authorization check.

## Private helpers

Trigger functions and internal `SECURITY DEFINER` routines—including audit,
validation, locking, payload-building, and arbitrary-actor provenance helpers—
are not directly executable by `PUBLIC`, `anon`, or `authenticated`.
`rls_auto_enable` is infrastructure for the `ensure_rls` event trigger, not an RPC.

## Default security rule

New public tables and routines are private by default and require explicit grants
before becoming API-accessible. Every new public table must have RLS; the enabled
`ensure_rls` event trigger enables it automatically and aborts DDL if that cannot
be done. RLS and explicit privileges are independent, required boundaries.
