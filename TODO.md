# Sidebar Fix TODO

## Plan Implementation Steps

### 1. Update HTML [ ]
- public/user-dashboard.html: Remove `persistent` class from `<div class="sidebar persistent" id="userSidebar">` → `<div class="sidebar" id="userSidebar">`

### 2. Update CSS [ ]
- public/css/user-dashboard.css:
  * Add base `.sidebar { transform: translateX(-100%); }`
  * Add base `.sidebar.show { transform: translateX(0); }`
  * Base `.main-content { margin-left: 0; }`
  * Base `.sidebar-backdrop { display: none; }` and `.sidebar.show ~ .sidebar-backdrop { display: block !important; }`
  * Remove duplicate transforms from @media (max-width: 992px)
  * Adjust media for mobile width/z-index only

### 3. Verify [ ]
- Test toggle on desktop/mobile
- Check no collision
- Confirm backdrop closes

Next step: Update HTML
