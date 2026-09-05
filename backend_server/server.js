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


// ============================================================
// MAILER
// ============================================================

try {
    require("./Config/mailer");

    console.log("✅ Mailer module loaded successfully!");

} catch (error) {

    console.error(
        "❌ Failed to load mailer module:",
        error
    );
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

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);


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

app.use(cors(corsOptions));


// ============================================================
// SOCKET.IO
// ============================================================

const io = new Server(server, {

    cors: corsOptions,

    transports: [
        "websocket",
        "polling"
    ],

    allowEIO3: true
});


// ============================================================
// AUTH SERVICE SOCKET
// ============================================================

AuthService.setIO(io);

global.io = io;

console.log(
    "✅ Socket.IO instance set to AuthService & global"
);


// ============================================================
// ALLOWED ORIGINS
// ============================================================

const allowedOrigins = [
    "https://quangdungcinema.id.vn",
    "https://www.quangdungcinema.id.vn",
    "https://admin.quangdungcinema.id.vn",
    "http://localhost:3000",
    "http://localhost:5173"
];


// ============================================================
// SOCKET.IO AUTH MIDDLEWARE
// ============================================================

io.use(async (socket, next) => {

    try {

        // ========================================================
        // PARSE COOKIE
        // ========================================================

        const cookieHeader =
            socket.handshake.headers.cookie || "";

        const cookies = {};

        cookieHeader
            .split(";")
            .forEach((cookie) => {

                const trimmed =
                    cookie.trim();

                if (!trimmed) {
                    return;
                }

                const separatorIndex =
                    trimmed.indexOf("=");

                if (separatorIndex === -1) {
                    return;
                }

                const key =
                    trimmed.substring(
                        0,
                        separatorIndex
                    );

                const value =
                    trimmed.substring(
                        separatorIndex + 1
                    );

                cookies[key] = decodeURIComponent(
                    value
                );
            });


        // ========================================================
        // GET ACCESS TOKEN
        // ========================================================

        const token =
            cookies["user_token"] ||
            cookies["admin_token"];


        // ========================================================
        // NO TOKEN = GUEST
        // ========================================================

        if (!token) {

            console.log(
                "👤 [SOCKET] Guest connection (no token)"
            );

            socket.userId = null;
            socket.userRole = null;
            socket.userEmail = null;
            socket.username = null;
            socket.fullName = null;

            return next();
        }


        // ========================================================
        // VERIFY JWT
        // ========================================================

        let payload;

        try {

            payload =
                Jwt.verifyAccessToken(token);

        } catch (error) {

            console.warn(
                "⚠️ [SOCKET] Invalid token, connecting as guest"
            );

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


        // ========================================================
        // CHECK TOKEN IN DATABASE
        // ========================================================

        try {

            const accessTokenHash =
                Jwt.hashRefreshToken(token);

            const validToken =
                await RefreshTokenRepository.findValidTokenHash(
                    accessTokenHash
                );


            // ====================================================
            // VALID TOKEN
            // ====================================================

            if (validToken) {

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

            }

            // ====================================================
            // REVOKED TOKEN
            // ====================================================

            else {

                console.warn(
                    "⚠️ [SOCKET] Token revoked, connecting as guest"
                );

                socket.userId = null;
                socket.userRole = null;
                socket.userEmail = null;
                socket.username = null;
                socket.fullName = null;
            }

        } catch (dbError) {

            console.error(
                "🔴 [SOCKET] DB check error:",
                dbError.message
            );

            socket.userId = null;
            socket.userRole = null;
            socket.userEmail = null;
            socket.username = null;
            socket.fullName = null;
        }


        next();

    } catch (error) {

        console.error(
            "🔴 [SOCKET] Auth error:",
            error.message
        );

        socket.userId = null;
        socket.userRole = null;
        socket.userEmail = null;
        socket.username = null;
        socket.fullName = null;

        next();
    }
});


// ============================================================
// SOCKET CONNECTION
// ============================================================

io.on("connection", async (socket) => {

    const userId =
        socket.userId;

    const socketId =
        socket.id;


    /*
     * OWNER TOKEN
     *
     * Đây là ID đại diện cho socket hiện tại.
     *
     * Cache:
     *
     * seat_lock:{showtimeId}:{seatId}
     *             ↓
     *        socketId
     *
     * Nhờ vậy server biết ghế thuộc socket nào.
     */

    const ownerToken =
        socketId;


    console.log(
        `⚡ [SOCKET] Connected: ${socketId} - User: ${userId} (${socket.userEmail || "N/A"})`
    );


    // ============================================================
    // JOIN USER ROOM
    // ============================================================

    if (userId) {

        socket.join(
            `user_${userId}`
        );

        console.log(
            `📌 [SOCKET] User ${userId} joined room user_${userId}`
        );
    }


    // ============================================================
    // REGISTER SOCKET
    // ============================================================

    socket.on(
        "register_socket",
        async (data) => {

            const {
                userId: registerUserId
            } = data || {};


            if (
                registerUserId &&
                Number(registerUserId) ===
                    Number(userId)
            ) {

                try {

                    await CacheService.saveUserSocket(
                        registerUserId,
                        socketId
                    );


                    socket.emit(
                        "socket_registered",
                        {
                            success: true,
                            message:
                                "Socket registered successfully"
                        }
                    );


                    console.log(
                        `✅ [SOCKET] Registered socket ${socketId} for user ${registerUserId}`
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


    // ============================================================
    // SEND CURRENT HOLDING SEATS
    //
    // KHÔNG CÒN holdingSeats = []
    //
    // Cache là nguồn dữ liệu.
    // ============================================================

    try {

        const lockedSeats =
            await CacheService.getLockedSeatsByShowtime(
                socket.handshake.query?.showtimeId
            );


        /*
         * Nếu client truyền showtimeId khi connect,
         * gửi ngay danh sách ghế của showtime đó.
         *
         * Nếu không truyền showtimeId,
         * gửi [] để giữ nguyên behavior cũ.
         */

        socket.emit(
            "server-gui-danh-sach-dang-giu",
            lockedSeats
        );

    } catch (error) {

        console.error(
            "❌ [SOCKET] Failed to load holding seats:",
            error.message
        );

        socket.emit(
            "server-gui-danh-sach-dang-giu",
            []
        );
    }


    // ============================================================
    // CLIENT CHỌN GHẾ
    // ============================================================

    socket.on(
        "client-chon-ghe",
        async (data) => {

            try {

                if (!data) {
                    return;
                }


                const showtimeId =
                    Number(data.showtimeId);

                const seatId =
                    Number(data.seatId);


                // =================================================
                // VALIDATE
                // =================================================

                if (
                    !showtimeId ||
                    !seatId
                ) {

                    console.warn(
                        `⚠️ [SOCKET] Invalid seat data from ${socketId}`
                    );

                    socket.emit(
                        "server-seat-lock-error",
                        {
                            success: false,
                            message:
                                "Thông tin ghế không hợp lệ"
                        }
                    );

                    return;
                }


                // =================================================
                // CACHE ATOMIC LOCK
                // =================================================

                const lockResult =
                    await CacheService.acquireSeatLock(
                        showtimeId,
                        seatId,
                        ownerToken,
                        10 * 60
                    );


                // =================================================
                // LOCK FAILED
                // =================================================

                if (!lockResult.locked) {

                    console.log(
                        `⚠️ [SOCKET] Seat ${seatId} - Showtime ${showtimeId} đã bị giữ`
                    );


                    /*
                     * Gửi lại server-khoa-ghe cho chính client
                     * để frontend xử lý ghế đã bị người khác giữ.
                     */

                    socket.emit(
                        "server-khoa-ghe",
                        {
                            ...data,

                            seatId,
                            showtimeId,

                            socketId:
                                lockResult.ownerToken,

                            userId: null,

                            locked: true,

                            ttl:
                                lockResult.ttl
                        }
                    );

                    return;
                }


                // =================================================
                // LOCK SUCCESS
                // =================================================

                const seatData = {

                    ...data,

                    seatId,
                    showtimeId,

                    socketId,

                    userId,

                    ownerToken,

                    locked: true,

                    ttl:
                        lockResult.ttl
                };


                /*
                 * Broadcast cho toàn bộ client.
                 *
                 * Frontend hiện tại đang nghe:
                 *
                 * server-khoa-ghe
                 *
                 * nên không cần đổi event.
                 */

                io.emit(
                    "server-khoa-ghe",
                    seatData
                );


                console.log(
                    `🔒 [CACHE SEAT LOCK] User ${userId || "Guest"} giữ ghế ${seatId} - Showtime ${showtimeId} - TTL ${lockResult.ttl}s`
                );

            } catch (error) {

                console.error(
                    "❌ [SOCKET] Seat lock error:",
                    error.message
                );


                socket.emit(
                    "server-seat-lock-error",
                    {
                        success: false,
                        message:
                            "Không thể giữ ghế. Vui lòng thử lại."
                    }
                );
            }
        }
    );


    // ============================================================
    // CLIENT HỦY CHỌN GHẾ
    // ============================================================

    socket.on(
        "client-huy-chon-ghe",
        async (data) => {

            try {

                if (!data) {
                    return;
                }


                const showtimeId =
                    Number(data.showtimeId);

                const seatId =
                    Number(data.seatId);


                if (
                    !showtimeId ||
                    !seatId
                ) {

                    return;
                }


                // =================================================
                // CHECK OWNER + RELEASE
                // =================================================

                const released =
                    await CacheService.releaseSeatLock(
                        showtimeId,
                        seatId,
                        ownerToken
                    );


                // =================================================
                // NOT OWNER / ALREADY EXPIRED
                // =================================================

                if (!released) {

                    console.warn(
                        `⚠️ [SOCKET] User ${userId || "Guest"} cố hủy ghế ${seatId} nhưng không sở hữu lock`
                    );

                    return;
                }


                // =================================================
                // BROADCAST UNLOCK
                // =================================================

                io.emit(
                    "server-mo-khoa-ghe",
                    {
                        seatId,
                        showtimeId
                    }
                );


                console.log(
                    `🔓 [CACHE SEAT LOCK] User ${userId || "Guest"} hủy ghế ${seatId} - Showtime ${showtimeId}`
                );

            } catch (error) {

                console.error(
                    "❌ [SOCKET] Seat unlock error:",
                    error.message
                );
            }
        }
    );


    // ============================================================
    // REQUEST HOLDING SEATS
    //
    // Frontend có thể gửi:
    //
    // socket.emit("request-holding-seats", {
    //     showtimeId
    // });
    //
    // ============================================================

    socket.on(
        "request-holding-seats",
        async (data) => {

            try {

                const showtimeId =
                    Number(
                        data?.showtimeId ||
                        socket.handshake.query?.showtimeId
                    );


                if (!showtimeId) {

                    socket.emit(
                        "server-gui-danh-sach-dang-giu",
                        []
                    );

                    return;
                }


                const lockedSeats =
                    await CacheService.getLockedSeatsByShowtime(
                        showtimeId
                    );


                socket.emit(
                    "server-gui-danh-sach-dang-giu",
                    lockedSeats
                );


            } catch (error) {

                console.error(
                    "❌ [SOCKET] Request holding seats error:",
                    error.message
                );


                socket.emit(
                    "server-gui-danh-sach-dang-giu",
                    []
                );
            }
        }
    );


    // ============================================================
    // CLEAR ALL HOLDING SEATS
    // ============================================================

    socket.on(
        "clear_all_holding_seats",
        async (data) => {

            try {

                /*
                 * Nếu có showtimeId thì chỉ scan:
                 *
                 * seat_lock:{showtimeId}:*
                 *
                 * Nếu không có thì scan toàn bộ
                 * seat_lock:*.
                 */

                let clearedCount = 0;


                if (data?.showtimeId) {

                    clearedCount =
                        await CacheService
                            .releaseShowtimeSeatLocksByOwner(
                                Number(data.showtimeId),
                                ownerToken
                            );

                } else {

                    clearedCount =
                        await CacheService
                            .releaseAllSeatLocksByOwner(
                                ownerToken
                            );
                }


                /*
                 * Sau khi Cache release thành công,
                 * thông báo frontend.
                 *
                 * Vì không còn holdingSeats local,
                 * server không thể biết chính xác từng seat
                 * nếu không scan trước.
                 *
                 * Do đó request-holding-seats sẽ đồng bộ lại
                 * trạng thái thực tế từ Cache.
                 */


                socket.emit(
                    "clear_all_holding_seats_ack",
                    {
                        success: true,

                        cleared:
                            clearedCount,

                        userId,

                        timestamp:
                            new Date().toISOString()
                    }
                );


                console.log(
                    `🧹 [CACHE SEAT LOCK] Cleared ${clearedCount} seats for socket ${socketId}`
                );


                /*
                 * Nếu frontend đang ở showtime cụ thể,
                 * gửi request sync lại.
                 */

                if (data?.showtimeId) {

                    const lockedSeats =
                        await CacheService
                            .getLockedSeatsByShowtime(
                                Number(data.showtimeId)
                            );


                    socket.emit(
                        "server-gui-danh-sach-dang-giu",
                        lockedSeats
                    );
                }

            } catch (error) {

                console.error(
                    "❌ [SOCKET] Clear all holding seats error:",
                    error.message
                );


                socket.emit(
                    "clear_all_holding_seats_ack",
                    {
                        success: false,

                        cleared: 0,

                        userId,

                        message:
                            "Không thể giải phóng ghế"
                    }
                );
            }
        }
    );


    // ============================================================
    // SESSION EXPIRED ACK
    // ============================================================

    socket.on(
        "session_expired_ack",
        (data) => {

            console.log(
                `📨 [SOCKET] Received session_expired_ack from user ${userId}:`,
                data
            );
        }
    );


    // ============================================================
    // DISCONNECT
    // ============================================================

    socket.on(
        "disconnect",
        async () => {

            console.log(
                `🔴 [SOCKET] Disconnected: ${socketId} - User: ${userId}`
            );


            // =====================================================
            // RELEASE CACHE SEAT LOCKS
            // =====================================================

            try {

                const releasedCount =
                    await CacheService
                        .releaseAllSeatLocksByOwner(
                            ownerToken
                        );


                console.log(
                    `🔓 [CACHE SEAT LOCK] Released ${releasedCount} seats from socket ${socketId}`
                );


                /*
                 * KHÔNG broadcast toàn bộ seat ở đây.
                 *
                 * Vì releaseAllSeatLocksByOwner chỉ trả về count.
                 *
                 * Các client khác sẽ:
                 *
                 * - nhận sync request khi cần
                 * - hoặc bước tiếp theo mình sẽ tối ưu hàm Cache
                 *   để trả về danh sách seat đã release.
                 *
                 * TTL vẫn đảm bảo ghế không bị khóa vĩnh viễn.
                 */

            } catch (error) {

                console.error(
                    "❌ [SOCKET] Failed to release Cache seat locks:",
                    error.message
                );
            }


            // =====================================================
            // REMOVE USER SOCKET
            //
            // QUAN TRỌNG:
            //
            // Không được xóa socket mapping nếu Cache hiện tại
            // đã thuộc về một socket mới.
            // =====================================================

            if (userId) {

                try {

                    const registeredSocket =
                        await CacheService.getUserSocket(
                            userId
                        );


                    if (
                        registeredSocket ===
                        socketId
                    ) {

                        await CacheService.deleteUserSocket(
                            userId
                        );


                        console.log(
                            `🗑️ [SOCKET] Removed socket for user ${userId}`
                        );

                    } else {

                        console.log(
                            `ℹ️ [SOCKET] Socket ${socketId} disconnected, but user ${userId} is using another socket`
                        );
                    }

                } catch (error) {

                    console.error(
                        "❌ [SOCKET] Failed to remove socket for user:",
                        error.message
                    );
                }
            }
        }
    );
});


// ============================================================
// BASIC ROUTES
// ============================================================

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


// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
    "/api/health",
    async (req, res) => {

        try {

            const conn =
                await db.getConnection();

            conn.release();


            const cacheHealthy =
                await CacheService.ping();


            res.status(200).json({

                status: "ok",

                timestamp:
                    new Date().toISOString(),

                database:
                    "connected",

                cache:
                    cacheHealthy
                        ? "connected"
                        : "disconnected",

                uptime:
                    process.uptime()
            });

        } catch (error) {

            res.status(500).json({

                status: "error",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// API ROUTES
// ============================================================

app.use(
    "/api/auth",
    userAuthRoutes
);

app.use(
    "/admin/api/auth",
    adminAuthRoutes
);

app.use(
    "/api/users",
    userRoutes
);

app.use(
    "/api/genres",
    genreRoutes
);

app.use(
    "/api/movies",
    movieRoutes
);

app.use(
    "/api/seats",
    seatRoutes
);

app.use(
    "/api/cinemas",
    cinemaRoutes
);

app.use(
    "/api/rooms",
    roomRoutes
);

app.use(
    "/api/tickets",
    ticketRoutes
);

app.use(
    "/api/foods",
    foodRoutes
);

app.use(
    "/api/payment",
    paymentRoutes
);

app.use(
    "/api/bank",
    bankAppRoutes
);

app.use(
    "/api/momo",
    momoRoutes
);

app.use(
    "/api/actors",
    actorRoutes
);

app.use(
    "/api/reviews",
    reviewRoutes
);

app.use(
    "/api/showtimes",
    showtimeRoutes
);

app.use(
    "/api/bookings",
    bookingRoutes
);

app.use(
    "/api/coupons",
    couponRoutes
);

app.use(
    "/api/movie-genres",
    movieGenreRoutes
);

app.use(
    "/api/movie-actors",
    movieActorRoutes
);

app.use(
    "/api/news",
    newsRoutes
);

app.use(
    "/api/promotions",
    promotionRoutes
);

app.use(
    "/api/blog-cinema",
    blogCinemaRoutes
);

app.use(
    "/api/forgot-password",
    forgotPasswordRoutes
);

app.use(
    "/api/testimonials",
    testimonialRoutes
);

app.use(
    "/api/banners",
    bannerRoutes
);

app.use(
    "/api/price-config",
    priceConfigRoutes
);

app.use(
    "/admin/api/dashboard",
    dashboardRouter
);


// ============================================================
// 404
// ============================================================

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            code: "NOT_FOUND",

            message:
                "API endpoint not found"
        });
    }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "🔴 [SERVER] Global error:",
            err.stack
        );


        res.status(500).json({

            success: false,

            code:
                "INTERNAL_SERVER_ERROR",

            message:
                "Internal server error"
        });
    }
);


// ============================================================
// SERVER START
// ============================================================

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
            `🌐 Environment: ${
                process.env.NODE_ENV ||
                "development"
            }`
        );


        // ========================================================
        // DATABASE
        // ========================================================

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


        // ========================================================
        // CACHE
        // ========================================================

        try {

            const cacheHealthy =
                await CacheService.ping();


            console.log(
                cacheHealthy
                    ? "✅ Cache Service connected successfully!"
                    : "⚠️ Cache Service connection failed!"
            );

        } catch (error) {

            console.error(
                "❌ Cache Error:",
                error.message
            );
        }


        // ========================================================
        // SOCKET.IO
        // ========================================================

        console.log(
            "✅ Socket.IO server ready"
        );


        console.log(
            `📡 WebSocket: ${
                process.env.BACKEND_URL ||
                `http://localhost:${PORT}`
            }`
        );


        // ========================================================
        // KEEP ALIVE
        // ========================================================

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


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    app,
    server,
    io
};