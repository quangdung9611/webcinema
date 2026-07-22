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

// ADMIN API - DASHBOARD
const dashboardRouter = require("./Routers/DashboardRouter"); // ✅ Đổi tên

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
    SOCKET.IO
=========================================================*/

const io = new Server(server, {
    cors: corsOptions,
    transports: ["websocket", "polling"]
});

let holdingSeats = [];

io.on("connection", (socket) => {
    console.log("⚡ Socket connected:", socket.id);
    socket.emit("server-gui-danh-sach-dang-giu", holdingSeats);

    socket.on("client-chon-ghe", (data) => {
        holdingSeats = holdingSeats.filter(
            seat => !(Number(seat.seatId) === Number(data.seatId) && 
                     Number(seat.showtimeId) === Number(data.showtimeId))
        );
        holdingSeats.push({ ...data, socketId: socket.id });
        socket.broadcast.emit("server-khoa-ghe", data);
    });

    socket.on("client-huy-chon-ghe", (data) => {
        holdingSeats = holdingSeats.filter(
            seat => !(Number(seat.seatId) === Number(data.seatId) && 
                     Number(seat.showtimeId) === Number(data.showtimeId))
        );
        socket.broadcast.emit("server-mo-khoa-ghe", data);
    });

    socket.on("disconnect", () => {
        const releasedSeats = holdingSeats.filter(seat => seat.socketId === socket.id);
        releasedSeats.forEach(seat => {
            socket.broadcast.emit("server-mo-khoa-ghe", {
                seatId: seat.seatId,
                showtimeId: seat.showtimeId
            });
        });
        holdingSeats = holdingSeats.filter(seat => seat.socketId !== socket.id);
    });
});

/*=========================================================
    API ROUTES
=========================================================*/

// ✅ ROOT ROUTE (CHỈ 1 LẦN)
app.get("/", (req, res) => {
    res.send("🚀 Cinema Backend is flying!");
});

// API Routes
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

// ADMIN API - DASHBOARD
app.use("/admin/api/manage", dashboardRouter);

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

module.exports = { app, server, io };