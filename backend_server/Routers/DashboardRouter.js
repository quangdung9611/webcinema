const express = require('express');

const router = express.Router();

const DashboardController =
    require('../Controllers/DashboardController');


// =========================================================
// ADMIN DASHBOARD
// =========================================================


// Dashboard overview
router.get(
    '/dashboard/overview',
    DashboardController.getOverview
);


// Dashboard analytics
router.get(
    '/dashboard/analytics',
    DashboardController.getAnalytics
);


// Recent activity
router.get(
    '/dashboard/recent-activity',
    DashboardController.getRecentActivity
);


// =========================================================
// LEGACY API
// Giữ lại để các component cũ không chết
// =========================================================

router.get(
    '/stats',
    DashboardController.getStats
);


module.exports = router;