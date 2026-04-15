# Staff Role Implementation Plan - Branch: staff

## Status: [ ] Not Started

## Steps (Complete sequentially):

1. **[x] Update User Model** - Add 'staff' to role enum in models/User.js
2. **[x] Extend Role Middleware** - Add `isStaff` in middleware/role.js
3. **[x] Create Staff Controller** - controllers/staffController.js (getPendingOrders, updateStatusLimited)
4. **[x] Create Staff Routes** - routes/staff.js (protect with isStaff, link to controller)
5. **[x] Mount Staff Routes** - Add to server.js: `app.use('/api/staff', staffRoutes);`
6. **[x] Register Staff Users** - Extend authController.js for staff registration (admin-only)
7. **[x] Fix staffController export & Test Endpoints** - Ready: Create staff via /api/auth/admin-register-staff
8. **[ ] Frontend Integration** (optional) - Staff dashboard HTML/JS
9. **[ ] Git Commit & Push** - `git add . && git commit -m "feat: add staff role & routes" && git push --set-upstream origin staff`
10. **[ ] Create PR** - `gh pr create --title "feat: Staff role with order management"`

## Detailed Edit Plan

**Information Gathered:**
- User.roles enum: ['user', 'admin'] only
- Auth system: JWT with role in payload, middleware attaches req.user
- Admin order access: full view/update/download
- No staff; easy to extend patterns

**Files to Edit/Create:**
| File | Changes |
|------|---------|
| models/User.js | Add 'staff' to enum: `['user', 'staff', 'admin']` |
| middleware/role.js | Add `const isStaff = async (req, res, next) => { ... role === 'staff' }; module.exports = { isAdmin, isStaff };` |
| controllers/staffController.js | **NEW** - getPendingOrders() (status: pending_approval|preparing), updateStatus() (limited to preparing → ready_for_pickup) |
| routes/staff.js | **NEW** - `router.get('/orders', isStaff, staffController.getPendingOrders); router.patch('/orders/:id/status', isStaff, ...)` |
| server.js | Add `const staffRoutes = require('./routes/staff'); app.use('/api/staff', staffRoutes);` |
| controllers/authController.js | Add admin-only `/admin-register-staff` endpoint |

**Dependent Files:** authController.js (staff creation), orderController.js (reuse utils?)

**Post-Edit Followups:**
- Run `npm start` or `nodemon server.js`
- Create test staff user via Postman/admin-register
- Test: POST /api/auth/login (staff), GET /api/staff/orders
- Fix any linter errors
- Git workflow: add/commit/push, `gh pr create`

**Approve to proceed? Reply 'yes' or suggest changes.**
