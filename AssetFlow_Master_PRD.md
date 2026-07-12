# AssetFlow — Master PRD
### Enterprise Asset & Resource Management System (Hackathon Build)

**Version:** 1.0 · **Scope:** Full system architecture + team distribution across 3 engineers
**Companion documents:** `AssetFlow_PRD_Engineer_A_Identity_Org_Dashboard.md`, `AssetFlow_PRD_Engineer_B_Asset_Lifecycle_Allocation_Maintenance.md`, `AssetFlow_PRD_Engineer_C_Booking_Audit_Reports_Notifications.md`

---

## 0. Assumptions & Judgment Calls

The original problem statement is a functional spec, not a technical one. To make this buildable in a fixed hackathon window, the following calls were made — flag these to your team in the first 30 minutes and adjust freely:

| # | Assumption | Reasoning |
|---|---|---|
| 1 | ~36–48 hour build window, 3 engineers, no separate designer/PM | Standard hackathon format; timeline in §8 assumes this |
| 2 | Stack: React (frontend) + Node.js/Express (API) + PostgreSQL (DB) | Fastest to prototype RBAC + relational data with 3 people in parallel; swap for Django/Spring/Mongo if your team is stronger there — the schema and API contracts below stay valid |
| 3 | **Single shared database, modular monolith** — not microservices | Dashboard, Reports, and Notifications all read across every other module's tables. Microservices would need an API gateway and event bus you don't have time to build. One DB, cleanly separated modules/folders, is the correct hackathon architecture and still satisfies "clean architecture, reusable modules" |
| 4 | Bookable "resources" (rooms, vehicles, equipment) are **Assets** with `is_bookable = true`, not a separate entity | The spec itself says booking applies to assets marked "shared/bookable" at registration — no separate Resource table needed |
| 5 | `Reserved` asset status is a **derived/display state**, not a persisted one | See §4.3 — avoids two modules (Allocation and Booking) fighting over who owns `Asset.status` |
| 6 | Maintenance can be raised on an asset that is currently `Allocated`, not just `Available` | The spec says "the holder raises a maintenance request" — implies the asset stays checked out to them while maintenance happens; see the state machine in §4.3 for how this reverts correctly |
| 7 | On Audit Cycle close, `Damaged` items are surfaced to the Asset Manager to optionally raise a Maintenance Request directly from the discrepancy report, rather than an automatic status change (only `Missing → Lost` is automatic per spec) | Spec only specifies the Lost transition explicitly |

---

## 1. Vision & Problem Recap

Organizations track equipment, furniture, vehicles, and shared spaces using spreadsheets and paper logs. AssetFlow centralizes this into one ERP-style platform: structured asset lifecycles, conflict-free allocation, overlap-free resource booking, an approval-gated maintenance workflow, and scheduled audit cycles — all with real role-based access and full traceability of who holds what, where, and in what condition.

**Explicitly out of scope:** purchasing, invoicing, accounting. Acquisition cost is stored for reporting/ranking only — it never feeds a ledger.

## 2. Goals & What "Done" Looks Like

A judge or evaluator should be able to:
1. Sign up as an Employee, get promoted to Department Head / Asset Manager by an Admin, and see role-appropriate screens.
2. Register an asset, try to double-allocate it, and see the system block it and offer a transfer instead.
3. Book a room, then try to double-book an overlapping slot, and see it rejected — but a back-to-back slot accepted.
4. Raise a maintenance request, watch it move through approval → technician → resolved, and watch the asset status flip automatically.
5. Run an audit cycle, mark an item Missing, close the cycle, and see it become `Lost` with a discrepancy report generated.
6. See all of the above reflected live in KPI cards and a notification feed.

## 3. User Roles & Permissions

| Capability | Admin | Asset Manager | Department Head | Employee |
|---|:---:|:---:|:---:|:---:|
| Manage departments / categories / promote roles | ✅ | ❌ | ❌ | ❌ |
| Register assets | ✅ | ✅ | ❌ | ❌ |
| Allocate assets | ✅ | ✅ | ❌ | ❌ |
| Approve transfer requests | ✅ | ✅ | ✅ *(dept-scoped only)* | ❌ |
| Request a transfer / return | ✅ | ✅ | ✅ | ✅ |
| Book a shared resource | ✅ | ✅ | ✅ *(can book on behalf of dept)* | ✅ |
| Raise maintenance request | ✅ | ✅ | ✅ | ✅ |
| Approve/reject maintenance request | ✅ | ✅ | ❌ | ❌ |
| Create / close audit cycle | ✅ | ✅ | ❌ | ❌ |
| Act as auditor | if assigned | if assigned | if assigned | if assigned |
| View org-wide analytics | ✅ (all) | ✅ (asset-focused) | dept-scoped | own-scoped |

Critically: **there is no self-service role escalation.** Signup always produces an `Employee`. Only an Admin, from the Employee Directory (Screen 3C), can promote someone to Department Head or Asset Manager. Build the auth middleware to reject any client-supplied `role` field on signup — always force `Employee` server-side.

## 4. Core Data Model

This is the single source of truth all three engineers build against. **Finalize and migrate this schema together in the first 1–2 hours before splitting into parallel work** — see §8.

### 4.1 Entity List

| Entity | Owner | Purpose |
|---|---|---|
| `User` (Employee) | Engineer A | Login identity + role + department |
| `Department` | Engineer A | Org hierarchy |
| `AssetCategory` | Engineer A | Category master data + custom fields |
| `Asset` | Engineer B | The physical thing being tracked |
| `Allocation` | Engineer B | Who currently holds an asset |
| `TransferRequest` | Engineer B | Requested → Approved → Re-allocated workflow |
| `MaintenanceRequest` | Engineer B | Repair approval workflow |
| `Booking` | Engineer C | Time-slot reservation of a bookable asset |
| `AuditCycle` / `AuditItem` | Engineer C | Scheduled verification cycles |
| `Notification` | Engineer C | In-app alerts |
| `ActivityLog` | Engineer C | Cross-system audit trail |

### 4.2 Full Field-Level Schema

```
User
 id              PK
 name            text, required
 email           text, unique, required
 password_hash   text, required
 department_id   FK -> Department, nullable
 role            enum [Employee, DepartmentHead, AssetManager, Admin], default Employee
 status          enum [Active, Inactive], default Active
 created_at, updated_at

Department
 id              PK
 name            text, required, unique
 head_user_id    FK -> User, nullable
 parent_dept_id  FK -> Department, nullable (self-referential hierarchy)
 status          enum [Active, Inactive]
 created_at

AssetCategory
 id              PK
 name            text, required, unique
 description     text
 custom_fields   JSON  (e.g. { "warranty_months": "number" } — schema, not values)
 created_at

Asset
 id                       PK
 asset_tag                text, unique, auto-generated (AF-0001, AF-0002...)
 name                     text, required
 category_id              FK -> AssetCategory, required
 serial_number             text
 acquisition_date          date
 acquisition_cost          decimal  (reporting-only, never touches accounting)
 condition                 enum [New, Good, Fair, Poor, Damaged]
 location                  text
 photo_url                 text, nullable
 documents                 JSON array of file URLs, nullable
 is_bookable                boolean, default false
 status                    enum [Available, Allocated, Under Maintenance, Lost, Retired, Disposed]
 pre_maintenance_status     enum, nullable  (snapshot used to revert correctly, see §4.3)
 qr_code                    text, auto-generated
 created_at, updated_at

Allocation
 id                    PK
 asset_id               FK -> Asset, required
 holder_user_id         FK -> User, nullable   (exactly one of holder_user_id / holder_department_id set)
 holder_department_id   FK -> Department, nullable
 allocated_by           FK -> User, required
 allocated_at            timestamp
 expected_return_date    date, nullable
 actual_return_date      date, nullable
 condition_at_checkout   text
 condition_at_checkin    text, nullable
 status                 enum [Active, Returned]
 created_at

TransferRequest
 id                PK
 asset_id           FK -> Asset, required
 from_allocation_id FK -> Allocation, required
 requested_to_user_id       FK -> User, nullable
 requested_to_department_id FK -> Department, nullable
 requested_by        FK -> User, required
 status              enum [Requested, Approved, Rejected, Completed]
 approved_by          FK -> User, nullable
 requested_at, resolved_at
 notes

MaintenanceRequest
 id                  PK
 asset_id             FK -> Asset, required
 raised_by            FK -> User, required
 issue_description     text, required
 priority              enum [Low, Medium, High, Critical]
 photo_url             text, nullable
 status                enum [Pending, Approved, Rejected, TechnicianAssigned, InProgress, Resolved]
 approved_by            FK -> User, nullable
 rejected_reason        text, nullable
 technician_name        text, nullable
 resolution_notes       text, nullable
 created_at, resolved_at

Booking
 id                PK
 asset_id           FK -> Asset (must have is_bookable = true), required
 booked_by          FK -> User, required
 on_behalf_of_department_id  FK -> Department, nullable  (Dept Head booking for dept)
 start_time, end_time  timestamp, required
 status              enum [Upcoming, Ongoing, Completed, Cancelled]
 purpose              text
 cancelled_by, cancelled_at   nullable
 created_at

AuditCycle
 id               PK
 name              text
 scope_department_id  FK -> Department, nullable
 scope_location        text, nullable
 start_date, end_date  date
 status                enum [Planned, InProgress, Closed]
 created_by             FK -> User
 closed_by, closed_at   nullable

AuditCycleAuditor  (junction)
 audit_cycle_id   FK -> AuditCycle
 auditor_user_id  FK -> User

AuditItem
 id              PK
 audit_cycle_id   FK -> AuditCycle
 asset_id          FK -> Asset
 result            enum [Pending, Verified, Missing, Damaged]
 notes
 verified_by        FK -> User, nullable
 verified_at

Notification
 id            PK
 user_id        FK -> User, required (recipient)
 type           enum (see Engineer C PRD §3 for full list)
 message         text
 related_entity_type, related_entity_id
 is_read         boolean, default false
 created_at

ActivityLog
 id            PK
 actor_user_id  FK -> User
 action         text  (e.g. "asset.allocated", "maintenance.approved")
 entity_type, entity_id
 metadata        JSON
 created_at
```

### 4.3 Asset Lifecycle State Machine (owned by Engineer B, read by everyone)

```
                 ┌────────────┐
   register ───► │  Available │◄────────────────┐
                 └─────┬──────┘                  │
                       │ allocate                 │ return / transfer resolves
                       ▼                          │
                 ┌────────────┐                   │
                 │  Allocated │───────────────────┘
                 └─────┬──────┘
                       │ maintenance request approved
                       ▼
                 ┌───────────────────┐   resolved, reverts to
                 │ Under Maintenance │   whichever of the above
                 └─────────┬─────────┘   it came from
                           │
              audit: confirmed missing
                           ▼
                      ┌────────┐        admin action        ┌──────────┐
                      │  Lost  ├──────────────────────────► │ Disposed │
                      └────────┘                             └──────────┘
                                    ▲
        (from any active state)    │ admin: retire
                              ┌─────┴────┐
                              │ Retired  ├──► Disposed (admin action)
                              └──────────┘
```

Rules:
- `Available ↔ Under Maintenance` and `Allocated → Under Maintenance` are both valid — store `pre_maintenance_status` (and keep the `Allocation` row untouched if it came from `Allocated`) so resolution correctly reverts to `Allocated` (same holder) rather than dumping it back to `Available` under someone else.
- Transfers never pass through `Available` — the asset stays `Allocated` throughout; only the `Allocation` row's holder changes when the transfer is approved.
- `Reserved` is **not** a persisted status. A bookable `Available` asset with an `Upcoming`/`Ongoing` `Booking` row is displayed as "Reserved" in the UI — compute it, don't store it. This prevents Engineer B's Allocation code and Engineer C's Booking code from racing to overwrite the same column.
- `Lost` is set automatically only when an `AuditItem.result = Missing` is confirmed at cycle close. `Damaged` items do not auto-transition — they're surfaced for manual follow-up (see §0, assumption 7).

## 5. Screen → Engineer Map

| # | Screen | Owner |
|---|---|---|
| 1 | Login / Signup | **Engineer A** |
| 2 | Dashboard / Home | **Engineer A** |
| 3 | Organization Setup (Departments, Categories, Employee Directory) | **Engineer A** |
| 4 | Asset Registration & Directory | **Engineer B** |
| 5 | Asset Allocation & Transfer | **Engineer B** |
| 6 | Resource Booking | **Engineer C** |
| 7 | Maintenance Management | **Engineer B** |
| 8 | Asset Audit | **Engineer C** |
| 9 | Reports & Analytics | **Engineer C** |
| 10 | Activity Logs & Notifications | **Engineer C** |

**Rationale for the split:**
- **Engineer A** owns everything the other two depend on: auth, roles, departments, categories, the employee directory. Their tables and JWT contract must exist first.
- **Engineer B** owns the asset itself and everything that changes its state (allocation, transfer, maintenance) — this is the deepest, most rule-heavy domain (conflict detection, the state machine above) and deserves one dedicated owner rather than being split further.
- **Engineer C** owns everything that *reads across* the other two modules — booking (needs Assets + Users), audits (needs Assets + Users), reports (needs everything), notifications/logs (triggered by everything). Grouping the "cross-cutting reader" modules together means only one person needs to query outside their own tables.

## 6. API Conventions (shared by all three engineers)

- Base path: `/api/v1/`
- Auth: JWT bearer token, payload `{ user_id, role, department_id }`. Every protected route checks role via middleware, e.g. `requireRole(['Admin','AssetManager'])`.
- Response envelope (always this shape, success or failure):
```json
{ "success": true, "data": { }, "error": null }
{ "success": false, "data": null, "error": { "code": "ASSET_ALREADY_ALLOCATED", "message": "Currently held by Priya Shah." } }
```
- Errors use SCREAMING_SNAKE_CASE codes so the frontend can branch on them (e.g. show the "Transfer Request" button specifically on `ASSET_ALREADY_ALLOCATED`, not just a generic toast).
- Pagination: `?page=&limit=`, response includes `{ "data": [...], "meta": { "total": , "page": , "limit": } }`.
- List endpoints support `?status=&department_id=&category_id=&search=` query filters — every engineer implements this consistently on their own list endpoints.

## 7. Suggested Repo Structure

```
/client
  /src/pages/{login, dashboard, org-setup, assets, allocations, bookings, maintenance, audits, reports, activity}
  /src/api        (one file per module, thin fetch wrappers matching §6 envelope)
/server
  /modules
    /auth            (Engineer A)
    /organization     (Engineer A — departments, categories, employees)
    /assets           (Engineer B)
    /allocations      (Engineer B)
    /maintenance      (Engineer B)
    /bookings         (Engineer C)
    /audits           (Engineer C)
    /reports          (Engineer C)
    /notifications    (Engineer C)
  /shared
    logActivity.js    (Engineer C ships this hour 1 — everyone else imports it)
    requireRole.js    (Engineer A ships this hour 1 — everyone else imports it)
  /db/schema.sql or /migrations
```

Each module folder = `routes.js`, `controller.js`, `service.js` (business rules), `model.js`. This satisfies the "reusable module design" requirement directly and keeps three people from stepping on the same files.

## 8. Suggested Timeline (assumes ~40 hours)

| Window | Everyone together | Engineer A | Engineer B | Engineer C |
|---|---|---|---|---|
| Hr 0–2 | Agree full DB schema (§4.2), commit migrations + seed data, agree API envelope | — | — | — |
| Hr 2–4 | — | Auth + JWT + `requireRole` middleware, seed default Admin | Asset model + registration CRUD | `logActivity` shared util scaffold |
| Hr 4–12 | — | Signup/Login screens, Org Setup (3 tabs) | Asset Directory + search/filter, lifecycle status logic | Booking model + overlap validation logic |
| Hr 12–20 | — | Employee promotion flow, Dashboard KPI queries (stub against seed data) | Allocation + conflict blocking + Transfer workflow | Booking calendar UI, Audit Cycle CRUD |
| Hr 20–28 | Mid-point integration check: wire real endpoints into Dashboard/Reports | Wire Dashboard to real endpoints | Maintenance workflow end-to-end + state machine | Audit item verification + discrepancy report + close-cycle logic |
| Hr 28–34 | — | Polish RBAC edge cases, notifications consumption on dashboard | Return flow, overdue-return flagging | Notification triggers wired into B's events, Reports/Analytics screen |
| Hr 34–38 | Full integration pass, seed a realistic demo dataset together | | | Activity Logs screen |
| Hr 38–40 | Demo script rehearsal (see §9), bug bash | | | |

## 9. Hackathon Demo Script (map straight to judging)

1. Admin logs in → Org Setup → promotes an Employee to Asset Manager (shows real RBAC, no self-elevation).
2. Asset Manager registers a laptop → shows up `Available` with auto Asset Tag.
3. Allocate laptop to Employee A. Try allocating the *same* laptop to Employee B → blocked, shown "held by A," offered Transfer instead. **(this single moment demonstrates the core conflict-handling requirement — rehearse it smoothly)**
4. Book Room B2 9:00–10:00. Try booking 9:30–10:30 → rejected. Book 10:00–11:00 → accepted. **(same idea for booking overlap)**
5. Employee raises a maintenance request on an allocated asset → Asset Manager approves → status flips to Under Maintenance → resolve → reverts to Allocated, same holder.
6. Admin creates an Audit Cycle, assigns an auditor, marks one asset Missing, closes the cycle → asset becomes Lost, discrepancy report appears.
7. Dashboard shows all of the above reflected in KPI cards; Notifications feed shows the trail; Activity Log shows who did what, when.

## 10. Non-Functional Requirements

- **Security:** bcrypt/argon2 password hashing, JWT expiry + refresh, server-side role checks on every mutating route (never trust the frontend to hide a button).
- **Data integrity:** double-allocation and booking-overlap checks must be enforced at the service/DB layer (e.g. a DB constraint or transaction-guarded check), not just in the UI — a judge poking the API directly with curl/Postman should still be blocked.
- **Responsiveness:** all 10 screens usable at common laptop/tablet widths; KPI cards and tables should reflow, not overflow.
- **Traceability:** every state-changing action writes an `ActivityLog` row and, where listed in the notification catalogue, a `Notification` row.

## 11. Priority Tiers (if time runs short, cut in this order)

| Tier | Must ship for the demo to work | Cut first if behind schedule |
|---|---|---|
| P0 | Auth+RBAC, Asset registration, Allocation with conflict block, Booking with overlap block | never cut |
| P1 | Maintenance workflow, Transfer workflow, Dashboard KPIs | cut polish, not the flow |
| P2 | Audit cycles, Notifications, Activity Log | can be a simplified/manual version |
| P3 | Reports & Analytics (charts), custom category fields, QR codes, reminders/cron jobs | fine to demo as a static screen if time-boxed out |

---
*See the three companion Engineer PRDs for screen-level UI requirements, full API contracts, validation rules, and hour-by-hour task breakdowns specific to each module.*
