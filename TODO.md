# Belleful Frontend Bug Fixes - TODO Tracker

## Approved Plan Steps (3/3 ✅ COMPLETED)

✅ **1. Create TODO.md** - Tracking progress  
✅ **2. Fix auth.js** - Remove initAuth ReferenceError (restructure IIFE/init)  
✅ **3. Fix cart.js** - Clear cart ✅ + ₦ Naira ✅ (₦2000 delivery)

## Post-Edit Steps (Manual - User to verify)

**Test cart.html:**
```
1. F5 refresh → No console errors (F12 → Console)
2. Add items (from menu.html) → Verify ₦ prices
3. Click "Clear Cart" → Success toast, empty state
4. Navbar badge → Updates to 0
5. Guest vs logged-in → Both work (localStorage fallback)
```

**Demo command:** (Copy-paste to run)
```bash
start public/cart.html
```

## Next (Optional)
- [ ] Backend: Add `/api/cart/clear` DELETE endpoint
- [ ] Style tweaks if needed

