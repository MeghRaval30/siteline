# AssetFlow — Module A PRD
### Identity, Organization Setup & Dashboard

**Stack:** Node.js/Express + Prisma + PostgreSQL (Docker) · **Window:** ~2 hours (of 8 total) · **Solo developer build**

**Screens owned:** 1 (Login/Signup), 2 (Dashboard/Home), 3 (Organization Setup)
**Also owns (shared infra):** `requireRole` middleware, JWT contract, User/Department/AssetCategory Prisma models
**Reads from:** Asset/Allocation/MaintenanceRequest/TransferRequest tables (for KPIs), Notification table (for notification bell)

This module is the **first domino**. Departments, categories, employees, and auth all need to exist before assets, allocations, bookings, or audits can be built. Ship the Prisma schema + seed data first, even if the UI isn't ready.

---

## 1. User Stories

- As a new user, I can sign up with name/email/password and land as a plain Employee — I cannot pick a role.
- As an Admin, I can create departments, assign a Department Head, and activate/deactivate.
- As an Admin, I can create asset categories with name and description.
- As an Admin, I can browse the Employee Directory and promote any Employee to Department Head or Asset Manager — this is the *only* place role changes happen.
- As any logged-in user, I see a Dashboard with KPI cards relevant to the whole org, with overdue items called out separately.
- As any user, I can use quick actions from the dashboard to jump straight into registering an asset, booking a resource, or raising a maintenance request.
- As any user, I can see AI-generated insights summarizing the current state of the organization's assets.

## 2. Screen 1 — Login / Signup

**Signup**
- Fields: Name, Email, Password, Confirm Password.
- Server always creates `role = Employee` regardless of any client payload — strip any `role` field server-side.
- Email uniqueness enforced at the DB level (`@unique` in Prisma schema).
- Password: hash with `bcryptjs`, min-length 8 + basic strength check client-side, real enforcement server-side via Zod.

**Login**
- Email + password → JWT with payload `{ user_id, role, department_id, exp }`.
- JWT signed with `jsonwebtoken`, secret from env var `JWT_SECRET`.
- Session validation: middleware that verifies JWT on every protected route and attaches `req.user`.

**API Contract**

```javascript
// auth.routes.js
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.getMe);

// Zod schemas
const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

// Endpoints
POST /api/v1/auth/signup
  body: { name, email, password }
  → 201 { success: true, data: { user: {...}, token } }
  errors: EMAIL_ALREADY_EXISTS (409)

POST /api/v1/auth/login
  body: { email, password }
  → 200 { success: true, data: { user: {...}, token } }
  errors: INVALID_CREDENTIALS (401), ACCOUNT_INACTIVE (403)

GET /api/v1/auth/me
  header: Authorization: Bearer <token>
  → 200 { success: true, data: { user: {...} } }
```

**Edge cases to handle**
- Deactivated (`status = Inactive`) employees cannot log in — return `ACCOUNT_INACTIVE`.
- Duplicate signup attempts with same email → clear `EMAIL_ALREADY_EXISTS` error, not a generic 500.
- Expired/tampered JWT → 401, frontend redirects to login.

## 3. Screen 2 — Dashboard / Home

**KPI cards (query across all modules):**

| KPI | Query logic |
|---|---|
| Assets Available | `count(Asset) where status = 'Available'` |
| Assets Allocated | `count(Asset) where status = 'Allocated'` |
| Maintenance Today | `count(MaintenanceRequest) where status in (Approved, TechnicianAssigned, InProgress)` |
| Active Bookings | `count(Booking) where status in (Upcoming, Ongoing)` |
| Pending Transfers | `count(TransferRequest) where status = 'Requested'` |
| Upcoming Returns | `count(Allocation) where status='Active' and expected_return_date between now and now+7d` |

**Overdue section (highlighted separately):**
- Overdue Returns: `Allocation` where `status='Active' and expected_return_date < today`.

**AI Insights Panel:**
- Calls `GET /api/v1/ai/insights` which feeds KPI data to Gemini and returns a natural language summary.
- Example: *"3 assets are overdue for return. The IT department has the highest allocation count. Maintenance requests increased 40% this week."*
- Degrades gracefully — shows "AI insights unavailable" if the API is down.

**Quick actions:** buttons that deep-link to Register Asset, Book Resource, Raise Maintenance Request.

**API Contract**
```javascript
// dashboard.routes.js
router.get('/kpis', authenticate, dashboardController.getKPIs);

GET /api/v1/dashboard/kpis
  → 200 { success: true, data: {
      assetsAvailable, assetsAllocated, maintenanceToday,
      activeBookings, pendingTransfers, upcomingReturns,
      overdueReturns: [ { asset_tag, holder_name, expected_return_date }, ... ]
  }}
```

## 4. Screen 3 — Organization Setup (Admin only, 3 tabs)

### Tab A: Department Management
- CRUD: name, head (`User` reference), `status`.
- Flat structure (no parent_dept_id hierarchy — cut for 8-hour scope).
- Deactivating a department: allow but show a confirmation warning.

```javascript
GET    /api/v1/departments
POST   /api/v1/departments        { name, head_user_id?, status }
PUT    /api/v1/departments/:id
DELETE /api/v1/departments/:id    (soft delete → status=Inactive)
```

### Tab B: Asset Category Management
- CRUD: name, description only (custom_fields cut for 8-hour scope).

```javascript
GET    /api/v1/categories
POST   /api/v1/categories   { name, description }
PUT    /api/v1/categories/:id
DELETE /api/v1/categories/:id   (block if assets reference it)
```

### Tab C: Employee Directory
- List/search employees: Name, Email, Department, Role, Status.
- **Promote action** — the only role-mutation endpoint:

```javascript
// employee.routes.js
router.patch('/:id/role', authenticate, requireRole(['Admin']), employeeController.updateRole);

PATCH /api/v1/employees/:id/role
  body: { role: "DepartmentHead" | "AssetManager" }
  guard: requireRole(['Admin'])
  → 200 { success: true, data: { user: {...} } }

PATCH /api/v1/employees/:id/status
  body: { status: "Active" | "Inactive" }
```
- Every promotion calls `logActivity()` so it appears in the Activity Log.

## 5. Data Owned

`User`, `Department`, `AssetCategory` — defined in the Prisma schema. These must be migrated and seeded first as all other modules depend on them via foreign keys.

## 6. Module Dependencies

**Build order:** This module is built first (Phase 2 of the 8-hour plan). No dependencies on other modules to start.

**What other modules need from this one:**
- `User`, `Department`, `AssetCategory` Prisma models — needed by Assets, Allocations, Bookings, Audits
- `requireRole(roles[])` middleware — needed by every protected route in the system
- JWT payload shape `{ user_id, role, department_id }` — read by all middleware
- Seeded Admin account + departments + categories — needed for manual testing

## 7. Validation & Edge Cases Checklist

- [ ] Signup cannot set any role other than Employee, even if the client sends one.
- [ ] Only Admin-guarded routes can hit the promote-role endpoint.
- [ ] Deactivated users can't log in, and their existing JWTs should fail on next validation.
- [ ] Category deletion doesn't orphan existing assets — block if referenced.
- [ ] Dashboard KPI queries handle the "no data yet" case gracefully (zeros, not errors).

## 8. Acceptance Criteria

- [ ] Signup → login → JWT round-trip works end to end.
- [ ] Admin can create a department with a head and it renders in the UI.
- [ ] Admin can create a category and it appears in the asset registration dropdown.
- [ ] Admin can promote an Employee to Asset Manager and that user immediately gets expanded access on next login.
- [ ] Dashboard shows all 6 KPI cards plus overdue-returns section, pulling real numbers.
- [ ] AI Insights panel shows a Gemini-generated summary of the org's asset status.
- [ ] Every promotion, department, and category change appears in the Activity Log.

## 9. Timeline (within 8-hour window)

| Hours | Task |
|---|---|
| 0–1 | Prisma schema (all models), Docker setup, seed script, Express scaffold |
| 1–1.5 | Auth (signup/login/JWT), `requireRole` middleware, Zod validation |
| 1.5–2 | Department CRUD, Category CRUD, Employee list + search + role promotion |
| 5.5–6.5 | Dashboard KPI queries + frontend (KPI cards, overdue table, AI insights panel) |
