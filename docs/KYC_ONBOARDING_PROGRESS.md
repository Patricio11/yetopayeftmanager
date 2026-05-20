# KYC & Onboarding — Implementation Progress

Adapted from `ONBOARDING_KYC_BLUEPRINT.md` for YetoPay's merchant + partner roles with separate requirements per role.

---

## Phase 1: Schema & Database Foundation
> New tables, columns, enums, and migration

- [ ] Add `vettingStatus` column to users (TEXT enum: `EMAIL_PENDING`, `ONBOARDING_PENDING`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`)
- [ ] Add KYC columns to users: `companyReg`, `companyAddress`, `companyCountry`, `vatNumber`, `vettingRejectionReason`, `vettingAdminNote`, `vettingReviewedAt`, `vettingReviewedBy`
- [ ] Create `onboarding_requirements` table (admin-managed, with `appliesTo` field for merchant/partner/both)
- [ ] Create `company_documents` table (per-user uploads linked to requirements)
- [ ] Export new tables from `lib/db/schema/index.ts`
- [ ] Generate and run Drizzle migration

---

## Phase 2: Merchant/Partner Onboarding UI
> What users see after signup — the KYC form and status screens

- [ ] Create `/auth/onboarding/page.tsx` — server-rendered, status-driven (5 sub-views)
- [ ] `EmailPendingScreen` — "verify your email" + resend button
- [ ] `OnboardingForm` — company info + per-requirement document uploads
- [ ] `PendingReviewScreen` — "application submitted, under review"
- [ ] `ApprovedScreen` — success + redirect to dashboard
- [ ] `RejectedScreen` — shows rejection reason + contact support
- [ ] Admin note banner on form when `vettingAdminNote` is set (request-changes flow)
- [ ] `POST /api/auth/onboarding` — validate, persist, flip status to `PENDING_REVIEW`
- [ ] Document upload to Supabase Storage (`onboarding/{userId}/`)
- [ ] Pre-fill form on resubmission (request-changes flow)

---

## Phase 3: Admin Vetting Queue & Review
> Admin UI for reviewing and acting on submissions

- [ ] Create `/dashboard/admin/kyc/page.tsx` — tabbed vetting queue
- [ ] Tabs: Pending Review | Email Pending | Onboarding | Approved | Rejected | All
- [ ] Search by company name, contact name, email, registration number
- [ ] Count badges per tab
- [ ] `GET /api/admin/kyc` — list users with docs + requirement names joined
- [ ] `UserReviewModal` — company info grid + document viewer + action buttons
- [ ] Document links open in new tab (signed URLs if private bucket)

---

## Phase 4: Admin Actions
> Approve, reject, request changes, resend verification, mark verified

- [ ] `PATCH /api/admin/kyc/[id]/approve` — set APPROVED, auto-assign account number, send email
- [ ] `PATCH /api/admin/kyc/[id]/reject` — set REJECTED with reason, send email
- [ ] `PATCH /api/admin/kyc/[id]/request-changes` — revert to ONBOARDING_PENDING with admin note, send email
- [ ] `PATCH /api/admin/kyc/[id]/resend-verification` — re-fire verification email
- [ ] `PATCH /api/admin/kyc/[id]/mark-verified` — break-glass: set emailVerified + advance status
- [ ] Wire actions into UserReviewModal with confirmation dialogs

---

## Phase 5: Admin-Managed Requirements
> CRUD for document requirements with templates and role-based filtering

- [ ] Create `/dashboard/admin/kyc/requirements/page.tsx` — requirements management UI
- [ ] `GET /api/admin/onboarding-requirements` — list (admin sees inactive too)
- [ ] `POST /api/admin/onboarding-requirements` — create with `appliesTo` (merchant/partner/both)
- [ ] `PATCH /api/admin/onboarding-requirements/[id]` — update fields
- [ ] `DELETE /api/admin/onboarding-requirements/[id]` — hard-delete (refuses if referenced)
- [ ] Template upload/delete per requirement
- [ ] Drag-to-reorder (sortOrder)
- [ ] Active/inactive toggle (soft-delete)

---

## Phase 6: Email Templates
> Transactional emails for each KYC event

- [ ] Submission confirmation email (to user)
- [ ] Admin notification email (to ADMIN_ALERT_EMAIL)
- [ ] Approval email with account number (to user)
- [ ] Rejection email with reason (to user)
- [ ] Request-changes email with admin note (to user)

---

## Phase 7: Dashboard Gate & Polish
> Lock dashboard for non-approved users, final polish

- [ ] Dashboard layout gate: redirect non-APPROVED merchants/partners to `/auth/onboarding`
- [ ] Add KYC nav item to admin sidebar
- [ ] Copy/UX review across all screens
- [ ] Test full flow: signup → verify → onboard → admin review → approve/reject

---

## Notes

- **Existing `kycStatus`**: We'll use the existing `kycStatus` field (pending/approved/rejected) as the simple status and add `vettingStatus` for the detailed state machine. Or unify them — TBD during Phase 1.
- **Supabase Storage**: Documents upload to `onboarding/{userId}/` prefix, server-side via service role key.
- **Account number format**: `YP-{nanoid(8)}` assigned on first approval.
- **Roles**: `onboarding_requirements.appliesTo` can be `merchant`, `partner`, or `both`.
