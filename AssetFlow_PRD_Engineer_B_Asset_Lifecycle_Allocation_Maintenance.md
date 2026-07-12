# AssetFlow — Module B PRD
### Asset Lifecycle, Allocation & Maintenance

**Stack:** Node.js/Express + Prisma + PostgreSQL (Docker) · **Window:** ~2.5 hours (of 8 total) · **Solo developer build**

**Screens owned:** 4 (Asset Registration & Directory), 5 (Allocation & Transfer), 7 (Maintenance Management)
**Also owns (shared infra):** The `Asset` state machine — the single most important piece of shared logic in the whole system
**Reads from:** `User`/`Department`/`AssetCategory` tables (from Module A)

This is the deepest domain in the app — the asset entity and its state machine are read by literally every other module (Dashboard KPIs, Booking, Audit, Reports all key off `Asset.status`). Get the schema and state transitions right early.

---

## 1. User Stories

- As an Asset Manager, I can register a new asset with an auto-generated tag, and it enters the system as `Available`.
- As anyone, I can search/filter assets by tag, serial number, category, status, department, or location.
- As anyone, I can view an asset's full allocation + maintenance history.
- As an Asset Manager, I can allocate an asset to an employee or department — if it's already held, the system blocks me and offers a Transfer Request instead.
- As a Department Head/Asset Manager, I can approve a transfer request, which updates the holder and history automatically.
- As an employee, I can raise a maintenance request on an asset; it must be approved before work starts, and the asset flips to `Under Maintenance` automatically on approval and back on resolution.
- When raising a maintenance request, the system suggests a priority level using AI based on the issue description.

## 2. Screen 4 — Asset Registration & Directory

**Register fields:** Name, Category (dropdown from `AssetCategory`), auto-generated Asset Tag (`AF-0001`, zero-padded, strictly increasing — generate server-side in a Prisma transaction to avoid collisions), Serial Number, Acquisition Date, Acquisition Cost (numeric, reporting-only), Condition, Location, `is_bookable` flag.

- Photo URL and documents are nullable text fields — no upload logic in 8-hour scope.
- QR code generation is cut (P3).
- Custom category fields are cut — categories have name + description only.

**Search/filter:** by tag, serial number, category, status, department (via current Allocation), location. Implement as query params: `?status=&category_id=&search=&page=&limit=`.

**Per-asset history:** allocation history + maintenance history, surfaced in a tabbed detail view.

**API Contract**
```javascript
// asset.routes.js
router.post('/', authenticate, requireRole(['Admin','AssetManager']), validate(createAssetSchema), assetController.create);
router.get('/', authenticate, assetController.list);
router.get('/:id', authenticate, assetController.getById);
router.put('/:id', authenticate, requireRole(['Admin','AssetManager']), assetController.update);

POST /api/v1/assets
  guard: requireRole(['Admin','AssetManager'])
  body: { name, category_id, serial_number, acquisition_date, acquisition_cost,
          condition, location, is_bookable, photo_url? }
  → 201 { data: { asset: {...}, asset_tag: "AF-0001" } }

GET /api/v1/assets?status=&category_id=&department_id=&search=&page=&limit=
  → 200 { data: [...], meta: { total, page, limit } }

GET /api/v1/assets/:id
  → 200 { data: { asset, current_holder, allocation_history: [...], maintenance_history: [...] } }

PUT /api/v1/assets/:id
  guard: requireRole(['Admin','AssetManager'])
```

## 3. Screen 5 — Asset Allocation & Transfer

**Allocate**
```javascript
// allocation.routes.js
router.post('/assets/:id/allocate', authenticate, requireRole(['Admin','AssetManager']), allocationController.allocate);

POST /api/v1/assets/:id/allocate
  guard: requireRole(['Admin','AssetManager'])
  body: { holder_user_id?, holder_department_id?, expected_return_date?, condition_at_checkout }
  logic:
    - exactly one of holder_user_id / holder_department_id must be set
    - if asset.status != 'Available' → 409 ASSET_ALREADY_ALLOCATED,
        data: { current_holder_name, current_holder_type }
      (frontend uses this to render "currently held by Priya" + a Transfer Request button)
    - else: create Allocation(status=Active), set asset.status = 'Allocated'
```

**Transfer workflow** (`Requested → Approved → Re-allocated`)
```javascript
POST /api/v1/assets/:id/transfer-requests
  body: { requested_to_user_id?, requested_to_department_id?, notes }
  logic: asset must be Allocated; captures from_allocation_id = current active allocation

POST /api/v1/transfer-requests/:id/approve
  guard: requireRole(['Admin','AssetManager','DepartmentHead'])  (DeptHead: dept-scoped only)
  logic:
    - close current Allocation (status=Returned, actual_return_date=now)
    - create new Allocation for new holder (status=Active)
    - asset.status stays 'Allocated' throughout (never touches Available)
    - transfer_request.status = 'Completed'

POST /api/v1/transfer-requests/:id/reject
  body: { reason }
```

**Return flow**
```javascript
POST /api/v1/allocations/:id/return
  body: { condition_at_checkin, notes }
  logic: allocation.status = 'Returned', actual_return_date = now, asset.status = 'Available'
```

**Overdue flagging:** computed property (`expected_return_date < now AND status = 'Active'`), read live by Dashboard KPI queries. No cron job needed.

## 4. Screen 7 — Maintenance Management

**Raise request:** select asset, issue description, priority, optional photo URL.
```javascript
POST /api/v1/maintenance-requests
  body: { asset_id, issue_description, priority, photo_url? }
  → creates with status = 'Pending'
```

**AI-powered priority suggestion:** When the user enters an issue description, the frontend can call `POST /api/v1/ai/maintenance-priority` with `{ issue_description, asset_history }` to get a suggested priority from Gemini. Displayed as a suggestion badge — user can accept or override.

**Workflow:** `Pending → Approved/Rejected → TechnicianAssigned → InProgress → Resolved`
```javascript
POST /api/v1/maintenance-requests/:id/approve
  guard: requireRole(['Admin','AssetManager'])
  logic:
    - asset.pre_maintenance_status = asset.status   (snapshot)
    - asset.status = 'Under Maintenance'
    - maintenance_request.status = 'Approved'
    (Allocation row, if any, is left untouched — holder doesn't change)

POST /api/v1/maintenance-requests/:id/reject
  body: { rejected_reason }

PATCH /api/v1/maintenance-requests/:id/assign-technician
  body: { technician_name }
  → status = 'TechnicianAssigned'

PATCH /api/v1/maintenance-requests/:id/start
  → status = 'InProgress'

POST /api/v1/maintenance-requests/:id/resolve
  body: { resolution_notes }
  logic:
    - asset.status = asset.pre_maintenance_status   (reverts correctly)
    - asset.pre_maintenance_status = null
    - maintenance_request.status = 'Resolved'
```

## 5. Asset Lifecycle State Machine (Master PRD §4.3)

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
- `Available ↔ Under Maintenance` and `Allocated → Under Maintenance` are both valid — store `pre_maintenance_status` so resolution correctly reverts.
- Transfers never pass through `Available` — asset stays `Allocated`; only the Allocation row's holder changes.
- `Reserved` is NOT a persisted status. A bookable `Available` asset with an Upcoming/Ongoing Booking is displayed as "Reserved" in the UI — compute it, don't store it.
- `Lost` is set automatically only when `AuditItem.result = Missing` is confirmed at cycle close.

## 6. Data Owned

`Asset`, `Allocation`, `TransferRequest`, `MaintenanceRequest` — defined in the Prisma schema. The `Asset.status` enum is the canonical source read by every other module.

## 7. Module Dependencies

**Requires:** Auth module (Module A) — `User`, `Department`, `AssetCategory` models must exist before this module can create assets or allocations.

**What other modules need from this one:**
- `Asset` model — Booking and Audit modules FK into it
- Working allocate/transfer/maintenance endpoints — Dashboard KPIs and Notification triggers read these
- Event names for activity logging: `asset.registered`, `asset.allocated`, `asset.transfer_approved`, `maintenance.approved`, `maintenance.rejected`, `maintenance.resolved`, `allocation.returned`

## 8. Validation & Edge Cases Checklist

- [ ] Cannot allocate an asset that isn't `Available` — return conflict error with holder info.
- [ ] Cannot create a transfer request for an asset that's `Available` (nothing to transfer).
- [ ] Transfer approval by DeptHead is scoped to their own department only.
- [ ] Maintenance approval on an already `Under Maintenance` asset is blocked.
- [ ] Resolve correctly restores `Allocated` + original holder, not blindly `Available`.
- [ ] Asset tag generation is race-safe (Prisma transaction).

## 9. Acceptance Criteria

- [ ] Register an asset → appears `Available` with a valid auto tag.
- [ ] Search/filter returns correct results across tag, serial, category, status.
- [ ] Allocating an already-held asset is blocked → shows "held by X" + offers Transfer.
- [ ] Transfer approve → old allocation closed, new one active, history shows both.
- [ ] Return flow → asset back to `Available`, condition note saved.
- [ ] Maintenance full cycle: raise → approve (Under Maintenance) → resolve (reverts correctly).
- [ ] AI suggests maintenance priority based on issue description.

## 10. Timeline (within 8-hour window)

| Hours | Task |
|---|---|
| 2–2.5 | Asset model + registration endpoint + auto-tag generation |
| 2.5–3 | Asset directory list/search/filter + detail view endpoint |
| 3–3.5 | Allocation endpoint + conflict-blocking logic (the demo centerpiece) |
| 3.5–4 | Transfer request workflow (create/approve/reject) |
| 4–4.5 | Return flow + condition check-in |
| 4.5–5 | Maintenance workflow end-to-end + pre_maintenance_status revert |
