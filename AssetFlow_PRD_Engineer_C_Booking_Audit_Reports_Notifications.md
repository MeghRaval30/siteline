# AssetFlow — Module C PRD
### Resource Booking, Audit, Reports & Notifications

**Stack:** Node.js/Express + Prisma + PostgreSQL (Docker) · **Window:** ~2.5 hours (of 8 total) · **Solo developer build**

**Screens owned:** 6 (Resource Booking), 8 (Asset Audit), 9 (Reports & Analytics), 10 (Activity Logs & Notifications)
**Also owns (shared infra):** `logActivity()` util, `notify()` helper, AI Chat Assistant
**Reads from:** `User`/`Department` (Module A), `Asset` + writes back into `Asset.status` on confirmed-missing audit items (Module B)

These four screens "read across" everything else — bookings need Assets + Users, audits need Assets + Users, reports need everything, and notifications/logs are triggered by events in all modules. The most important early deliverable isn't a screen — it's the shared `logActivity()` function every other module calls.

---

## 1. User Stories

- As anyone, I can view a resource's calendar and book it for a time slot; an overlapping request is rejected, a back-to-back one is accepted.
- As anyone, I can cancel a booking.
- As an Admin/Asset Manager, I can create an audit cycle scoped to a department or location, assign auditors, and have them mark each in-scope asset Verified/Missing/Damaged.
- As an Admin/Asset Manager, closing a cycle locks it, auto-generates a discrepancy report, and flips confirmed-missing assets to `Lost`.
- As a manager, I can see utilization trends, maintenance frequency, and department-wise allocation.
- As anyone, I get notified of key events and can see a full activity log of who did what.
- As anyone, I can ask the AI Chat Assistant questions about the asset inventory in natural language.

## 2. Screen 6 — Resource Booking

Bookable resources are `Asset` rows with `is_bookable = true` (owned by Module B — query, don't own).

**Calendar view:** show existing bookings for a selected asset over a date range — a simple day/week grid.

**Overlap validation** — the exact algorithm:
```
new_booking conflicts with existing_booking IFF:
    new.start_time < existing.end_time  AND  new.end_time > existing.start_time

(strict inequality on both sides — a new booking that starts exactly when
 another ends is NOT a conflict, e.g. 10:00–11:00 is valid right after 9:00–10:00)
```
Enforce this in the service layer inside a Prisma transaction (check + insert atomically).

**Booking status lifecycle:** `Upcoming`, `Ongoing`, `Completed` are computed on read based on current time — no scheduled job needed. The query adds a virtual status:
- `start_time > now` → Upcoming
- `start_time <= now <= end_time` → Ongoing  
- `end_time < now` → Completed
- `cancelled_at IS NOT NULL` → Cancelled

```javascript
// booking.routes.js
router.post('/', authenticate, validate(createBookingSchema), bookingController.create);
router.get('/', authenticate, bookingController.list);
router.post('/:id/cancel', authenticate, bookingController.cancel);

POST /api/v1/bookings
  body: { asset_id, start_time, end_time, purpose, on_behalf_of_department_id? }
  logic:
    - asset must have is_bookable = true
    - run overlap check against non-cancelled bookings where end_time > now
    - conflict → 409 BOOKING_OVERLAP, data: { conflicting_booking: {...} }
    - else → create Booking
    - fire notification: booking.confirmed

GET /api/v1/bookings?asset_id=&date_from=&date_to=&status=
  → calendar data for the UI (status computed on read)

POST /api/v1/bookings/:id/cancel
  → set cancelled_by, cancelled_at; fire notification: booking.cancelled
```

## 3. Screen 8 — Asset Audit

**Create Audit Cycle:** scope (department or location), date range, assign auditors.
```javascript
// audit.routes.js
router.post('/cycles', authenticate, requireRole(['Admin','AssetManager']), auditController.createCycle);
router.patch('/items/:id', authenticate, auditController.markItem);
router.post('/cycles/:id/close', authenticate, requireRole(['Admin','AssetManager']), auditController.closeCycle);
router.get('/cycles/:id/discrepancies', authenticate, auditController.getDiscrepancies);

POST /api/v1/audit-cycles
  guard: requireRole(['Admin','AssetManager'])
  body: { name, scope_department_id?, scope_location?, start_date, end_date, auditor_user_ids: [] }
  logic: auto-populate AuditItem rows (result=Pending) for every in-scope asset

PATCH /api/v1/audit-items/:id
  guard: must be one of the assigned auditors for that cycle
  body: { result: "Verified" | "Missing" | "Damaged", notes }

POST /api/v1/audit-cycles/:id/close
  guard: requireRole(['Admin','AssetManager'])
  logic:
    - cycle.status = 'Closed' (locks further edits)
    - for each AuditItem with result='Missing': set Asset.status = 'Lost'
    - for each AuditItem with result='Damaged': surface in discrepancy report
    - fire notification: audit.discrepancy_flagged for each affected item

GET /api/v1/audit-cycles/:id/discrepancies
  → all AuditItems where result != 'Verified'
```

## 4. Screen 9 — Reports & Analytics

Simplified for 8-hour scope — 3-4 key reports, no CSV/PDF export.

| Report | Query sketch |
|---|---|
| Asset utilization (most-used vs idle) | `count(Allocation)` per asset over a period |
| Maintenance frequency by category | `count(MaintenanceRequest) group by category_id` |
| Department-wise allocation summary | `count(Allocation) group by holder_department_id` |
| Booking summary | `count(Booking) group by asset_id` with utilization % |

```javascript
// report.routes.js
router.get('/utilization', authenticate, reportController.utilization);
router.get('/maintenance-frequency', authenticate, reportController.maintenanceFrequency);
router.get('/department-allocation', authenticate, reportController.departmentAllocation);
router.get('/booking-summary', authenticate, reportController.bookingSummary);

GET /api/v1/reports/utilization
GET /api/v1/reports/maintenance-frequency
GET /api/v1/reports/department-allocation
GET /api/v1/reports/booking-summary
```

## 5. Screen 10 — Activity Logs, Notifications & AI Chat

### Shared Utilities (ship first — other modules depend on these)

```javascript
// shared/logActivity.js
async function logActivity({ actorUserId, action, entityType, entityId, metadata }) {
  return prisma.activityLog.create({
    data: { actor_user_id: actorUserId, action, entity_type: entityType,
            entity_id: entityId, metadata }
  });
}

// shared/notify.js
async function notify({ userId, type, message, relatedEntityType, relatedEntityId }) {
  return prisma.notification.create({
    data: { user_id: userId, type, message,
            related_entity_type: relatedEntityType, related_entity_id: relatedEntityId }
  });
}
```

### Notification Catalogue

| Event | Fired by | Trigger |
|---|---|---|
| Asset Assigned | Module B | on allocate |
| Maintenance Approved / Rejected | Module B | on approve/reject |
| Booking Confirmed / Cancelled | Module C | on booking create/cancel |
| Transfer Approved | Module B | on transfer approve |
| Audit Discrepancy Flagged | Module C | on cycle close |

### Activity Log Screen
Simple filterable table — actor, action, entity, timestamp. Filter by user/date/action type.

```javascript
GET /api/v1/activity-logs?actor_user_id=&action=&date_from=&date_to=&page=&limit=
GET /api/v1/notifications?is_read=&page=&limit=
PATCH /api/v1/notifications/:id/read
PATCH /api/v1/notifications/read-all
```

### AI Chat Assistant
Embedded chat widget on the Dashboard. Users ask natural language questions about assets.

```javascript
// ai.routes.js
router.post('/chat', authenticate, aiController.chat);
router.post('/search', authenticate, aiController.search);
router.get('/insights', authenticate, aiController.insights);
router.post('/maintenance-priority', authenticate, aiController.maintenancePriority);

POST /api/v1/ai/chat
  body: { message, conversation_history? }
  logic:
    - Send user's question + DB context (asset counts, recent activity) to Gemini
    - Gemini generates a response
    - Degrades gracefully if API unavailable
  → 200 { data: { response: "The IT department has 23 allocated assets..." } }

POST /api/v1/ai/search
  body: { query: "overdue laptops in engineering" }
  logic: Gemini translates to structured filters → execute Prisma query
  → 200 { data: { assets: [...], interpreted_filters: {...} } }

GET /api/v1/ai/insights
  logic: Feed KPI data to Gemini → get natural language summary
  → 200 { data: { summary: "3 assets overdue..." } }
```

## 6. Data Owned

`Booking`, `AuditCycle`, `AuditCycleAuditor`, `AuditItem`, `Notification`, `ActivityLog` — defined in the Prisma schema.

## 7. Module Dependencies

**Requires:**
- Module A — `User`/`Department` models for booking-on-behalf-of and audit scoping
- Module B — `Asset` model since Booking and AuditItem FK into it; audit-close writes into `Asset.status`

**What other modules need from this one:**
- `logActivity()` — called by every module on every mutating action. Ship this first.
- `notify()` — called by Module B on allocate/transfer/maintenance events.

## 8. Validation & Edge Cases Checklist

- [ ] Overlap check is atomic (Prisma transaction), not a racy check-then-insert.
- [ ] Boundary case: booking ending exactly when another starts is allowed, not rejected.
- [ ] Only assigned auditors can mark items for a given cycle.
- [ ] Closed audit cycles reject further AuditItem edits (immutability after close).
- [ ] Notification/log writes don't block or fail the primary action if they error.
- [ ] AI features degrade gracefully — no crashes if Gemini API is down.

## 9. Acceptance Criteria

- [ ] Book Room 9–10, attempt 9:30–10:30 → rejected with conflict details; book 10–11 → accepted.
- [ ] Booking status correctly computed as Upcoming/Ongoing/Completed based on time.
- [ ] Create audit cycle, assign auditor, mark item Missing → close → asset becomes Lost, discrepancy report shows it.
- [ ] At least 3 report types return real, correctly-aggregated numbers.
- [ ] Every listed notification type fires and appears in the Notifications screen.
- [ ] Activity Log shows a coherent trail across all modules.
- [ ] AI Chat Assistant answers questions about asset inventory.

## 10. Timeline (within 8-hour window)

| Hours | Task |
|---|---|
| 0–1 | `logActivity()` + `notify()` shared utils (shipped with foundation scaffold) |
| 3.5–4 | Booking model + create/cancel endpoints + overlap validation |
| 4–4.5 | Audit Cycle CRUD + auto-populate AuditItems + mark endpoint |
| 4.5–5 | Close-cycle logic (Lost transition, discrepancy report) |
| 5–5.5 | AI service (Gemini integration, chat, search, insights, maintenance priority) |
| 6.5–7 | Reports queries (utilization, maintenance frequency, dept allocation) |
| 7–7.5 | Activity Logs + Notifications endpoints, notification wiring into all modules |
