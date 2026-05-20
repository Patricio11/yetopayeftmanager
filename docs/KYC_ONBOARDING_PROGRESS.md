# KYC & Onboarding — Implementation Progress

Adapted from `ONBOARDING_KYC_BLUEPRINT.md` for YetoPay's merchant + partner roles with separate requirements per role.

---

## Phase 1: Schema & Database Foundation ✅
> New tables, columns, enums, and migration

- [x] Add `vettingStatus` column to users (default `APPROVED` for existing users)
- [x] Add KYC columns to users: `companyReg`, `companyAddress`, `companyCountry`, `vatNumber`, `vettingRejectionReason`, `vettingAdminNote`, `vettingReviewedAt`, `vettingReviewedBy`
- [x] Create `onboarding_requirements` table (with `appliesTo`: merchant/partner/both)
- [x] Create `company_documents` table (per-user uploads linked to requirements)
- [x] Export new tables from `lib/db/schema/index.ts`
- [x] Generate migration (`0005_burly_shen.sql`) and push to database

---

## Phase 2: Merchant/Partner Onboarding UI ✅
> What users see after signup — the KYC form and status screens

- [x] Create `/auth/onboarding/page.tsx` — server-rendered, status-driven (5 sub-views)
- [x] `EmailPendingScreen` — "verify your email" + resend button
- [x] `OnboardingForm` — company info + per-requirement document uploads
- [x] `PendingReviewScreen` — "application submitted, under review" with progress steps
- [x] `ApprovedScreen` — auto-redirect to dashboard (handled by server component)
- [x] `RejectedScreen` — shows rejection reason + contact support
- [x] Admin note banner on form when `vettingAdminNote` is set (request-changes flow)
- [x] `POST /api/auth/onboarding` — validate, persist, flip status to `PENDING_REVIEW`
- [x] `POST /api/auth/onboarding/upload` — file upload to `public/uploads/onboarding/{userId}/`
- [x] `POST /api/auth/resend-verification` — resend verification email
- [x] Pre-fill form on resubmission (request-changes flow)
- [x] Country dropdown with SADC + common countries
- [x] Per-requirement upload slots with template download support

---

## Phase 3: Admin Vetting Queue & Review ✅
> Admin UI for reviewing and acting on submissions

- [x] Create `/dashboard/admin/kyc/page.tsx` — tabbed vetting queue
- [x] Tabs: Pending Review | Email Pending | Onboarding | Approved | Rejected | All
- [x] Search by company name, contact name, email, registration number
- [x] Count badges per tab
- [x] `GET /api/admin/kyc` — list users with docs + requirement names joined
- [x] `UserReviewModal` — company info grid + document viewer + action buttons
- [x] Document links open in new tab
- [x] Add KYC nav link to admin sidebar

---

## Phase 4: Admin Actions ✅
> Approve, reject, request changes, resend verification, mark verified

- [x] `PATCH /api/admin/kyc/[id]/approve` — set APPROVED, send email
- [x] `PATCH /api/admin/kyc/[id]/reject` — set REJECTED with reason, send email
- [x] `PATCH /api/admin/kyc/[id]/request-changes` — revert to ONBOARDING_PENDING with admin note, send email
- [x] `PATCH /api/admin/kyc/[id]/resend-verification` — re-fire verification email
- [x] `PATCH /api/admin/kyc/[id]/mark-verified` — break-glass: set emailVerified + advance status
- [x] Wire actions into UserReviewModal with confirmation dialogs
- [x] KYC email templates (approval, rejection, request-changes, submission confirmation, admin notification)
- [x] Onboarding POST sends submission + admin notification emails

---

## Phase 5: Admin-Managed Requirements ✅
> CRUD for document requirements with templates and role-based filtering

- [x] Create `/dashboard/admin/kyc/requirements/page.tsx` — requirements management UI
- [x] `GET /api/admin/onboarding-requirements` — list (admin sees inactive too)
- [x] `POST /api/admin/onboarding-requirements` — create with `appliesTo` (merchant/partner/both)
- [x] `PATCH /api/admin/onboarding-requirements/[id]` — update fields
- [x] `DELETE /api/admin/onboarding-requirements/[id]` — hard-delete (refuses if referenced)
- [x] Template upload/delete per requirement (`POST/DELETE /api/admin/onboarding-requirements/[id]/template`)
- [x] Drag-to-reorder (sortOrder) via `POST /api/admin/onboarding-requirements/reorder`
- [x] Active/inactive toggle (soft-delete)
- [x] "Manage Requirements" link from KYC page header

---

## Phase 6: Email Templates ✅
> Transactional emails for each KYC event (implemented as part of Phase 4)

- [x] Submission confirmation email (to user) — `sendKycSubmissionEmail`
- [x] Admin notification email (to registered admin emails) — `sendAdminKycActionEmail`
- [x] Approval email (to user) — `sendKycApprovedEmail`
- [x] Rejection email with reason (to user) — `sendKycRejectedEmail`
- [x] Request-changes email with admin note (to user) — `sendKycRequestChangesEmail`

---

## Phase 7: Dashboard Gate & Polish ✅
> Lock dashboard for non-approved users, final polish

- [x] Dashboard layout gate: redirect non-APPROVED merchants/partners to `/auth/onboarding`
- [x] Add KYC nav item to admin sidebar
- [x] All screens reviewed and TypeScript-clean

---

## Notes

- **Existing `kycStatus`**: Synced alongside `vettingStatus` — approve sets both to approved, reject sets both to rejected.
- **File storage**: Documents upload to `public/uploads/onboarding/{userId}/`, templates to `public/uploads/templates/`.
- **Roles**: `onboarding_requirements.appliesTo` can be `merchant`, `partner`, or `both`.
- **Dashboard gate**: Existing users have `vettingStatus = APPROVED` by default, so they're not affected.
