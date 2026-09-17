require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");

const db = require("./Config/db");
const CacheService = require("./Services/CacheService");
const Jwt = require("./utils/Jwt");
const RefreshTokenRepository = require("./Repositories/RefreshTokenRepository");
const AuthService = require("./Services/AuthService");

// ✅ IMPORT MIDDLEWARE
const { setSocketIO: setUserSocketIO } = require("./Middlewares/UserAuthMiddleware");
const { setSocketIO: setAdminSocketIO } = require("./Middlewares/AdminAuthMiddleware");

// ============================================================
// MAILER
// ============================================================
try {
    require("./Config/mailer");
    console.log("✅ Mailer module loaded successfully!");
} catch (error) {
    console.error("❌ Failed to load mailer module:", error);
}

// ============================================================
// ROUTES
// ============================================================
const userAuthRoutes = require("./Routers/UserAuthRouter");
const adminAuthRoutes = require("./Routers/AdminAuthRouter");
const userRoutes = require("./Routers/UserRouter");
const genreRoutes = require("./Routers/GenreRouter");
const movieRoutes = require("./Routers/MovieRouter");
const seatRoutes = require("./Routers/SeatRouter");
const cinemaRoutes = require("./Routers/CinemaRouter");
const roomRoutes = require("./Routers/RoomRouter");
const ticketRoutes = require("./Routers/TicketRouter");
const foodRoutes = require("./Routers/FoodRouter");
const paymentRoutes = require("./Routers/PaymentRouter");
const bankAppRoutes = require("./Routers/BankAppRouter");
const momoRoutes = require("./Routers/MomoRouter");
const actorRoutes = require("./Routers/ActorRouter");
const reviewRoutes = require("./Routers/ReviewRouter");
const showtimeRoutes = require("./Routers/ShowTimeRouter");
const bookingRoutes = require("./Routers/BookingRouter");
const couponRoutes = require("./Routers/CouponRouter");
const movieGenreRoutes = require("./Routers/MovieGenreRouter");
const movieActorRoutes = require("./Routers/MovieActorRouter");
const newsRoutes = require("./Routers/NewRouter");
const promotionRoutes = require("./Routers/PromotionRouter");
const blogCinemaRoutes = require("./Routers/BlogCinemaRouter");
const forgotPasswordRoutes = require("./Routers/ForgotPassRouter");
const testimonialRoutes = require("./Routers/TestimonialRouter");
const bannerRoutes = require("./Routers/BannerRouter");
const dashboardRouter = require("./Routers/DashboardRouter");
const priceConfigRoutes = require("./Routers/PriceConfigRouter");
const showtimeConfigRoutes = require('./Routers/ShowtimeConfigRouter');
const aiRoutes = require('./Routers/AiRouter');

// ============================================================
// APP / SERVER
// ============================================================
const app = express();
const server = http.createServer(app);
app.set("trust proxy", 1);

// ============================================================
// BASIC MIDDLEWARE
// ============================================================
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================================================
// CORS
// ============================================================
const corsOptions = {
    origin: [
        "https://quangdungcinema.id.vn",
        "https://www.quangdungcinema.id.vn",
        "https://admin.quangdungcinema.id.vn",
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
};
app.use(cors(corsOptions));

// ============================================================
// SOCKET.IO
// ============================================================
const io = new Server(server, {
    cors: corsOptions,
    transports: ["websocket", "polling"],
    allowEIO3: true
});

// ============================================================
// ✅ SET SOCKET.IO
// ============================================================
AuthService.setIO(io);
setUserSocketIO(io);
setAdminSocketIO(io);
global.io = io;

console.log("✅ Socket.IO instance set to:");
console.log("   - AuthService");
console.log("   - UserAuthMiddleware");
console.log("   - AdminAuthMiddleware");
console.log("   - global.io");

// ============================================================
// SOCKET.IO AUTH MIDDLEWARE
// ============================================================
io.use(async (socket, next) => {
    try {
        const cookieHeader = socket.handshake.headers.cookie || "";
        const cookies = {};

        cookieHeader.split(";").forEach((cookie) => {
            const trimmed = cookie.trim();
            if (!trimmed) return;
            const separatorIndex = trimmed.indexOf("=");
            if (separatorIndex === -1) return;
            const key = trimmed.substring(0, separatorIndex);
            const value = trimmed.substring(separatorIndex + 1);
            cookies[key] = decodeURIComponent(value);
        });

        const origin = socket.handshake.headers.origin || "";
        const isAdminOrigin = origin.includes("admin.quangdungcinema.id.vn");

        let token;
        if (isAdminOrigin) {
            token = cookies["admin_token"] || cookies["user_token"];
            console.log(`🔑 [SOCKET] Admin origin → ${cookies["admin_token"] ? "admin_token" : "user_token (fallback)"}`);
        } else {
            token = cookies["user_token"] || cookies["admin_token"];
            console.log(`🔑 [SOCKET] User origin → ${cookies["user_token"] ? "user_token" : "admin_token (fallback)"}`);
        }

        if (!token) {
            console.log("👤 [SOCKET] Guest connection (no token)");
            socket.userId = null;
            socket.userRole = null;
            socket.userEmail = null;
            socket.username = null;
            socket.fullName = null;
            socket.accessToken = null;
            return next();
        }

        let payload;
        try {
            payload = Jwt.verifyAccessToken(token);
        } catch (error) {
            console.warn("⚠️ [SOCKET] Invalid token, connecting as guest");
            socket.userId = null;
            socket.userRole = null;
            socket.userEmail = null;
            socket.username = null;
            socket.fullName = null;
            socket.accessToken = null;
            return next();
        }

        if (!payload) {
            socket.userId = null;
            socket.accessToken = null;
            return next();
        }

        try {
            const accessTokenHash = Jwt.hashRefreshToken(token);
            const validToken = await RefreshTokenRepository.findValidTokenHash(accessTokenHash);

            if (validToken) {
                socket.userId = payload.user_id;
                socket.userRole = payload.role;
                socket.userEmail = payload.email;
                socket.username = payload.username;
                socket.fullName = payload.full_name;
                socket.accessToken = token;

                console.log(`✅ [SOCKET] Authenticated: User ${payload.user_id} | Role: ${payload.role}`);
            } else {
                console.warn("⚠️ [SOCKET] Token revoked, connecting as guest");
                socket.userId = null;
                socket.userRole = null;
                socket.userEmail = null;
                socket.username = null;
                socket.fullName = null;
                socket.accessToken = null;
            }
        } catch (dbError) {
            console.error("🔴 [SOCKET] DB check error:", dbError.message);
            socket.userId = null;
            socket.userRole = null;
            socket.userEmail = null;
            socket.username = null;
            socket.fullName = null;
            socket.accessToken = null;
        }

        next();

    } catch (error) {
        console.error("🔴 [SOCKET] Auth error:", error.message);
        socket.userId = null;
        socket.userRole = null;
        socket.userEmail = null;
        socket.username = null;
        socket.fullName = null;
        socket.accessToken = null;
        next();
    }
});

// ============================================================
// SOCKET CONNECTION
// ============================================================
io.on("connection", async (socket) => {
    const userId = socket.userId;
    const socketId = socket.id;
    const ownerToken = socketId;

    console.log(`⚡ [SOCKET] Connected: ${socketId} - User: ${userId} | Role: ${socket.userRole || "guest"}`);

    if (userId) {
        socket.join(`user_${userId}`);
        console.log(`📌 [SOCKET] User ${userId} joined room user_${userId}`);
    }

    // ============================================================
    // ✅ REGISTER SOCKET — RETRY 3 LẦN
    // ============================================================
    socket.on("register_socket", async (data) => {
        const { userId: registerUserId } = data || {};

        if (registerUserId && Number(registerUserId) === Number(userId)) {
            try {
                // 1. Lưu socket_token vào user_sockets
                await CacheService.saveUserSocket(registerUserId, socketId);

                // ✅ 2. Lưu socket_token vào refresh_tokens — RETRY 3 LẦN
                if (socket.accessToken) {
                    const accessTokenHash = Jwt.hashRefreshToken(socket.accessToken);
                    let success = false;

                    for (let attempt = 1; attempt <= 3; attempt++) {
                        try {
                            const updated = await RefreshTokenRepository.updateSocketToken(
                                accessTokenHash,
                                socketId
                            );

                            if (updated) {
                                success = true;
                                console.log(`✅ [SOCKET] Token ↔ Socket linked (attempt ${attempt}): user=${registerUserId}, socket=${socketId}`);
                                break;
                            }
                        } catch (err) {
                            console.warn(`⚠️ [SOCKET] Retry ${attempt}/3 failed:`, err.message);
                        }

                        if (attempt < 3) {
                            await new Promise(r => setTimeout(r, 500));
                        }
                    }

                    if (!success) {
                        console.warn(`⚠️ [SOCKET] Cannot link token ↔ socket after 3 retries`);
                    }
                } else {
                    console.warn(`⚠️ [SOCKET] No accessToken — cannot update socket_token`);
                }

                socket.emit("socket_registered", { success: true });
                console.log(`✅ [SOCKET] Registered socket ${socketId} for user ${registerUserId}`);

            } catch (error) {
                console.error("❌ [SOCKET] Failed to register socket:", error.message);
            }
        } else {
            console.warn(`⚠️ [SOCKET] User ${userId} attempted to register as ${registerUserId}. Blocked.`);
        }
    });

    // ============================================================
    // SEND CURRENT HOLDING SEATS
    // ============================================================
    try {
        const lockedSeats = await CacheService.getLockedSeatsByShowtime(
            socket.handshake.query?.showtimeId
        );
        socket.emit("server-gui-danh-sach-dang-giu", lockedSeats);
    } catch (error) {
        console.error("❌ [SOCKET] Failed to load holding seats:", error.message);
        socket.emit("server-gui-danh-sach-dang-giu", []);
    }

    // ============================================================
    // CLIENT CHỌN GHẾ
    // ============================================================
    socket.on("client-chon-ghe", async (data) => {
        try {
            if (!data) return;
            const showtimeId = Number(data.showtimeId);
            const seatId = Number(data.seatId);

            if (!showtimeId || !seatId) {
                socket.emit("server-seat-lock-error", {
                    success: false,
                    message: "Thông tin ghế không hợp lệ"
                });
                return;
            }

            const lockResult = await CacheService.acquireSeatLock(
                showtimeId, seatId, ownerToken, 10 * 60
            );

            if (!lockResult.locked) {
                socket.emit("server-khoa-ghe", {
                    ...data, seatId, showtimeId,
                    socketId: lockResult.ownerToken,
                    userId: null, locked: true, ttl: lockResult.ttl
                });
                return;
            }

            const seatData = {
                ...data, seatId, showtimeId,
                socketId, userId, ownerToken,
                locked: true, ttl: lockResult.ttl
            };

            io.emit("server-khoa-ghe", seatData);
        } catch (error) {
            console.error("❌ [SOCKET] Seat lock error:", error.message);
            socket.emit("server-seat-lock-error", {
                success: false,
                message: "Không thể giữ ghế. Vui lòng thử lại."
            });
        }
    });

    // ============================================================
    // CLIENT HỦY CHỌN GHẾ
    // ============================================================
    socket.on("client-huy-chon-ghe", async (data) => {
        try {
            if (!data) return;
            const showtimeId = Number(data.showtimeId);
            const seatId = Number(data.seatId);
            if (!showtimeId || !seatId) return;

            const released = await CacheService.releaseSeatLock(showtimeId, seatId, ownerToken);
            if (!released) return;

            io.emit("server-mo-khoa-ghe", { seatId, showtimeId });
        } catch (error) {
            console.error("❌ [SOCKET] Seat unlock error:", error.message);
        }
    });

    // ============================================================
    // REQUEST HOLDING SEATS
    // ============================================================
    socket.on("request-holding-seats", async (data) => {
        try {
            const showtimeId = Number(data?.showtimeId || socket.handshake.query?.showtimeId);
            if (!showtimeId) {
                socket.emit("server-gui-danh-sach-dang-giu", []);
                return;
            }
            const lockedSeats = await CacheService.getLockedSeatsByShowtime(showtimeId);
            socket.emit("server-gui-danh-sach-dang-giu", lockedSeats);
        } catch (error) {
            socket.emit("server-gui-danh-sach-dang-giu", []);
        }
    });

    // ============================================================
    // CLEAR ALL HOLDING SEATS
    // ============================================================
    socket.on("clear_all_holding_seats", async (data) => {
        try {
            let clearedCount = 0;
            if (data?.showtimeId) {
                clearedCount = await CacheService.releaseShowtimeSeatLocksByOwner(
                    Number(data.showtimeId), ownerToken
                );
            } else {
                clearedCount = await CacheService.releaseAllSeatLocksByOwner(ownerToken);
            }

            socket.emit("clear_all_holding_seats_ack", {
                success: true,
                cleared: clearedCount,
                userId,
                timestamp: new Date().toISOString()
            });

            if (data?.showtimeId) {
                const lockedSeats = await CacheService.getLockedSeatsByShowtime(Number(data.showtimeId));
                socket.emit("server-gui-danh-sach-dang-giu", lockedSeats);
            }
        } catch (error) {
            socket.emit("clear_all_holding_seats_ack", {
                success: false, cleared: 0, userId,
                message: "Không thể giải phóng ghế"
            });
        }
    });

    // ============================================================
    // SESSION EXPIRED ACK
    // ============================================================
    socket.on("session_expired_ack", (data) => {
        console.log(`📨 [SOCKET] session_expired_ack from user ${userId}:`, data);
    });

    // ============================================================
    // ✅ DISCONNECT
    // ============================================================
    socket.on("disconnect", async () => {
        console.log(`🔴 [SOCKET] Disconnected: ${socketId} - User: ${userId}`);

        // 1. Release seat locks
        try {
            const releasedCount = await CacheService.releaseAllSeatLocksByOwner(ownerToken);
            console.log(`🔓 [CACHE SEAT LOCK] Released ${releasedCount} seats`);
        } catch (error) {
            console.error("❌ [SOCKET] Release seat locks error:", error.message);
        }

        // ✅ 2. Clear socket_token khỏi refresh_tokens
        try {
            await RefreshTokenRepository.clearSocketToken(socketId);
        } catch (error) {
            console.error("❌ [SOCKET] Clear socket_token error:", error.message);
        }

        // ✅ 3. Xóa CHÍNH XÁC socket này khỏi user_sockets
        if (userId) {
            try {
                await CacheService.deleteUserSocketByToken(userId, socketId);
                console.log(`🗑️ [SOCKET] Removed socket ${socketId} for user ${userId}`);
            } catch (error) {
                console.error("❌ [SOCKET] Remove socket error:", error.message);
            }
        }
    });
});

// ============================================================
// BASIC ROUTES + HEALTH CHECK + API ROUTES
// ============================================================
app.get("/", (req, res) => res.send("🚀 Cinema Backend is flying!"));
app.get("/api", (req, res) => res.send("🚀 Cinema Backend is flying!"));

app.get("/api/health", async (req, res) => {
    try {
        const conn = await db.getConnection();
        conn.release();
        const cacheHealthy = await CacheService.ping();
        res.status(200).json({
            status: "ok",
            timestamp: new Date().toISOString(),
            database: "connected",
            cache: cacheHealthy ? "connected" : "disconnected",
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.use("/api/auth", userAuthRoutes);
app.use("/admin/api/auth", adminAuthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/genres", genreRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/cinemas", cinemaRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/bank", bankAppRoutes);
app.use("/api/momo", momoRoutes);
app.use("/api/actors", actorRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/showtimes", showtimeRoutes);
app.use('/api/showtime-config', showtimeConfigRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/movie-genres", movieGenreRoutes);
app.use("/api/movie-actors", movieActorRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/blog-cinema", blogCinemaRoutes);
app.use("/api/forgot-password", forgotPasswordRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/price-config", priceConfigRoutes);
app.use("/admin/api/dashboard", dashboardRouter);
app.use('/api/ai', aiRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false, code: "NOT_FOUND",
        message: "API endpoint not found"
    });
});

app.use((err, req, res, next) => {
    console.error("🔴 [SERVER] Global error:", err.stack);
    res.status(500).json({
        success: false, code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error"
    });
});

// ============================================================
// SERVER START
// ============================================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);

    try {
        const conn = await db.getConnection();
        console.log("✅ Database Cinema connected!");
        conn.release();
    } catch (error) {
        console.error("❌ Database Error:", error.message);
    }

    try {
        const cacheHealthy = await CacheService.ping();
        console.log(cacheHealthy ? "✅ Cache Service connected!" : "⚠️ Cache Service failed!");
    } catch (error) {
        console.error("❌ Cache Error:", error.message);
    }

    console.log("✅ Socket.IO server ready");
    console.log(`📡 WebSocket: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);

    const SELF_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

    setInterval(async () => {
        try {
            await axios.get(`${SELF_URL}/api/health?t=${Date.now()}`, { timeout: 5000 });
            console.log("✅ Keep-alive ping thành công");
        } catch (error) {
            if (error.code !== "ECONNREFUSED") {
                console.error("❌ Keep-alive ping thất bại:", error.message);
            }
        }
    }, 5 * 60 * 1000);
});

module.exports = { app, server, io };