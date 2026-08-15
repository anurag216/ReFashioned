# Privacy data lifecycle foundation

This inventory describes schema fields, not customer data. These primitives do **not** by themselves make Re:Fashioned GDPR compliant, and no statutory retention duration is asserted here. Product/legal owners must configure and approve cutoffs used by trusted cleanup jobs.

## Invariant

Erasure removes authentication identity, active authorization, and direct identifiers while preserving necessary business/compliance records and immutable security events. Historical actor links may become `NULL`. It must never affect another tenant. Person erasure is not company-record deletion.

## Identity-bearing inventory

| Category | Table / field | Purpose | Direct identifier? | Current FK behavior after this migration | Erasure / retention classification |
|---|---|---|---|---|---|
| Authentication | `auth.users.email`, identity/user metadata | Login and identity-provider account | Yes | `profiles.id` cascades when Admin API removes auth user | Remove through trusted server Admin API; authentication identity |
| Profile | `profiles.email`, `full_name` | Application identity and display | Yes | Profile owns authorization rows | Tombstone during preparation; remove with auth identity |
| Supplier contact | `supplier_contacts.name`, `email` | Named business contact reached through `supplier_access_memberships.supplier_contact_id` | Yes | No profile column; the processor locks and captures the access-to-contact mapping before removing access | Irreversible non-routable tombstone; supplier company retained |
| Internal authorization | `organization_members.profile_id` | Active tenant role | Indirect | `ON DELETE CASCADE` | Explicitly delete before identity deletion; authorization, not retained history |
| Supplier authorization | `supplier_access_memberships.profile_id`, `supplier_contact_id`, `revoked_by` | Active/revoked portal grants and authoritative contact mapping | Indirect | Required subject FK; actor FK sets null | Capture and lock mapping, remove access, then anonymise only the mapped contact |
| Internal invitations | `organization_member_invites.email`, `created_by`, `redeemed_by`, `revoked_by` | Email-bound, one-time team access | Email yes; actors indirect | Historical actors `ON DELETE SET NULL` | Revoke matching pending invites; terminal email is cutoff-cleanable |
| Supplier invitations | `supplier_invites.email`, `created_by`, `redeemed_by`, `revoked_by` | Email-bound supplier access | Email yes; actors indirect | Historical actors use `SET NULL` where present | Revoke matching pending invites; terminal email is cutoff-cleanable |
| Security history | `audit_logs.profile_id`; `audit_events.actor_id` | Immutable attributable security events | Indirect | `ON DELETE SET NULL` | Preserve event/action/time/tenant/entity; remove actor link |
| Evidence | `evidence_uploads.uploaded_by`, `reviewed_by` | Historical provenance and review | Indirect | `ON DELETE SET NULL` | Preserve evidence; null historical actor identity |
| Certification | `certifications.created_by`, `revoked_by` | Review/issuance provenance | Indirect | `ON DELETE SET NULL` | Preserve certification; null historical actor identity |
| Privacy workflow | `privacy_erasure_requests.requester_profile_id`, `subject_profile_id`, `organization_id`, denial reason | Controlled processing and evidence of request state | Indirect; denial reason may be personal | Profile/org links `ON DELETE SET NULL` | Restricted state record; retention policy to be approved |

The migration review found every declared FK to `public.profiles`/`auth.users`: profile-to-auth identity; organization and supplier authorization subjects; supplier contact identity; internal and supplier invitation actors; both audit actor fields; evidence upload/review actors; certification creation/revocation actors; and the privacy workflow links. Business entities (`products`, lifecycle stages, DPPs, evidence, certifications, suppliers, and reports) are intentionally not cascaded from a person.

## Trusted processing contract

1. The authenticated no-argument `request_personal_data_erasure()` derives its subject only from `auth.uid()` and creates or returns the open request.
2. A server worker holding service-role credentials calls the PostgREST-exposed, service-role-only `public.service_prepare_personal_identity_erasure(request subject)` wrapper. It verifies the JWT role and delegates to `private.prepare_personal_identity_erasure`; browser roles cannot execute either boundary.
3. After preparation succeeds, the worker deletes the Auth user with the Supabase Admin API. Credentials must remain server-side. Profile cascading then nulls historical actor links.
4. The worker calls the service-role-only `public.service_complete_personal_identity_erasure(request id)` wrapper. Completion fails unless profile deletion has nulled the request subject.
5. Failures remain `processing` for restricted operational reconciliation; they are never reported as completed early.

`private.purge_terminal_invitation_personal_data(cutoff)` accepts an externally approved cutoff and anonymises only redeemed, revoked, or expired invitations. It does not choose or schedule a legal duration and cannot clean usable invitations.

## Deferred work

An approved retention-policy catalogue, production job scheduling/retry operations, data exports, identity-provider-specific deletion verification, and an organization purge policy remain separate work. Organization deletion requests suspend access and public exposure; they do not hard-delete tenant records or audit history.
