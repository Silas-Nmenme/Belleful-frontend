# Cart API 404 Fix - TODO Steps

## Plan Summary
Fix frontend cart.js: Correct URL construction in apiCall() for /api/cart/:itemId paths. Remove bad sanitization causing /api/cart[no-slash]ID.

## Steps (3/5 complete)
✅ 1. Edit apiCall() in public/js/cart.js: Fix URL logic to preserve path separator for endpoints starting with '/'.  
✅ 2. Add itemId validation (24-char hex) in updateQuantity() and removeItem().  

- [ ] 3. Test quantity update on cart.html (check Network tab: /api/cart/[24-char-id] → 200).
- [ ] 4. Test remove item.
- [ ] 5. Verify cart badge updates. Complete task.

**Current progress**: Code changes complete. Test next.

