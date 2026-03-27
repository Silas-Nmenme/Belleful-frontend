# Image Error Fix Plan for Admin Dashboard

## Information Gathered
- **Root Cause**: Broken image fallbacks in `public/js/admin-dashboard.js` → `renderAdminMenuTable()`
  - Primary: `${item.image || 'https://via.placeholder.com/50x50?text=?'}&w=50` (malformed URL)
  - onerror: `https://via.placeholder.com/50x50/f0f0f0/999?text=No+Img` (DNS failure)
- **404 Error**: `https://bellefulchop.netlify.app/asset/placeholder-food.jpg&w=50` from backend menu items
- **Local Assets**: `public/asset/` has working images (grilled.jpg, jollof.webp, etc.)
- **Impact**: Menu table images fail → poor UX in admin panel

## Plan
### 1. Fix JS Image Rendering (Primary)
**File**: `public/js/admin-dashboard.js`
**Location**: `renderAdminMenuTable()` function, img src attribute
```
Old:
<img src="${item.image || 'https://via.placeholder.com/50x50?text=?'}&w=50" ... onerror="this.src='https://via.placeholder.com/50x50/f0f0f0/999?text=No+Img'">

New:
<img src="${item.image || '/asset/grilled.jpg'}?w=50" ... onerror="this.src='/asset/food-particles.svg'">
```
- Use local `/asset/grilled.jpg` as primary fallback (exists)
- onerror → `/asset/food-particles.svg` (exists, SVG scales perfectly)

### 2. Create Local Placeholder (Optional Enhancement)
**File**: Create `public/asset/placeholder-food.jpg`
**Content**: Simple 50x50 food placeholder image (or copy from existing)

### 3. Backend Consideration (Future)
- Update menu items with local image paths
- Serve `/asset/placeholder-food.jpg` from backend if needed

## Dependent Files to be Edited
- **Primary**: `public/js/admin-dashboard.js` (image src logic)
- **Optional**: `public/asset/placeholder-food.jpg` (new local placeholder)

## Followup Steps
1. Edit `public/js/admin-dashboard.js`
2. Test: `Live Server` → Admin Dashboard → Menu Items table
3. Verify: No console errors, images load (even if backend returns null)
4. Installations: None needed
5. Testing: Check menu table renders without 404/DNS errors

**Ready to implement? Confirm to proceed → create TODO.md + execute fixes.**

