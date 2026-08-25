/* =========================================================
    ENV
========================================================= */

require("dotenv").config();

/* =========================================================
    DEPENDENCIES
========================================================= */

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
const RefreshTokenRepository = require("./Repositories/RefreshTokenRepository");
const AuthService = require("./Services/AuthService");

/* =========================================================
    MAILER
========================================================= */

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

/* =========================================================
    ROUTERS
========================================================= */

const userAuthRoutes =
    require("./Routers/UserAuthRouter");

const adminAuthRoutes =
    require("./Routers/AdminAuthRouter");

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

const dashboardRouter =
    require("./Routers/DashboardRouter");

/* =========================================================
    EXPRESS + HTTP SERVER
========================================================= */

const app = express();

const server =
    http.createServer(app);

/* =========================================================
    TRUST PROXY
========================================================= */

app.set(
    "trust proxy",
    1
);

/* =========================================================
    MIDDLEWARE
========================================================= */

app.use(
    cookieParser()
);

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true,
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

/* =========================================================
    ALLOWED ORIGINS
========================================================= */

const allowedOrigins = [
    "https://quangdungcinema.id.vn",

    "https://www.quangdungcinema.id.vn",

    "https://admin.quangdungcinema.id.vn",

    "http://localhost:3000",

    "http://localhost:5173",
];

/* =========================================================
    CORS
========================================================= */

const corsOptions = {

    origin(origin, callback) {

        /*
        =====================================================
        SERVER TO SERVER / POSTMAN / NO ORIGIN
        =====================================================
        */

        if (!origin) {
            return callback(
                null,
                true
            );
        }

        /*
        =====================================================
        NORMAL ALLOWED ORIGIN
        =====================================================
        */

        if (
            allowedOrigins.includes(
                origin
            )
        ) {
            return callback(
                null,
                true
            );
        }

        /*
        =====================================================
        VERCEL PREVIEW / DEPLOYMENT
        =====================================================
        */

        if (
            /\.vercel\.app$/.test(
                origin
            )
        ) {
            return callback(
                null,
                true
            );
        }

        console.warn(
            "🔴 [CORS] Blocked origin:",
            origin
        );

        return callback(
            new Error(
                "Origin not allowed"
            )
        );
    },

    credentials: true,

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
        "HEAD",
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Accept",
        "X-Requested-With",
    ],
};

app.use(
    cors(
        corsOptions
    )
);

/* =========================================================
    SOCKET.IO
========================================================= */

const io =
    new Server(
        server,
        {

            cors: corsOptions,

            transports: [
                "websocket",
                "polling",
            ],

            allowEIO3: true,
        }
    );

/* =========================================================
    SET SOCKET INSTANCE
========================================================= */

AuthService.setIO(
    io
);

global.io =
    io;

console.log(
    "✅ Socket.IO instance set to AuthService & global"
);

/* =========================================================
    HELPER
    CREATE SOCKET AUTH ERROR
========================================================= */

const createSocketError = (
    message,
    data = {}
) => {

    const error =
        new Error(
            message
        );

    error.data =
        data;

    return error;
};

/* =========================================================
    HELPER
    PARSE COOKIE
========================================================= */

const parseCookies = (
    cookieHeader = ""
) => {

    const cookies =
        {};

    cookieHeader
        .split(";")
        .forEach(
            (item) => {

                const trimmed =
                    item.trim();

                if (!trimmed) {
                    return;
                }

                const separatorIndex =
                    trimmed.indexOf("=");

                if (
                    separatorIndex === -1
                ) {
                    return;
                }

                const key =
                    trimmed
                        .slice(
                            0,
                            separatorIndex
                        )
                        .trim();

                const value =
                    trimmed
                        .slice(
                            separatorIndex + 1
                        )
                        .trim();

                if (!key) {
                    return;
                }

                try {

                    cookies[key] =
                        decodeURIComponent(
                            value
                        );

                } catch {

                    cookies[key] =
                        value;
                }
            }
        );

    return cookies;
};

/* =========================================================
    HELPER
    EMIT SESSION EXPIRED TO USER ROOM
========================================================= */

const emitSessionExpiredToUser = (
    userId,
    data = {}
) => {

    if (!userId) {
        return;
    }

    const payload = {

        code:
            data.code ||
            "SESSION_EXPIRED",

        type:
            data.type ||
            "token",

        message:
            data.message ||
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",

        newDevice:
            data.newDevice ||
            null,

        source:
            "socket",

        timestamp:
            new Date()
                .toISOString(),
    };

    console.warn(
        `🔴 [SOCKET] Emit session_expired to user_${userId}`,
        payload
    );

    io.to(
        `user_${userId}`
    ).emit(
        "session_expired",
        payload
    );
};

/* =========================================================
    SOCKET AUTH MIDDLEWARE
========================================================= */

io.use(
    async (
        socket,
        next
    ) => {

        try {

            /*
            =================================================
            ORIGIN CHECK
            =================================================
            */

            const origin =
                socket.handshake
                    .headers
                    .origin;

            if (
                origin &&
                !allowedOrigins.includes(
                    origin
                ) &&
                !/\.vercel\.app$/.test(
                    origin
                )
            ) {

                console.warn(
                    `🔴 [SOCKET] Blocked origin: ${origin}`
                );

                return next(
                    createSocketError(
                        "Origin not allowed",
                        {
                            code:
                                "ORIGIN_NOT_ALLOWED",
                        }
                    )
                );
            }

            /*
            =================================================
            GET COOKIE
            =================================================
            */

            const cookies =
                parseCookies(
                    socket.handshake
                        .headers
                        .cookie ||
                    ""
                );

            const token =
                cookies["user_token"] ||
                cookies["admin_token"];

            /*
            =================================================
            NO TOKEN
            =================================================
            */

            if (!token) {

                console.warn(
                    "🔴 [SOCKET] No authentication token"
                );

                return next(
                    createSocketError(
                        "Authentication required",
                        {
                            code:
                                "UNAUTHORIZED",

                            type:
                                "token",

                            message:
                                "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
                        }
                    )
                );
            }

            /*
            =================================================
            VERIFY ACCESS TOKEN
            =================================================
            */

            let payload;

            try {

                payload =
                    Jwt.verifyAccessToken(
                        token
                    );

            } catch (error) {

                /*
                =============================================
                TOKEN EXPIRED
                =============================================
                */

                if (
                    error.name ===
                    "TokenExpiredError"
                ) {

                    console.warn(
                        "🔴 [SOCKET] Access token expired"
                    );

                    let decoded =
                        null;

                    try {

                        decoded =
                            Jwt.decodeAccessToken(
                                token
                            );

                    } catch (
                        decodeError
                    ) {

                        console.warn(
                            "⚠️ [SOCKET] Cannot decode expired token"
                        );
                    }

                    /*
                    =========================================
                    Nếu user đã có socket cũ đang online
                    → bắn realtime event cho socket đó
                    =========================================
                    */

                    if (
                        decoded?.user_id
                    ) {

                        emitSessionExpiredToUser(
                            decoded.user_id,
                            {

                                code:
                                    "TOKEN_EXPIRED",

                                type:
                                    "token",

                                message:
                                    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",

                                newDevice:
                                    null,
                            }
                        );
                    }

                    /*
                    =========================================
                    Socket mới không connect được
                    → trả connect_error có code
                    Frontend socket.js sẽ bắt ngay
                    =========================================
                    */

                    return next(
                        createSocketError(
                            "Token expired",
                            {

                                code:
                                    "TOKEN_EXPIRED",

                                type:
                                    "token",

                                message:
                                    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",

                                userId:
                                    decoded?.user_id ||
                                    null,
                            }
                        )
                    );
                }

                /*
                =============================================
                INVALID TOKEN
                =============================================
                */

                console.warn(
                    "🔴 [SOCKET] Invalid token:",
                    error.message
                );

                return next(
                    createSocketError(
                        "Invalid token",
                        {

                            code:
                                "UNAUTHORIZED",

                            type:
                                "token",

                            message:
                                "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
                        }
                    )
                );
            }

            /*
            =================================================
            INVALID PAYLOAD
            =================================================
            */

            if (
                !payload ||
                !payload.user_id
            ) {

                console.warn(
                    "🔴 [SOCKET] Invalid token payload"
                );

                return next(
                    createSocketError(
                        "Invalid token payload",
                        {

                            code:
                                "UNAUTHORIZED",

                            type:
                                "token",

                            message:
                                "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
                        }
                    )
                );
            }

            /*
            =================================================
            VERIFY SESSION / TOKEN STATE
            =================================================

            LƯU Ý:

            Đoạn này đang GIỮ nguyên theo logic cũ của bạn.

            Nếu findValidTokenHash() thực tế kiểm tra hash của
            REFRESH TOKEN thì đoạn này cần đổi sang cơ chế
            kiểm tra session/token identifier phù hợp.

            Không tự ý đổi ở đây để tránh lệch CSDL hiện tại.
            =================================================
            */

            try {

                const accessTokenHash =
                    Jwt.hashRefreshToken(
                        token
                    );

                const validToken =
                    await RefreshTokenRepository
                        .findValidTokenHash(
                            accessTokenHash
                        );

                /*
                =============================================
                SESSION REVOKED
                =============================================
                */

                if (
                    !validToken
                ) {

                    console.warn(
                        `🔴 [SOCKET] Session revoked for user ${payload.user_id}`
                    );

                    /*
                    =========================================
                    Bắn event tới các socket cũ đang online
                    =========================================
                    */

                    emitSessionExpiredToUser(
                        payload.user_id,
                        {

                            code:
                                "SESSION_REPLACED",

                            type:
                                "device",

                            message:
                                "Tài khoản của bạn đã được đăng nhập trên thiết bị khác.",

                            newDevice:
                                {

                                    deviceName:
                                        "Another device",

                                    reason:
                                        "Session đã bị thay thế hoặc thu hồi",

                                    timestamp:
                                        new Date()
                                            .toISOString(),
                                },
                        }
                    );

                    /*
                    =========================================
                    Socket đang handshake
                    → connect_error
                    =========================================
                    */

                    return next(
                        createSocketError(
                            "Session expired",
                            {

                                code:
                                    "SESSION_REPLACED",

                                type:
                                    "device",

                                message:
                                    "Tài khoản của bạn đã được đăng nhập trên thiết bị khác.",

                                userId:
                                    payload.user_id,
                            }
                        )
                    );
                }

            } catch (
                dbError
            ) {

                /*
                =============================================
                DB ERROR

                Không nên tự logout user chỉ vì Redis/DB
                tạm thời lỗi.
                =============================================
                */

                console.error(
                    "🔴 [SOCKET] Session validation error:",
                    dbError.message
                );
            }

            /*
            =================================================
            AUTH SUCCESS
            =================================================
            */

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
                `✅ [SOCKET] Authenticated: User ${payload.user_id} (${payload.email || "N/A"})`
            );

            return next();

        } catch (
            error
        ) {

            console.error(
                "🔴 [SOCKET] Authentication error:",
                error.message
            );

            return next(
                createSocketError(
                    "Authentication failed",
                    {

                        code:
                            "UNAUTHORIZED",

                        type:
                            "token",

                        message:
                            "Không thể xác thực phiên đăng nhập.",
                    }
                )
            );
        }
    }
);

/* =========================================================
    HOLDING SEATS
========================================================= */

let holdingSeats =
    [];

/* =========================================================
    SOCKET CONNECTION
========================================================= */

io.on(
    "connection",
    async (
        socket
    ) => {

        const userId =
            socket.userId;

        const socketId =
            socket.id;

        console.log(
            `⚡ [SOCKET] Connected: ${socketId} - User: ${userId} (${socket.userEmail || "N/A"})`
        );

        /*
        =====================================================
        JOIN USER ROOM NGAY KHI CONNECT
        =====================================================
        */

        if (
            userId
        ) {

            socket.join(
                `user_${userId}`
            );

            console.log(
                `📌 [SOCKET] User ${userId} joined room user_${userId}`
            );
        }

        /*
        =====================================================
        SEND HOLDING SEATS
        =====================================================
        */

        socket.emit(
            "server-gui-danh-sach-dang-giu",
            holdingSeats
        );

        /* =================================================
            REGISTER SOCKET
        ================================================= */

        socket.on(
            "register_socket",
            async (
                data = {}
            ) => {

                const registerUserId =
                    data.userId;

                /*
                =============================================
                SECURITY CHECK
                =============================================
                */

                if (
                    !registerUserId ||
                    Number(
                        registerUserId
                    ) !==
                    Number(
                        userId
                    )
                ) {

                    console.warn(
                        `⚠️ [SOCKET] User ${userId} attempted to register as ${registerUserId}. Blocked.`
                    );

                    socket.emit(
                        "socket_registered",
                        {

                            success:
                                false,

                            message:
                                "User mismatch",
                        }
                    );

                    return;
                }

                try {

                    await RedisService
                        .saveUserSocket(
                            userId,
                            socketId
                        );

                    socket.emit(
                        "socket_registered",
                        {

                            success:
                                true,

                            message:
                                "Socket registered successfully",
                        }
                    );

                    console.log(
                        `✅ [SOCKET] Registered socket ${socketId} for user ${userId}`
                    );

                } catch (
                    error
                ) {

                    console.error(
                        "❌ [SOCKET] Failed to register socket:",
                        error.message
                    );

                    socket.emit(
                        "socket_registered",
                        {

                            success:
                                false,

                            message:
                                "Failed to register socket",
                        }
                    );
                }
            }
        );

        /* =================================================
            CHỌN GHẾ
        ================================================= */

        socket.on(
            "client-chon-ghe",
            (
                data = {}
            ) => {

                const existingSeat =
                    holdingSeats.find(
                        (
                            seat
                        ) =>
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
                    existingSeat
                ) {

                    socket.emit(
                        "server-khoa-ghe",
                        existingSeat
                    );

                    return;
                }

                const seatData =
                    {

                        ...data,

                        socketId,

                        userId,
                    };

                holdingSeats.push(
                    seatData
                );

                io.emit(
                    "server-khoa-ghe",
                    seatData
                );

                console.log(
                    `🔒 [SOCKET] User ${userId} held seat: ${data.seatId} - Showtime: ${data.showtimeId}`
                );
            }
        );

        /* =================================================
            HỦY CHỌN GHẾ
        ================================================= */

        socket.on(
            "client-huy-chon-ghe",
            (
                data = {}
            ) => {

                const existingSeat =
                    holdingSeats.find(
                        (
                            seat
                        ) =>
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

                /*
                =============================================
                KHÔNG CHO HỦY GHẾ CỦA SOCKET KHÁC
                =============================================
                */

                if (
                    existingSeat &&
                    existingSeat.socketId !==
                    socketId
                ) {

                    console.warn(
                        `⚠️ [SOCKET] User ${userId} attempted to release another user's seat`
                    );

                    return;
                }

                holdingSeats =
                    holdingSeats.filter(
                        (
                            seat
                        ) =>
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
                            data.showtimeId,
                    }
                );

                console.log(
                    `🔓 [SOCKET] User ${userId} released seat: ${data.seatId} - Showtime: ${data.showtimeId}`
                );
            }
        );

        /* =================================================
            REQUEST HOLDING SEATS
        ================================================= */

        socket.on(
            "request-holding-seats",
            () => {

                socket.emit(
                    "server-gui-danh-sach-dang-giu",
                    holdingSeats
                );
            }
        );

        /* =================================================
            CLEAR ALL HOLDING SEATS
        ================================================= */

        socket.on(
            "clear_all_holding_seats",
            () => {

                const userSeats =
                    holdingSeats.filter(
                        (
                            seat
                        ) =>
                            seat.socketId ===
                            socketId
                    );

                userSeats.forEach(
                    (
                        seat
                    ) => {

                        io.emit(
                            "server-mo-khoa-ghe",
                            {

                                seatId:
                                    seat.seatId,

                                showtimeId:
                                    seat.showtimeId,
                            }
                        );
                    }
                );

                holdingSeats =
                    holdingSeats.filter(
                        (
                            seat
                        ) =>
                            seat.socketId !==
                            socketId
                    );

                socket.emit(
                    "clear_all_holding_seats_ack",
                    {

                        success:
                            true,

                        cleared:
                            userSeats.length,

                        userId,

                        timestamp:
                            new Date()
                                .toISOString(),
                    }
                );
            }
        );

        /* =================================================
            SESSION EXPIRED ACK
        ================================================= */

        socket.on(
            "session_expired_ack",
            (
                data = {}
            ) => {

                console.log(
                    `📨 [SOCKET] session_expired ACK from user ${userId}:`,
                    data
                );
            }
        );

        /* =================================================
            DISCONNECT
        ================================================= */

        socket.on(
            "disconnect",
            async (
                reason
            ) => {

                console.log(
                    `🔴 [SOCKET] Disconnected: ${socketId} - User: ${userId}`
                );

                console.log(
                    `📌 [SOCKET] Reason: ${reason}`
                );

                /*
                =============================================
                RELEASE SEATS
                =============================================
                */

                const releasedSeats =
                    holdingSeats.filter(
                        (
                            seat
                        ) =>
                            seat.socketId ===
                            socketId
                    );

                releasedSeats.forEach(
                    (
                        seat
                    ) => {

                        io.emit(
                            "server-mo-khoa-ghe",
                            {

                                seatId:
                                    seat.seatId,

                                showtimeId:
                                    seat.showtimeId,
                            }
                        );
                    }
                );

                holdingSeats =
                    holdingSeats.filter(
                        (
                            seat
                        ) =>
                            seat.socketId !==
                            socketId
                    );

                /*
                =============================================
                REMOVE REDIS SOCKET

                Chỉ xóa nếu socket hiện tại vẫn là socket
                đang được Redis lưu cho user.

                Phần này tùy RedisService hiện tại của bạn.
                Hiện giữ cách gọi cũ để không làm vỡ code.
                =============================================
                */

                if (
                    userId
                ) {

                    try {

                        await RedisService
                            .deleteUserSocket(
                                userId
                            );

                        console.log(
                            `🗑️ [SOCKET] Removed socket for user ${userId}`
                        );

                    } catch (
                        error
                    ) {

                        console.error(
                            "❌ [SOCKET] Failed to remove user socket:",
                            error.message
                        );
                    }
                }
            }
        );
    }
);

/* =========================================================
    ROOT
========================================================= */

app.get(
    "/",
    (
        req,
        res
    ) => {

        res.send(
            "🚀 Cinema Backend is flying!"
        );
    }
);

app.get(
    "/api",
    (
        req,
        res
    ) => {

        res.send(
            "🚀 Cinema Backend is flying!"
        );
    }
);

/* =========================================================
    HEALTH CHECK
========================================================= */

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
                await RedisService
                    .ping();

            res.status(
                200
            ).json(
                {

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
                        process.uptime(),
                }
            );

        } catch (
            error
        ) {

            res.status(
                500
            ).json(
                {

                    status:
                        "error",

                    message:
                        error.message,
                }
            );
        }
    }
);

/* =========================================================
    API ROUTES
========================================================= */

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
    "/admin/api/dashboard",
    dashboardRouter
);

/* =========================================================
    404
========================================================= */

app.use(
    (
        req,
        res
    ) => {

        res.status(
            404
        ).json(
            {

                success:
                    false,

                code:
                    "NOT_FOUND",

                message:
                    "API endpoint not found",
            }
        );
    }
);

/* =========================================================
    GLOBAL ERROR
========================================================= */

app.use(
    (
        err,
        req,
        res,
        next
    ) => {

        console.error(
            "🔴 [SERVER] Global error:",
            err.stack
        );

        res.status(
            500
        ).json(
            {

                success:
                    false,

                code:
                    "INTERNAL_SERVER_ERROR",

                message:
                    "Internal server error",
            }
        );
    }
);

/* =========================================================
    START SERVER
========================================================= */

const PORT =
    process.env.PORT ||
    5000;

server.listen(
    PORT,
    "0.0.0.0",
    async () => {

        console.log(
            `🚀 Server running on port ${PORT}`
        );

        console.log(
            `🌐 Environment: ${process.env.NODE_ENV || "development"}`
        );

        /*
        =====================================================
        DATABASE CHECK
        =====================================================
        */

        try {

            const conn =
                await db.getConnection();

            console.log(
                "✅ Database Cinema connected!"
            );

            conn.release();

        } catch (
            error
        ) {

            console.error(
                "❌ Database Error:",
                error.message
            );
        }

        /*
        =====================================================
        REDIS CHECK
        =====================================================
        */

        try {

            const redisHealthy =
                await RedisService
                    .ping();

            console.log(
                redisHealthy
                    ? "✅ Redis connected successfully!"
                    : "⚠️ Redis connection failed!"
            );

        } catch (
            error
        ) {

            console.error(
                "❌ Redis Error:",
                error.message
            );
        }

        console.log(
            "✅ Socket.IO server ready"
        );

        console.log(
            `📡 WebSocket: ${
                process.env.BACKEND_URL ||
                `http://localhost:${PORT}`
            }`
        );

        /*
        =====================================================
        KEEP ALIVE
        =====================================================
        */

        const SELF_URL =
            process.env.BACKEND_URL ||
            `http://localhost:${PORT}`;

        setInterval(
            async () => {

                try {

                    await axios.get(
                        `${SELF_URL}/api/health?t=${Date.now()}`,
                        {

                            timeout:
                                5000,
                        }
                    );

                    console.log(
                        "✅ Keep-alive ping thành công"
                    );

                } catch (
                    error
                ) {

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

/* =========================================================
    EXPORT
========================================================= */

module.exports = {
    app,
    server,
    io,
};