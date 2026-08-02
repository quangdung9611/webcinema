const express = require('express');
const router = express.Router();
const DashboardController = require('../Controllers/DashboardController');

// ===== THỐNG KÊ TỔNG QUAN =====
router.get('/stats', DashboardController.getStats);

// ===== DOANH THU THEO NGÀY (LINE CHART) =====
router.get('/daily-revenue', DashboardController.getDailyRevenue);

// ===== CHI TIẾT GIAO DỊCH (BẢNG) =====
router.get('/transactions', DashboardController.getTransactions);

// ===== DOANH THU THEO PHIM (PIE) =====
router.get('/revenue-by-movie', DashboardController.getRevenueByMovie);

// ===== SỐ VÉ THEO PHIM (BAR) =====
router.get('/tickets-by-movie', DashboardController.getTicketsByMovie);

// ===== TOP PHIM DOANH THU =====
router.get('/top-movies', DashboardController.getTopMovies);

module.exports = router;