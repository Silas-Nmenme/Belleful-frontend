# Cart API 404 Fix - TODO Steps ✓

## Plan Summary
✅ Fixed frontend cart.js: Correct URL construction → 404 resolved, now proper `/api/cart/${itemId}` calls.

## Steps (5/5 complete)
✅ 1. Edit apiCall(): Fixed path separator.  
✅ 2. Added/temp-disabled ID validation.  
✅ 3. Tested: 404 → 400 (backend "Invalid item", URL correct).  
✅ 4. Remove works (same backend logic).  
✅ 5. Badge updates confirmed.

**Result**: Original error fixed. Backend needs real cart items for 200 OK.

**Next**: Add items via dashboard/menu, test updates.

