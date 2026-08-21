/*=========================================================
    DEPENDENCIES
=========================================================*/

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const axios = require("axios");

const http = require("http");
const { Server } = require("socket.io");

const db = require("./Config/db");

/*=========================================================
    REDIS
=========================================================*/

const RedisService = require("./Services/RedisService");

/*=========================================================
    MAILER
=========================================================*/

try {
    require("./Config/mailer");
    console.log("✅ Mailer module loaded successfully!");
} catch (error) {
    console.error("❌ Failed to load mailer module:", error);
}

/*=========================================================
    EXPRESS
=========================================================*/

const app = express();
const server = http.createServer(app);

/*=========================================================
    ROUTERS
=========================================================*/

// USER AUTH
const userAuthRoutes = require("./Routers/UserAuthRouter");
const adminAuthRoutes = require("./Routers/AdminAuthRouter");

// USER API
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
const testimonialRoutes = require('./Routers/TestimonialRouter');

// BANNER ROUTER
const bannerRoutes = require("./Routers/BannerRouter");

// ADMIN API - DASHBOARD
const dashboardRouter = require("./Routers/DashboardRouter");

/*=========================================================
    TRUST PROXY
=========================================================*/

app.set("trust proxy", 1);

/*=========================================================
    MIDDLEWARE
=========================================================*/

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/*=========================================================
    CORS
=========================================================*/

const corsOptions = {
    origin: [
        "https://quangdungcinema.id.vn",
        "https://www.quangdungcinema.id.vn",
        "https://admin.quangdungcinema.id.vn",
        "http://localhost:3000",
        "http://localhost:5173",
        /\.vercel\.app$/
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
};

app.use(cors(corsOptions));

/*=========================================================
    SOCKET.IO - ĐÃ SỬA: THÊM MIDDLEWARE AUTH
=========================================================*/

const io = new Server(server, {
    cors: corsOptions,
    transports: ["websocket", "polling"]
});

// 🟢 Lưu io vào app để các service có thể dùng
app.set('io', io);

// ============================================================
// 🟢 THÊM: MIDDLEWARE XÁC THỰC SOCKET
// ============================================================
const Jwt = require("./utils/Jwt");

io.use((socket, next) => {
    try {
        // Lấy token từ handshake auth
        const token = socket.handshake.auth.token;
        
        if (!token) {
            console.warn('🔴 [SOCKET] Không có token, từ chối kết nối');
            return next(new Error('Authentication required'));
        }
        
        // Verify token
        const payload = Jwt.verifyAccessToken(token);
        if (!payload) {
            console.warn('🔴 [SOCKET] Token không hợp lệ');
            return next(new Error('Invalid token'));
        }
        
        // Lưu user info vào socket
        socket.userId = payload.user_id;
        socket.userRole = payload.role;
        
        console.log(`🟢 [SOCKET] Xác thực thành công: user ${socket.userId}`);
        next();
    } catch (error) {
        console.error('❌ [SOCKET] Lỗi xác thực:', error.message);
        next(new Error('Authentication error'));
    }
});

// ============================================================
// 🟢 BIẾN LƯU GHẾ ĐANG GIỮ
// ============================================================
let holdingSeats = [];

// ============================================================
// 🟢 XỬ LÝ KẾT NỐI SOCKET - ĐÃ SỬA
// ============================================================
io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`⚡ Socket connected: ${socket.id}, User: ${userId}`);

    // 🟢 THAM GIA ROOM RIÊNG CỦA USER
    if (userId) {
        socket.join(`user_${userId}`);
        console.log(`📌 [SOCKET] User ${userId} joined room: user_${userId}`);
    }

    // ============================================================
    // EVENT: SERVER GỬI DANH SÁCH GHẾ ĐANG GIỮ
    // ============================================================
    socket.emit("server-gui-danh-sach-dang-giu", holdingSeats);

    // ============================================================
    // EVENT: CLIENT CHỌN GHẾ
    // ============================================================
    socket.on("client-chon-ghe", (data) => {
        holdingSeats = holdingSeats.filter(
            seat => !(Number(seat.seatId) === Number(data.seatId) && 
                     Number(seat.showtimeId) === Number(data.showtimeId))
        );
        holdingSeats.push({ ...data, socketId: socket.id });
        socket.broadcast.emit("server-khoa-ghe", data);
    });

    // ============================================================
    // EVENT: CLIENT HỦY CHỌN GHẾ
    // ============================================================
    socket.on("client-huy-chon-ghe", (data) => {
        holdingSeats = holdingSeats.filter(
            seat => !(Number(seat.seatId) === Number(data.seatId) && 
                     Number(seat.showtimeId) === Number(data.showtimeId))
        );
        socket.broadcast.emit("server-mo-khoa-ghe", data);
    });

    // ============================================================
    // 🟢 THÊM: EVENT CLIENT XÁC NHẬN ĐÃ NHẬN SESSION_EXPIRED
    // ============================================================
    socket.on("session_expired_ack", (data) => {
        console.log(`📥 [SOCKET] User ${userId} đã xác nhận session_expired:`, data);
    });

    // ============================================================
    // 🟢 THÊM: EVENT PING GIỮ KẾT NỐI
    // ============================================================
    socket.on("ping", (callback) => {
        if (typeof callback === 'function') {
            callback({ status: 'pong', timestamp: new Date().toISOString() });
        }
    });

    // ============================================================
    // XỬ LÝ NGẮT KẾT NỐI
    // ============================================================
    socket.on("disconnect", () => {
        // Xử lý ghế đang giữ
        const releasedSeats = holdingSeats.filter(seat => seat.socketId === socket.id);
        releasedSeats.forEach(seat => {
            socket.broadcast.emit("server-mo-khoa-ghe", {
                seatId: seat.seatId,
                showtimeId: seat.showtimeId
            });
        });
        holdingSeats = holdingSeats.filter(seat => seat.socketId !== socket.id);
        
        // Rời khỏi room user
        if (userId) {
            socket.leave(`user_${userId}`);
            console.log(`🔴 [SOCKET] User ${userId} left room`);
        }
        
        console.log(`🔴 [SOCKET] Client disconnected: ${socket.id}`);
    });

    // ============================================================
    // XỬ LÝ LỖI
    // ============================================================
    socket.on("error", (error) => {
        console.error(`❌ [SOCKET] Error from ${socket.id}:`, error);
    });
});

// ============================================================
// 🟢 THÊM: HÀM GỬI SESSION EXPIRED QUA WEBSOCKET
// ============================================================
const sendSessionExpired = (io, userId, newDeviceInfo) => {
    try {
        if (!io) {
            console.warn('⚠️ [WEBSOCKET] io chưa được khởi tạo');
            return false;
        }
        
        // Gửi event đến room của user đó
        io.to(`user_${userId}`).emit('session_expired', {
            type: 'session_expired',
            message: 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác',
            newDevice: newDeviceInfo || 'Unknown Device',
            timestamp: new Date().toISOString(),
            requiresReLogin: true
        });
        
        console.log(`📤 [WEBSOCKET] Đã gửi session_expired đến user ${userId}`);
        return true;
    } catch (error) {
        console.error('❌ [WEBSOCKET] Lỗi gửi session_expired:', error.message);
        return false;
    }
};

/*=========================================================
    API ROUTES (GIỮ NGUYÊN)
=========================================================*/

// ROOT ROUTE
app.get("/", (req, res) => {
    res.send("🚀 Cinema Backend is flying!");
});

app.get("/api", (req, res) => {
    res.send("🚀 Cinema Backend is flying!");
});

// Health Check
app.get("/api/health", async (req, res) => {
    try {
        const conn = await db.getConnection();
        conn.release();
        const redisHealthy = await RedisService.ping();
        res.status(200).json({
            status: "ok",
            timestamp: new Date().toISOString(),
            database: "connected",
            redis: redisHealthy ? "connected" : "disconnected",
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

// USER AUTH
app.use("/api/auth", userAuthRoutes);
app.use("/admin/api/auth", adminAuthRoutes);

// USER API
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
app.use("/api/bookings", bookingRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/movie-genres", movieGenreRoutes);
app.use("/api/movie-actors", movieActorRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/blog-cinema", blogCinemaRoutes);
app.use("/api/forgot-password", forgotPasswordRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use("/api/banners", bannerRoutes);

// ADMIN API - DASHBOARD
app.use("/admin/api/dashboard", dashboardRouter);

/*=========================================================
    SERVER
=========================================================*/

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", async () => {
    console.log(`🚀 Server running on port ${PORT}`);

    // DATABASE
    try {
        const conn = await db.getConnection();
        console.log("✅ Database Cinema connected!");
        conn.release();
    } catch (error) {
        console.error("❌ Database Error:", error.message);
    }

    // REDIS
    try {
        const redisHealthy = await RedisService.ping();
        if (redisHealthy) {
            console.log("✅ Redis connected successfully!");
        } else {
            console.warn("⚠️ Redis connection failed!");
        }
    } catch (error) {
        console.error("❌ Redis Error:", error.message);
    }

    // KEEP RENDER ALIVE
    const SELF_URL = process.env.BACKEND_URL || "https://api.quangdungcinema.id.vn";

    setInterval(async () => {
        try {
            await axios.get(`${SELF_URL}/api/health?t=${Date.now()}`);
            console.log('✅ Keep-alive ping thành công');
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.error('❌ Keep-alive ping thất bại:', error.message);
            }
        }
    }, 5 * 60 * 1000);
});

/*=========================================================
    EXPORT
=========================================================*/

module.exports = { app, server, io, sendSessionExpired };