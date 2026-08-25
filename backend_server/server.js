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

const RedisService =
    require("./Services/RedisService");


/*=========================================================

    JWT & COOKIE

=========================================================*/

const Jwt =
    require("./utils/Jwt");

const Cookie =
    require("./utils/Cookie");

const RefreshTokenRepository =
    require("./Repositories/RefreshTokenRepository");


/*=========================================================

    AUTH SERVICE

=========================================================*/

const AuthService =
    require("./Services/AuthService");


/*=========================================================

    MAILER

=========================================================*/

try {

    require("./Config/mailer");

    console.log(
        "✅ Mailer module loaded successfully!"
    );

} catch (error) {

    console.error(
        "❌ Failed to load mailer module:",
        error
    );

}


/*=========================================================

    EXPRESS

=========================================================*/

const app = express();

const server =
    http.createServer(app);


/*=========================================================

    ROUTERS

=========================================================*/

// USER AUTH

const userAuthRoutes =
    require("./Routers/UserAuthRouter");

const adminAuthRoutes =
    require("./Routers/AdminAuthRouter");


// USER API

const userRoutes =
    require("./Routers/UserRouter");

const genreRoutes =
    require("./Routers/GenreRouter");

const movieRoutes =
    require("./Routers/MovieRouter");

const seatRoutes =
    require("./Routers/SeatRouter");

const cinemaRoutes =
    require("./Routers/CinemaRouter");

const roomRoutes =
    require("./Routers/RoomRouter");

const ticketRoutes =
    require("./Routers/TicketRouter");

const foodRoutes =
    require("./Routers/FoodRouter");

const paymentRoutes =
    require("./Routers/PaymentRouter");

const bankAppRoutes =
    require("./Routers/BankAppRouter");

const momoRoutes =
    require("./Routers/MomoRouter");

const actorRoutes =
    require("./Routers/ActorRouter");

const reviewRoutes =
    require("./Routers/ReviewRouter");

const showtimeRoutes =
    require("./Routers/ShowTimeRouter");

const bookingRoutes =
    require("./Routers/BookingRouter");

const couponRoutes =
    require("./Routers/CouponRouter");

const movieGenreRoutes =
    require("./Routers/MovieGenreRouter");

const movieActorRoutes =
    require("./Routers/MovieActorRouter");

const newsRoutes =
    require("./Routers/NewRouter");

const promotionRoutes =
    require("./Routers/PromotionRouter");

const blogCinemaRoutes =
    require("./Routers/BlogCinemaRouter");

const forgotPasswordRoutes =
    require("./Routers/ForgotPassRouter");

const testimonialRoutes =
    require("./Routers/TestimonialRouter");

const bannerRoutes =
    require("./Routers/BannerRouter");


// ADMIN DASHBOARD

const dashboardRouter =
    require("./Routers/DashboardRouter");


/*=========================================================

    TRUST PROXY

=========================================================*/

app.set(
    "trust proxy",
    1
);


/*=========================================================

    MIDDLEWARE

=========================================================*/

app.use(
    cookieParser()
);

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "uploads"
        )
    )
);


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

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
        "HEAD"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Accept",
        "X-Requested-With"
    ]

};


app.use(
    cors(corsOptions)
);


/*=========================================================

    🔥 SOCKET.IO SETUP

=========================================================*/

const io =
    new Server(
        server,
        {

            cors:
                corsOptions,

            transports: [
                "websocket",
                "polling"
            ],

            // Cho phép lấy cookie từ handshake
            allowEIO3: true

        }
    );


/*=========================================================

    🔥 SET IO TO AUTH SERVICE & COOKIE

=========================================================*/

// Set IO cho AuthService
AuthService.setIO(io);

// Lưu IO vào global để các middleware dùng
global.io = io;

console.log(
    "✅ Socket.IO instance set to AuthService & global"
);


/*=========================================================

    🔥 SOCKET AUTHENTICATION - CÓ HỖ TRỢ TOKEN EXPIRED

=========================================================*/

io.use(
    async (
        socket,
        next
    ) => {

        try {

            const cookieHeader =
                socket.handshake.headers.cookie;


            if (!cookieHeader) {

                console.warn(
                    "🔴 [SOCKET] No cookie found"
                );

                return next(
                    new Error(
                        "Authentication required"
                    )
                );

            }


            const cookies =
                cookieHeader
                    .split(";")
                    .reduce(
                        (
                            acc,
                            cookie
                        ) => {

                            const [
                                key,
                                value
                            ] =
                                cookie
                                    .trim()
                                    .split("=");


                            acc[key] =
                                value;


                            return acc;

                        },

                        {}
                    );


            const token =
                cookies["user_token"] ||
                cookies["admin_token"];


            if (!token) {

                console.warn(
                    "🔴 [SOCKET] No token found in cookies"
                );

                return next(
                    new Error(
                        "Authentication required"
                    )
                );

            }


            // =================================================
            // 🔥 VERIFY TOKEN - PHÂN BIỆT LỖI
            // =================================================

            let payload;

            try {

                payload =
                    Jwt.verifyAccessToken(
                        token
                    );

            } catch (error) {

                // =============================================
                // TOKEN EXPIRED - GỬI SOCKET NOTIFICATION
                // =============================================

                if (error.name === 'TokenExpiredError') {

                    console.warn(
                        '🔴 [SOCKET] Token expired'
                    );

                    // Thử decode để lấy userId
                    try {

                        const decoded =
                            Jwt.decodeAccessToken(token);

                        if (decoded?.user_id) {

                            // 🔥 EMIT SESSION EXPIRED
                            io.to(`user_${decoded.user_id}`).emit(
                                'session_expired',
                                {
                                    code: 'TOKEN_EXPIRED',
                                    type: 'device',
                                    message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                                    newDevice: {
                                        deviceName: 'Token expired',
                                        reason: 'Token đã hết hạn',
                                        timestamp: new Date().toISOString()
                                    },
                                    timestamp: new Date().toISOString()
                                }
                            );

                            console.log(
                                `📤 [SOCKET] session_expired sent to user_${decoded.user_id}`
                            );

                        }

                    } catch (decodeError) {

                        console.warn(
                            '⚠️ [SOCKET] Cannot decode expired token'
                        );

                    }

                    return next(
                        new Error(
                            "Token expired"
                        )
                    );

                }

                // =============================================
                // TOKEN INVALID
                // =============================================

                console.warn(
                    "🔴 [SOCKET] Invalid token:",
                    error.message
                );

                return next(
                    new Error(
                        "Invalid token"
                    )
                );

            }


            if (!payload) {

                console.warn(
                    "🔴 [SOCKET] Invalid token payload"
                );

                return next(
                    new Error(
                        "Invalid token"
                    )
                );

            }


            // =================================================
            // 🔥 CHECK DB - TOKEN CÒN HỢP LỆ KHÔNG
            // =================================================

            try {

                const accessTokenHash =
                    Jwt.hashRefreshToken(token);

                const validToken =
                    await RefreshTokenRepository.findValidTokenHash(
                        accessTokenHash
                    );

                if (!validToken) {

                    console.warn(
                        `🔴 [SOCKET] Token revoked for user ${payload.user_id}`
                    );

                    // 🔥 EMIT SESSION EXPIRED
                    io.to(`user_${payload.user_id}`).emit(
                        'session_expired',
                        {
                            code: 'SESSION_EXPIRED',
                            type: 'device',
                            message: 'Tài khoản đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.',
                            newDevice: {
                                deviceName: 'Session revoked',
                                reason: 'Token không tồn tại trong DB',
                                timestamp: new Date().toISOString()
                            },
                            timestamp: new Date().toISOString()
                        }
                    );

                    return next(
                        new Error(
                            "Session expired"
                        )
                    );

                }

            } catch (dbError) {

                console.error(
                    "🔴 [SOCKET] DB check error:",
                    dbError.message
                );

                // Vẫn cho phép kết nối nếu DB lỗi
                // nhưng log warning

            }


            socket.userId =
                payload.user_id;

            socket.userRole =
                payload.role;

            socket.userEmail =
                payload.email;

            socket.username =
                payload.username;

            socket.fullName =
                payload.full_name;


            console.log(
                `✅ [SOCKET] Authenticated: User ${payload.user_id} (${payload.email})`
            );


            next();

        } catch (error) {

            console.error(
                "🔴 [SOCKET] Auth error:",
                error.message
            );


            next(
                new Error(
                    "Authentication failed"
                )
            );

        }

    }
);


/*=========================================================

    HOLDING SEATS

=========================================================*/

let holdingSeats = [];


/*=========================================================

    🔥 SOCKET CONNECTION - ĐÃ TÍCH HỢP SESSION EXPIRED

=========================================================*/

io.on(
    "connection",
    async (
        socket
    ) => {

        const userId = socket.userId;
        const socketId = socket.id;

        console.log(
            `⚡ [SOCKET] Connected: ${socketId} - User: ${userId} (${socket.email || 'N/A'})`
        );

        // =====================================================
        // 🔥 THAM GIA ROOM CỦA USER
        // =====================================================

        if (userId) {
            socket.join(`user_${userId}`);
            console.log(`📌 [SOCKET] User ${userId} joined room user_${userId}`);
        }

        // =====================================================
        // GỬI DANH SÁCH GHẾ ĐANG GIỮ
        // =====================================================

        socket.emit(
            "server-gui-danh-sach-dang-giu",
            holdingSeats
        );


        console.log(
            "📤 [SOCKET] Đã gửi danh sách ghế đang giữ cho user mới:",
            holdingSeats.length,
            "ghế"
        );


        // =====================================================
        // REGISTER SOCKET
        // =====================================================

        socket.on(
            "register_socket",

            async (data) => {

                const {
                    userId: registerUserId
                } = data;


                if (
                    registerUserId &&
                    Number(registerUserId) ===
                    Number(userId)
                ) {

                    try {

                        await RedisService.saveUserSocket(
                            registerUserId,
                            socketId
                        );


                        console.log(
                            `✅ [SOCKET] Registered socket ${socketId} for user ${registerUserId}`
                        );


                        socket.emit(
                            "socket_registered",
                            {

                                success: true,

                                message:
                                    "Socket registered successfully"

                            }
                        );

                    } catch (error) {

                        console.error(
                            "❌ [SOCKET] Failed to register socket:",
                            error.message
                        );

                    }

                } else {

                    console.warn(
                        `⚠️ [SOCKET] User ${userId} attempted to register as ${registerUserId}. Blocked.`
                    );

                }

            }
        );


        // =====================================================
        // CHỌN GHẾ
        // =====================================================

        socket.on(
            "client-chon-ghe",

            (data) => {

                const existingSeat =
                    holdingSeats.find(

                        (seat) =>

                            Number(
                                seat.seatId
                            ) ===
                            Number(
                                data.seatId
                            ) &&

                            Number(
                                seat.showtimeId
                            ) ===
                            Number(
                                data.showtimeId
                            )

                    );


                // GHẾ ĐÃ CÓ NGƯỜI GIỮ

                if (existingSeat) {

                    console.log(
                        `⚠️ [SOCKET] Ghế ${data.seatId} đã có người giữ. Từ chối!`
                    );


                    socket.emit(
                        "server-khoa-ghe",
                        existingSeat
                    );


                    return;

                }


                // THÊM SOCKET ID

                const seatData = {

                    ...data,

                    socketId:
                        socketId,

                    userId:
                        userId

                };


                holdingSeats.push(
                    seatData
                );


                // GỬI CHO TẤT CẢ CLIENT

                io.emit(
                    "server-khoa-ghe",
                    seatData
                );


                console.log(
                    `🔒 [SOCKET] User ${userId} đã giữ ghế: ${data.seatId} - Showtime: ${data.showtimeId}`
                );

            }
        );


        // =====================================================
        // HỦY CHỌN GHẾ
        // =====================================================

        socket.on(
            "client-huy-chon-ghe",

            (data) => {

                // CHỈ CHO PHÉP CHỦ GHẾ HỦY GHẾ CỦA MÌNH

                const existingSeat =
                    holdingSeats.find(

                        (seat) =>

                            Number(
                                seat.seatId
                            ) ===
                            Number(
                                data.seatId
                            ) &&

                            Number(
                                seat.showtimeId
                            ) ===
                            Number(
                                data.showtimeId
                            )

                    );


                if (
                    existingSeat &&
                    existingSeat.socketId !==
                        socketId
                ) {

                    console.warn(
                        `⚠️ [SOCKET] User ${userId} cố hủy ghế không thuộc về mình`
                    );


                    return;

                }


                holdingSeats =
                    holdingSeats.filter(

                        (seat) =>

                            !(

                                Number(
                                    seat.seatId
                                ) ===
                                Number(
                                    data.seatId
                                ) &&

                                Number(
                                    seat.showtimeId
                                ) ===
                                Number(
                                    data.showtimeId
                                ) &&

                                seat.socketId ===
                                socketId

                            )

                    );


                io.emit(
                    "server-mo-khoa-ghe",
                    {

                        seatId:
                            data.seatId,

                        showtimeId:
                            data.showtimeId

                    }
                );


                console.log(
                    `🔓 [SOCKET] User ${userId} đã hủy giữ ghế: ${data.seatId} - Showtime: ${data.showtimeId}`
                );

            }
        );


        // =====================================================
        // REQUEST HOLDING SEATS
        // =====================================================

        socket.on(
            "request-holding-seats",

            () => {

                socket.emit(
                    "server-gui-danh-sach-dang-giu",
                    holdingSeats
                );


                console.log(
                    `📤 [SOCKET] Đã gửi danh sách ghế đang giữ cho ${socketId}`
                );

            }
        );


        // =====================================================
        // CLEAR ALL HOLDING SEATS
        // =====================================================

        socket.on(
            'clear_all_holding_seats',

            (data) => {

                console.log(
                    `🧹 [SOCKET] Clearing all holding seats for user ${userId}`
                );

                console.log(
                    `📨 [SOCKET] Data:`,
                    data
                );

                // Tìm tất cả ghế của user này
                const userSeats =
                    holdingSeats.filter(
                        seat => seat.socketId === socketId
                    );

                if (userSeats.length > 0) {

                    // Gửi event mở khóa cho từng ghế
                    userSeats.forEach(
                        (seat) => {

                            io.emit(
                                'server-mo-khoa-ghe',
                                {
                                    seatId: seat.seatId,
                                    showtimeId: seat.showtimeId
                                }
                            );

                            console.log(
                                `🔓 [SOCKET] Released seat ${seat.seatId} - Showtime: ${seat.showtimeId}`
                            );

                        }
                    );

                    // Xóa khỏi danh sách
                    holdingSeats =
                        holdingSeats.filter(
                            seat => seat.socketId !== socketId
                        );

                    console.log(
                        `✅ [SOCKET] Cleared ${userSeats.length} seats for user ${userId}`
                    );

                } else {

                    console.log(
                        `ℹ️ [SOCKET] No holding seats found for user ${userId}`
                    );

                }

                // Gửi xác nhận về client
                socket.emit(
                    'clear_all_holding_seats_ack',
                    {
                        success: true,
                        cleared: userSeats.length,
                        userId: userId,
                        timestamp: new Date().toISOString()
                    }
                );

            }
        );


        // =====================================================
        // 🔥 SESSION EXPIRED ACK
        // =====================================================

        socket.on(
            "session_expired_ack",

            (data) => {

                console.log(
                    `📨 [SOCKET] Received session_expired_ack from user ${userId}:`,
                    data
                );

            }
        );


        // =====================================================
        // DISCONNECT
        // =====================================================

        socket.on(
            "disconnect",

            () => {

                console.log(
                    `🔴 [SOCKET] Disconnected: ${socketId} - User: ${userId}`
                );


                const releasedSeats =
                    holdingSeats.filter(

                        (seat) =>
                            seat.socketId ===
                            socketId

                    );


                releasedSeats.forEach(
                    (seat) => {

                        io.emit(
                            "server-mo-khoa-ghe",
                            {

                                seatId:
                                    seat.seatId,

                                showtimeId:
                                    seat.showtimeId

                            }
                        );

                    }
                );


                holdingSeats =
                    holdingSeats.filter(

                        (seat) =>
                            seat.socketId !==
                            socketId

                    );


                if (userId) {

                    try {

                        RedisService.deleteUserSocket(
                            userId
                        );


                        console.log(
                            `🗑️ [SOCKET] Removed socket for user ${userId}`
                        );

                    } catch (error) {

                        console.error(
                            "❌ [SOCKET] Failed to remove socket for user:",
                            error.message
                        );

                    }

                }

            }
        );

    }
);


/*=========================================================

    🔥 API ROUTES

=========================================================*/

app.get(
    "/",
    (req, res) => {

        res.send(
            "🚀 Cinema Backend is flying!"
        );

    }
);


app.get(
    "/api",
    (req, res) => {

        res.send(
            "🚀 Cinema Backend is flying!"
        );

    }
);


app.get(
    "/api/health",

    async (
        req,
        res
    ) => {

        try {

            const conn =
                await db.getConnection();


            conn.release();


            const redisHealthy =
                await RedisService.ping();


            res.status(200).json({

                status:
                    "ok",

                timestamp:
                    new Date()
                        .toISOString(),

                database:
                    "connected",

                redis:
                    redisHealthy
                        ? "connected"
                        : "disconnected",

                uptime:
                    process.uptime()

            });

        } catch (error) {

            res.status(500).json({

                status:
                    "error",

                message:
                    error.message

            });

        }

    }
);


/*=========================================================

    USER AUTH

=========================================================*/

app.use(
    "/api/auth",
    userAuthRoutes
);

app.use(
    "/admin/api/auth",
    adminAuthRoutes
);


/*=========================================================

    USER API

=========================================================*/

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


/*=========================================================

    ADMIN API

=========================================================*/

app.use(
    "/admin/api/dashboard",
    dashboardRouter
);


/*=========================================================

    🔥 ERROR HANDLING MIDDLEWARE

=========================================================*/

// 404 Not Found
app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            code: "NOT_FOUND",

            message: "API endpoint not found"

        });

    }
);

// Global Error Handler
app.use(
    (err, req, res, next) => {

        console.error(
            "🔴 [SERVER] Global error:",
            err.stack
        );

        res.status(500).json({

            success: false,

            code: "INTERNAL_SERVER_ERROR",

            message: "Internal server error"

        });

    }
);


/*=========================================================

    🔥 START SERVER

=========================================================*/

const PORT =
    process.env.PORT || 5000;


server.listen(
    PORT,
    "0.0.0.0",

    async () => {

        console.log(
            `🚀 Server running on port ${PORT}`
        );

        console.log(
            `🌐 Environment: ${process.env.NODE_ENV || 'development'}`
        );


        // =====================================================
        // DATABASE
        // =====================================================

        try {

            const conn =
                await db.getConnection();


            console.log(
                "✅ Database Cinema connected!"
            );


            conn.release();

        } catch (error) {

            console.error(
                "❌ Database Error:",
                error.message
            );

        }


        // =====================================================
        // REDIS
        // =====================================================

        try {

            const redisHealthy =
                await RedisService.ping();


            if (redisHealthy) {

                console.log(
                    "✅ Redis connected successfully!"
                );

            } else {

                console.warn(
                    "⚠️ Redis connection failed!"
                );

            }

        } catch (error) {

            console.error(
                "❌ Redis Error:",
                error.message
            );

        }


        // =====================================================
        // SOCKET.IO STATUS
        // =====================================================

        console.log(
            `✅ Socket.IO server ready`
        );

        console.log(
            `📡 WebSocket: ${process.env.BACKEND_URL || 'http://localhost:' + PORT}`
        );


        // =====================================================
        // KEEP ALIVE
        // =====================================================

        const SELF_URL =
            process.env.BACKEND_URL ||
            `http://localhost:${PORT}`;


        setInterval(
            async () => {

                try {

                    await axios.get(
                        `${SELF_URL}/api/health?t=${Date.now()}`,
                        {
                            timeout: 5000
                        }
                    );


                    console.log(
                        "✅ Keep-alive ping thành công"
                    );

                } catch (error) {

                    if (
                        error.code !==
                        "ECONNREFUSED"
                    ) {

                        console.error(
                            "❌ Keep-alive ping thất bại:",
                            error.message
                        );

                    }

                }

            },

            5 * 60 * 1000
        );

    }
);


/*=========================================================

    EXPORT

=========================================================*/

module.exports = {
    app,
    server,
    io
};