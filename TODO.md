# 404 Fix Plan - placeholder-food.jpg

## Status: Planning Complete - Ready for Implementation

**Issue:** Cart.js uses `/asset/placeholder-food.jpg` fallback when `item.image` null → 404 (local/Netlify)

**Root Cause:** 
- Menu upload: Admin → FormData(image) → Backend multer/Cloudinary → DB item.image = CDN URL
- Cart renders DB item.image || bad fallback
- Some menu items lack images → hits non-existent fallback

**Files Analyzed:**
- public/js/cart.js: Culprit line `src="${item.image || '/asset/placeholder-food.jpg'}"`
- public/js/menu.js: Uses external Unsplash + via.placeholder.com fallback ✓
- public/js/admin-dashboard.js: Upload FormData ✓, table fallback '/asset/grilled.jpg' ✓
- public/js/checkout-page.js: Cloudinary for receipts (confirms process)

**Implementation Steps:**

### 1. Update Cart.js Fallback (Primary Fix) ✅\n- Changed to `/asset/grilled.jpg` + external onerror fallback\n- Matches menu.js pattern

### 2. Test Admin Upload
- Admin dashboard → Add menu item with image → Verify DB saves Cloudinary URL
- Cart add → Confirm item.image = CDN, no fallback hit

### 3. Bulk Fix Menu Items (Optional)
- Admin → Edit image-less items → Re-upload images

### 4. Deploy/Netlify Test
- Verify no 404 on bellefulchop.netlify.app

**Progress:**
- [x] Step 1: Edit cart.js
- [ ] Step 2: Test upload process
- [ ] Step 3: Verify fix (no 404)

