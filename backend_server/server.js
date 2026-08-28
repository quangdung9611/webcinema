require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");

const db = require("./Config/db");
const RedisService = require("./Services/RedisService");
const Jwt = require("./utils/Jwt");
const Cookie = require("./utils/Cookie");
const RefreshTokenRepository = require("./Repositories/RefreshTokenRepository");
const AuthService = require("./Services/AuthService");

try {
    require("./Config/mailer");
    console.log("✅ Mailer module loaded successfully!");
} catch (error) {
    console.error("❌ Failed to load mailer module:", error);
}

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

const app = express();
const server = http.createServer(app);

app.set("trust proxy", 1);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

const io = new Server(server, {
    cors: corsOptions,
    transports: ["websocket", "polling"],
    allowEIO3: true
});

AuthService.setIO(io);
global.io = io;
console.log("✅ Socket.IO instance set to AuthService & global");

const allowedOrigins = [
    "https://quangdungcinema.id.vn",
    "https://www.quangdungcinema.id.vn",
    "https://admin.quangdungcinema.id.vn",
    "http://localhost:3000",
    "http://localhost:5173"
];
// server.js - Socket.IO middleware mới

io.use(async (socket, next) => {
    try {
        const cookies = Object.fromEntries(
            (socket.handshake.headers.cookie || "").split(";").map(c => c.trim().split("="))
        );
        const token = cookies["user_token"] || cookies["admin_token"];

        // Không có token → guest connection
        if (!token) {
            console.log("👤 [SOCKET] Guest connection (no token)");
            socket.userId = null;
            socket.userRole = null;
            socket.userEmail = null;
            socket.username = null;
            socket.fullName = null;
            return next();
        }

        // Có token → thử xác thực
        let payload;
        try {
            payload = Jwt.verifyAccessToken(token);
        } catch (error) {
            // Token không hợp lệ → vẫn cho kết nối như guest
            console.warn("⚠️ [SOCKET] Invalid token, connecting as guest");
            socket.userId = null;
            socket.userRole = null;
            socket.userEmail = null;
            socket.username = null;
            socket.fullName = null;
            return next();
        }

        if (!payload) {
            socket.userId = null;
            return next();
        }

        // Kiểm tra token trong DB
        try {
            const accessTokenHash = Jwt.hashRefreshToken(token);
            const validToken = await RefreshTokenRepository.findValidTokenHash(accessTokenHash);
            
            if (validToken) {
                socket.userId = payload.user_id;
                socket.userRole = payload.role;
                socket.userEmail = payload.email;
                socket.username = payload.username;
                socket.fullName = payload.full_name;
                console.log(`✅ [SOCKET] Authenticated: User ${payload.user_id} (${payload.email})`);
            } else {
                console.warn("⚠️ [SOCKET] Token revoked, connecting as guest");
                socket.userId = null;
            }
        } catch (dbError) {
            console.error("🔴 [SOCKET] DB check error:", dbError.message);
            socket.userId = null;
        }

        next();
    } catch (error) {
        console.error("🔴 [SOCKET] Auth error:", error.message);
        socket.userId = null;
        next();
    }
});

let holdingSeats = [];

io.on("connection", async (socket) => {
    const userId = socket.userId;
    const socketId = socket.id;

    console.log(`⚡ [SOCKET] Connected: ${socketId} - User: ${userId} (${socket.email || 'N/A'})`);

    if (userId) {
        socket.join(`user_${userId}`);
        console.log(`📌 [SOCKET] User ${userId} joined room user_${userId}`);
    }

    socket.emit("server-gui-danh-sach-dang-giu", holdingSeats);

    socket.on("register_socket", async (data) => {
        const { userId: registerUserId } = data;
        if (registerUserId && Number(registerUserId) === Number(userId)) {
            try {
                await RedisService.saveUserSocket(registerUserId, socketId);
                socket.emit("socket_registered", { success: true, message: "Socket registered successfully" });
                console.log(`✅ [SOCKET] Registered socket ${socketId} for user ${registerUserId}`);
            } catch (error) {
                console.error("❌ [SOCKET] Failed to register socket:", error.message);
            }
        } else {
            console.warn(`⚠️ [SOCKET] User ${userId} attempted to register as ${registerUserId}. Blocked.`);
        }
    });

    socket.on("client-chon-ghe", (data) => {
        const existingSeat = holdingSeats.find(seat => 
            Number(seat.seatId) === Number(data.seatId) && Number(seat.showtimeId) === Number(data.showtimeId)
        );

        if (existingSeat) {
            socket.emit("server-khoa-ghe", existingSeat);
            return;
        }

        const seatData = { ...data, socketId, userId };
        holdingSeats.push(seatData);
        io.emit("server-khoa-ghe", seatData);
        console.log(`🔒 [SOCKET] User ${userId} đã giữ ghế: ${data.seatId} - Showtime: ${data.showtimeId}`);
    });

    socket.on("client-huy-chon-ghe", (data) => {
        const existingSeat = holdingSeats.find(seat => 
            Number(seat.seatId) === Number(data.seatId) && Number(seat.showtimeId) === Number(data.showtimeId)
        );

        if (existingSeat && existingSeat.socketId !== socketId) {
            console.warn(`⚠️ [SOCKET] User ${userId} cố hủy ghế không thuộc về mình`);
            return;
        }

        holdingSeats = holdingSeats.filter(seat => !(
            Number(seat.seatId) === Number(data.seatId) &&
            Number(seat.showtimeId) === Number(data.showtimeId) &&
            seat.socketId === socketId
        ));

        io.emit("server-mo-khoa-ghe", { seatId: data.seatId, showtimeId: data.showtimeId });
        console.log(`🔓 [SOCKET] User ${userId} đã hủy giữ ghế: ${data.seatId} - Showtime: ${data.showtimeId}`);
    });

    socket.on("request-holding-seats", () => {
        socket.emit("server-gui-danh-sach-dang-giu", holdingSeats);
    });

    socket.on("clear_all_holding_seats", (data) => {
        const userSeats = holdingSeats.filter(seat => seat.socketId === socketId);
        
        userSeats.forEach(seat => {
            io.emit("server-mo-khoa-ghe", { seatId: seat.seatId, showtimeId: seat.showtimeId });
        });

        holdingSeats = holdingSeats.filter(seat => seat.socketId !== socketId);
        socket.emit("clear_all_holding_seats_ack", {
            success: true,
            cleared: userSeats.length,
            userId,
            timestamp: new Date().toISOString()
        });
    });

    socket.on("session_expired_ack", (data) => {
        console.log(`📨 [SOCKET] Received session_expired_ack from user ${userId}:`, data);
    });

    socket.on("disconnect", () => {
        console.log(`🔴 [SOCKET] Disconnected: ${socketId} - User: ${userId}`);

        const releasedSeats = holdingSeats.filter(seat => seat.socketId === socketId);
        releasedSeats.forEach(seat => {
            io.emit("server-mo-khoa-ghe", { seatId: seat.seatId, showtimeId: seat.showtimeId });
        });

        holdingSeats = holdingSeats.filter(seat => seat.socketId !== socketId);

        if (userId) {
            try {
                RedisService.deleteUserSocket(userId);
                console.log(`🗑️ [SOCKET] Removed socket for user ${userId}`);
            } catch (error) {
                console.error("❌ [SOCKET] Failed to remove socket for user:", error.message);
            }
        }
    });
});

app.get("/", (req, res) => res.send("🚀 Cinema Backend is flying!"));
app.get("/api", (req, res) => res.send("🚀 Cinema Backend is flying!"));

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

app.use("/admin/api/dashboard", dashboardRouter);

app.use((req, res) => {
    res.status(404).json({ success: false, code: "NOT_FOUND", message: "API endpoint not found" });
});

app.use((err, req, res, next) => {
    console.error("🔴 [SERVER] Global error:", err.stack);
    res.status(500).json({ success: false, code: "INTERNAL_SERVER_ERROR", message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);

    try {
        const conn = await db.getConnection();
        console.log("✅ Database Cinema connected!");
        conn.release();
    } catch (error) {
        console.error("❌ Database Error:", error.message);
    }

    try {
        const redisHealthy = await RedisService.ping();
        console.log(redisHealthy ? "✅ Redis connected successfully!" : "⚠️ Redis connection failed!");
    } catch (error) {
        console.error("❌ Redis Error:", error.message);
    }

    console.log("✅ Socket.IO server ready");
    console.log(`📡 WebSocket: ${process.env.BACKEND_URL || 'http://localhost:' + PORT}`);

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