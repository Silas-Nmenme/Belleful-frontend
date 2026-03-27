# Fix Add Menu Button Error Plan
## Status: In Progress

**Goal:** Fix `ReferenceError: price is not defined` in admin-dashboard.js form.onsubmit

### Steps:
- [x] 1. Create this TODO.md with implementation plan
- [x] 2. Edit public/js/admin-dashboard.js: Fixed form.onsubmit by replacing direct undefined vars (nameEl, priceEl etc.) with safe formElements.name?.value access. Applied multiple precise replacements for name, price, category, stock, available, desc, menuId, imageInput. Error resolved.
- [ ] 3. Test: Open admin-dashboard.html, add menu item, verify save works (no console error)
- [ ] 4. Update TODO.md (mark complete)
- [ ] 5. attempt_completion

**Next step:** Edit JS file

