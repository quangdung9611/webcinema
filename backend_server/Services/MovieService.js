// Services/MomoService.js

const crypto = require("crypto");
const axios = require("axios");
const CacheService = require("./CacheService");
const OtpService = require("./OtpService");
const { PURPOSE } = require("./OtpService");
const MailService = require("./MailService");
const BookingService = require("./BookingService");
const TicketService = require("./TicketService");
const PointsService = require("./PointsService");
const db = require("../Config/db");

const TEMP_BOOKING_TTL = 300; // 5 phút

const MOMO_CONFIG = {
    partnerCode: "MOMOBKUN20180810",
    accessKey: "klm05ndA99cl4UXT",
    secretKey: "f06nd13v6u1234567890abcdefghijk",
    redirectUrl: "https://quangdungcinema.id.vn/confirm-success",
    ipnUrl: "https://api.quangdungcinema.id.vn/api/momo/callback",
    endpoint: "https://test-payment.momo.vn/v2/gateway/api/create"
};

/*=========================================================
    HELPER: XÁC ĐỊNH TIME_SLOT
=========================================================*/
const getTimeSlot = (startTime) => {
    const str = String(startTime).replace("T", " ");
    const timePart = str.split(" ")[1] || "00:00";
    const hour = parseInt(timePart.split(":")[0], 10);

    if (hour >= 8 && hour < 12) return "MORNING";
    if (hour >= 12 && hour < 17) return "AFTERNOON";
    if (hour >= 17 && hour < 20) return "EVENING";
    return "NIGHT";
};

/*=========================================================
    HELPER: XÁC ĐỊNH DAY_TYPE
=========================================================*/
const getDayType = (startTime) => {
    const str = String(startTime).replace("T", " ");
    const datePart = str.split(" ")[0];
    const d = new Date(datePart + "T00:00:00");
    const day = d.getDay();

    return (day === 0 || day === 6) ? "WEEKEND" : "WEEKDAY";
};

class MomoService {

    /*=========================================================
        1. PROCESS ORDER — VALIDATE + TÍNH GIÁ SERVER-SIDE
    =========================================================*/
    async processOrder(data, authenticatedUserId = null) {
        const {
            showtimeId,
            selectedSeats,
            selectedFoods,
            customerEmail,
            customerName,
            customerPhone,
            couponId,
            ownerToken
        } = data;

        /*=====================================================
            ✅ VALIDATE CƠ BẢN
        =====================================================*/

        // ✅ userId từ JWT
        if (!authenticatedUserId) {
            throw new Error("Vui lòng đăng nhập để đặt vé");
        }
        const userId = authenticatedUserId;

        if (!showtimeId) {
            throw new Error("showtimeId không hợp lệ");
        }

        if (!selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
            throw new Error("Vui lòng chọn ít nhất một ghế");
        }

        if (selectedSeats.length > 8) {
            throw new Error("Bạn chỉ được chọn tối đa 8 ghế");
        }

        if (!ownerToken) {
            throw new Error("Không xác định được phiên giữ ghế. Vui lòng chọn ghế lại.");
        }

        /*=====================================================
            ✅ QUERY SHOWTIME + ROOM + CINEMA + MOVIE
        =====================================================*/

        const [showtimeRows] = await db.execute(`
            SELECT 
                sh.showtime_id,
                sh.movie_id,
                sh.room_id, 
                sh.cinema_id, 
                sh.start_time,
                r.room_name,
                r.room_type,
                c.cinema_name,
                m.title AS movie_title,
                m.movie_poster,
                m.age_rating
            FROM showtimes sh
            LEFT JOIN rooms r ON sh.room_id = r.room_id
            LEFT JOIN cinemas c ON sh.cinema_id = c.cinema_id
            LEFT JOIN movies m ON sh.movie_id = m.movie_id
            WHERE sh.showtime_id = ?
            LIMIT 1
        `, [showtimeId]);

        if (!showtimeRows.length) {
            throw new Error("Không tìm thấy suất chiếu");
        }

        const showtime = showtimeRows[0];
        const room_id = showtime.room_id;
        const cinema_id = showtime.cinema_id;
        const roomName = showtime.room_name;
        const roomType = showtime.room_type;
        const finalCinemaName = showtime.cinema_name;
        const finalMovieTitle = showtime.movie_title;
        const finalMoviePoster = showtime.movie_poster || "";
        const finalStartTime = showtime.start_time;

        /*=====================================================
            ✅ VERIFY GHẾ THUỘC ĐÚNG ROOM + CINEMA
        =====================================================*/

        const seatIds = [
            ...new Set(
                selectedSeats
                    .map(s => Number(s.seat_id))
                    .filter(Number.isInteger)
                    .filter(id => id > 0)
            )
        ].sort((a, b) => a - b);

        if (seatIds.length !== selectedSeats.length) {
            throw new Error("Danh sách ghế có ID trùng hoặc không hợp lệ");
        }

        const placeholders = seatIds.map(() => "?").join(", ");

        const [seatRows] = await db.execute(`
            SELECT 
                seat_id, 
                room_id, 
                cinema_id,
                seat_row, 
                seat_number, 
                seat_type,
                is_active
            FROM seats
            WHERE seat_id IN (${placeholders})
        `, seatIds);

        if (seatRows.length !== seatIds.length) {
            throw new Error("Một số ghế không tồn tại trong hệ thống");
        }

        for (const seat of seatRows) {
            if (Number(seat.room_id) !== Number(room_id) ||
                Number(seat.cinema_id) !== Number(cinema_id)) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} không thuộc suất chiếu này`);
            }

            if (Number(seat.is_active) !== 1) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} đang bảo trì`);
            }
        }

        /*=====================================================
            ✅ TÍNH GIÁ VÉ TỪ price_config
        =====================================================*/

        const timeSlot = getTimeSlot(finalStartTime);
        const dayType = getDayType(finalStartTime);

        let seatSubtotal = 0;
        const verifiedSeats = [];

        for (const seat of seatRows) {
            const [priceRows] = await db.execute(`
                SELECT price
                FROM price_config
                WHERE room_type = ?
                  AND time_slot = ?
                  AND day_type = ?
                  AND seat_type = ?
                  AND status = 1
                LIMIT 1
            `, [roomType, timeSlot, dayType, seat.seat_type]);

            if (!priceRows.length) {
                throw new Error(`Không tìm thấy giá vé cho ghế ${seat.seat_row}${seat.seat_number} (${seat.seat_type})`);
            }

            const seatPrice = Number(priceRows[0].price);
            seatSubtotal += seatPrice;

            verifiedSeats.push({
                seat_id: seat.seat_id,
                seat_row: seat.seat_row,
                seat_number: seat.seat_number,
                seat_type: seat.seat_type,
                price: seatPrice
            });
        }

        console.log(`💰 [MOMO] Seat subtotal: ${seatSubtotal}`);

        /*=====================================================
            ✅ TÍNH GIÁ FOOD TỪ product_menu
        =====================================================*/

        let foodSubtotal = 0;
        const verifiedFoods = [];

        if (selectedFoods && Array.isArray(selectedFoods) && selectedFoods.length > 0) {
            const foodIds = [
                ...new Set(
                    selectedFoods
                        .map(f => Number(f.product_id))
                        .filter(Number.isInteger)
                        .filter(id => id > 0)
                )
            ];

            if (foodIds.length > 0) {
                const foodPlaceholders = foodIds.map(() => "?").join(", ");

                const [foodRows] = await db.execute(`
                    SELECT product_id, product_name, price, status
                    FROM product_menu
                    WHERE product_id IN (${foodPlaceholders})
                `, foodIds);

                const foodMap = new Map(foodRows.map(f => [Number(f.product_id), f]));

                for (const item of selectedFoods) {
                    const productId = Number(item.product_id);
                    const quantity = Number(item.quantity) || 1;

                    if (quantity < 1 || quantity > 20) {
                        throw new Error("Số lượng món không hợp lệ");
                    }

                    const dbFood = foodMap.get(productId);

                    if (!dbFood) {
                        throw new Error(`Món ăn ID ${productId} không tồn tại`);
                    }

                    if (Number(dbFood.status) !== 1) {
                        throw new Error(`Món "${dbFood.product_name}" đang tạm ngừng bán`);
                    }

                    const foodPrice = Number(dbFood.price);
                    foodSubtotal += foodPrice * quantity;

                    verifiedFoods.push({
                        product_id: dbFood.product_id,
                        product_name: dbFood.product_name,
                        price: foodPrice,
                        quantity
                    });
                }
            }
        }

        console.log(`💰 [MOMO] Food subtotal: ${foodSubtotal}`);

        /*=====================================================
            ✅ VERIFY COUPON
        =====================================================*/

        let couponDiscount = 0;
        let verifiedCouponId = null;

        if (couponId) {
            const [couponRows] = await db.execute(`
                SELECT coupon_id, coupon_code, discount_value, expiry_date
                FROM coupons
                WHERE coupon_id = ?
                LIMIT 1
            `, [couponId]);

            if (!couponRows.length) {
                throw new Error("Mã giảm giá không tồn tại");
            }

            const coupon = couponRows[0];

            const expiryDate = new Date(coupon.expiry_date);
            if (expiryDate < new Date()) {
                throw new Error("Mã giảm giá đã hết hạn");
            }

            couponDiscount = Number(coupon.discount_value) || 0;
            verifiedCouponId = coupon.coupon_id;
        }

        /*=====================================================
            ✅ TÍNH TOTAL (SERVER-SIDE)
        =====================================================*/

        let totalAmount = seatSubtotal + foodSubtotal - couponDiscount;
        if (totalAmount < 0) totalAmount = 0;

        console.log(`💰 [MOMO] TOTAL: ${totalAmount}`);

        /*=====================================================
            ✅ CHECK GHẾ CHƯA ĐƯỢC ĐẶT
        =====================================================*/

        for (const seat of verifiedSeats) {
            const [existing] = await db.execute(`
                SELECT t.ticket_id 
                FROM tickets t 
                JOIN bookings b ON t.booking_id = b.booking_id 
                WHERE t.showtime_id = ? AND t.cinema_id = ? 
                  AND t.room_id = ? AND t.seat_id = ? 
                  AND b.status = 'Completed'
                LIMIT 1
            `, [showtimeId, cinema_id, room_id, seat.seat_id]);

            if (existing.length > 0) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} đã được đặt.`);
            }
        }

        /*=====================================================
            ✅ VERIFY SEAT LOCKS
        =====================================================*/

        for (const seat of verifiedSeats) {
            const lock = await CacheService.getSeatLock(showtimeId, seat.seat_id);

            if (!lock.locked) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} không còn được giữ. Vui lòng chọn lại ghế.`);
            }

            if (lock.ownerToken !== ownerToken) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} đang được người khác giữ.`);
            }

            if (!lock.ttl || lock.ttl <= 0) {
                throw new Error(`Thời gian giữ ghế ${seat.seat_row}${seat.seat_number} đã hết.`);
            }
        }

        /*=====================================================
            ✅ TẠO TEMP BOOKING + QR MOMO
        =====================================================*/

        const tempBookingId = crypto.randomBytes(8).toString("hex").toUpperCase();
        const momoResult = await this.createMomoQR(totalAmount, tempBookingId);

        const tempData = {
            tempBookingId,
            userId,
            showtimeId,
            room_id,
            roomName,
            roomType,
            cinema_id,
            totalAmount,
            couponId: verifiedCouponId,
            couponDiscount,
            seatSubtotal,
            foodSubtotal,
            selectedSeats: verifiedSeats,
            selectedFoods: verifiedFoods,
            customerEmail,
            customerName,
            customerPhone,
            movieTitle: finalMovieTitle,
            moviePoster: finalMoviePoster,
            cinemaName: finalCinemaName,
            startTime: finalStartTime,
            ownerToken,
            momo: {
                orderId: momoResult.orderId,
                requestId: momoResult.requestId,
                payUrl: momoResult.payUrl,
                qrCodeUrl: momoResult.qrCodeUrl
            },
            status: "pending",
            createdAt: Date.now()
        };

        await CacheService.set(`temp:${tempBookingId}`, tempData, TEMP_BOOKING_TTL);

        return {
            tempBookingId,
            momoQR: momoResult.payUrl,
            qrCodeUrl: momoResult.qrCodeUrl,
            expiresIn: TEMP_BOOKING_TTL
        };
    }

    /*=========================================================
        2. CREATE MOMO QR
    =========================================================*/
    async createMomoQR(amount, tempBookingId) {
        const { partnerCode, accessKey, secretKey, redirectUrl, ipnUrl, endpoint } = MOMO_CONFIG;
        const requestId = partnerCode + Date.now();
        const orderId = `TEMP-${tempBookingId}`;
        const orderInfo = `Thanh toán vé Cinema Star #${tempBookingId}`;
        const requestType = "payWithMethod";
        const extraData = "";

        const rawSignature =
            `accessKey=${accessKey}` +
            `&amount=${amount}` +
            `&extraData=${extraData}` +
            `&ipnUrl=${ipnUrl}` +
            `&orderId=${orderId}` +
            `&orderInfo=${orderInfo}` +
            `&partnerCode=${partnerCode}` +
            `&redirectUrl=${redirectUrl}` +
            `&requestId=${requestId}` +
            `&requestType=${requestType}`;

        const signature = crypto
            .createHmac("sha256", secretKey)
            .update(rawSignature)
            .digest("hex");

        const response = await axios.post(endpoint, {
            partnerCode,
            accessKey,
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            extraData,
            requestType,
            signature,
            lang: "vi"
        });

        return response.data;
    }

    /*=========================================================
        3. SEND OTP PAYMENT
    =========================================================*/
    async sendPaymentOTP(email, tempBookingId) {
        if (!email?.trim()) {
            throw { statusCode: 400, message: "Email không được để trống" };
        }

        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);
        if (!tempData) {
            throw { statusCode: 404, message: "Phiên đặt vé đã hết hạn. Vui lòng đặt lại." };
        }

        const rateLimit = await CacheService.checkRateLimit(email, "momo-send", 1, 60);
        if (!rateLimit.allowed) {
            throw {
                statusCode: 429,
                message: `Bạn đã gửi OTP quá nhanh. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 60} giây.`,
                data: { remainingSeconds: rateLimit.remainingSeconds || 60 }
            };
        }

        await CacheService.markOTPAsUsed(email, PURPOSE.PAYMENT);
        const otpResult = await OtpService.createOTP(email, PURPOSE.PAYMENT);
        const serverTime = Date.now();

        const updatedData = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;
        updatedData.otp = otpResult.otp;
        updatedData.otpCreatedAt = Date.now();
        await CacheService.set(key, updatedData, 300);

        await MailService.sendPaymentOTP(email, otpResult.otp, updatedData.customerName, updatedData.totalAmount)
            .then(() => console.log(`✅ MoMo OTP email sent to ${email}`))
            .catch(err => console.error(`❌ MoMo OTP email failed: ${err.message}`));

        const otpKey = `otp:${email}:${PURPOSE.PAYMENT}`;
        const ttl = await CacheService.getTTL(otpKey);

        return {
            success: true,
            message: "Mã OTP đã được gửi tới email.",
            data: {
                expiresIn: ttl > 0 ? ttl : 300,
                serverTime: serverTime
            }
        };
    }

    /*=========================================================
        4. VERIFY OTP + COMMIT
    =========================================================*/
    async verifyOTPAndCommit(email, otp, tempBookingId) {
        const verifyResult = await OtpService.verifyOTP(email, otp, PURPOSE.PAYMENT, true);
        if (!verifyResult.success) {
            throw {
                statusCode: 400,
                message: verifyResult.message,
                code: verifyResult.code,
                data: verifyResult.data
            };
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const key = `temp:${tempBookingId}`;
            let tempData = await CacheService.get(key);
            if (!tempData) {
                throw new Error("Phiên đặt vé đã hết hạn. Vui lòng đặt lại.");
            }
            tempData = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;

            const {
                userId,
                showtimeId,
                room_id,
                cinema_id,
                totalAmount,
                couponId,
                selectedSeats,
                selectedFoods,
                customerEmail,
                customerName,
                customerPhone,
                movieTitle,
                moviePoster,
                cinemaName,
                startTime
            } = tempData;

            for (const seat of selectedSeats) {
                const [existing] = await connection.execute(
                    `SELECT t.ticket_id 
                     FROM tickets t 
                     JOIN bookings b ON t.booking_id = b.booking_id 
                     WHERE t.showtime_id = ? AND t.cinema_id = ? 
                       AND t.room_id = ? AND t.seat_id = ? 
                       AND b.status = 'Completed'`,
                    [showtimeId, cinema_id, room_id, seat.seat_id]
                );

                if (existing.length > 0) {
                    throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} đã được đặt.`);
                }
            }

            const memo = `MOMO${Date.now()}`;
            const [bookingResult] = await connection.execute(
                `INSERT INTO bookings (user_id, showtime_id, total_amount, coupon_id, status, booking_date, memo, email)
                 VALUES (?, ?, ?, ?, 'Completed', NOW(), ?, ?)`,
                [userId, showtimeId, totalAmount, couponId || null, memo, customerEmail]
            );
            const bookingId = bookingResult.insertId;

            const insertedTicketCodes = [];

            for (const seat of selectedSeats) {
                await connection.execute(
                    `INSERT INTO booking_details (booking_id, seat_id, price, item_name, quantity)
                     VALUES (?, ?, ?, ?, 1)`,
                    [bookingId, seat.seat_id, seat.price, `Ghế ${seat.seat_row}${seat.seat_number}`]
                );

                const ticketCode = `TIC-${bookingId}-${seat.seat_id}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
                insertedTicketCodes.push(ticketCode);

                await connection.execute(
                    `INSERT INTO tickets (booking_id, showtime_id, room_id, cinema_id, seat_id, ticket_code, price, seat_status, ticket_status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'Booked', 'Valid', NOW())`,
                    [bookingId, showtimeId, room_id, cinema_id, seat.seat_id, ticketCode, seat.price]
                );
            }

            if (selectedFoods && selectedFoods.length > 0) {
                for (const food of selectedFoods) {
                    await connection.execute(
                        `INSERT INTO booking_details (booking_id, product_id, item_name, quantity, price)
                         VALUES (?, ?, ?, ?, ?)`,
                        [bookingId, food.product_id, food.product_name, food.quantity, food.price]
                    );
                }
            }

            let earnedPoints = 0;
            if (userId && totalAmount > 0) {
                const points = Math.floor(totalAmount * 0.05);
                if (points > 0) {
                    await connection.execute(
                        `UPDATE users SET points = points + ? WHERE user_id = ?`,
                        [points, userId]
                    );
                    earnedPoints = points;
                }
            }

            await CacheService.delete(key);

            await connection.commit();

            setImmediate(async () => {
                try {
                    const order = await BookingService.getBookingDetail(connection, bookingId);
                    const foods = await BookingService.getFoodDetail(connection, bookingId);

                    const foodString = foods.length
                        ? foods.map(f => `${f.item_name} (x${f.quantity})`).join(", ")
                        : "Không có";

                    const firstTicketCode = insertedTicketCodes[0] || null;

                    const qrUrl = firstTicketCode
                        ? `https://admin.quangdungcinema.id.vn/check-in/${firstTicketCode}`
                        : null;

                    const ticketData = {
                        bookingId: bookingId,
                        customerName: order.full_name || customerName,
                        movieTitle: order.movie_name || movieTitle,
                        moviePoster: order.movie_poster || moviePoster,
                        posterPath: order.movie_poster || moviePoster,
                        cinemaName: order.cinema_name || cinemaName,
                        roomName: order.room_name || tempData.roomName || "---",
                        startTime: order.start_time
                            ? order.start_time.split(" ")[1]?.substring(0, 5)
                            : startTime || "---",
                        selectedDate: order.start_time
                            ? order.start_time.split(" ")[0].split("-").reverse().join("/")
                            : "---",
                        seatLabel: order.seat_label || selectedSeats.map(s => `${s.seat_row}${s.seat_number}`).join(", "),
                        selectedFoods: foodString,
                        earnedPoints: earnedPoints,
                        ticketPIN: firstTicketCode || order.pin || (order.memo ? order.memo.slice(-6) : ""),
                        ticketCode: firstTicketCode,
                        qrUrl: qrUrl,
                    };

                    await MailService.sendTicketEmail({
                        email: customerEmail,
                        ...ticketData,
                    });

                    console.log(`✅ [MoMo] Ticket email sent for booking ${bookingId}`);
                } catch (err) {
                    console.error(`❌ [MoMo] Send ticket email failed: ${err.message}`);
                }
            });

            return {
                success: true,
                bookingId: bookingId,
                message: "Thanh toán thành công!"
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /*=========================================================
        5. RESEND OTP
    =========================================================*/
    async resendOtpPayment(email, tempBookingId) {
        if (!email?.trim()) {
            throw { statusCode: 400, message: "Email không được để trống" };
        }

        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);
        if (!tempData) {
            throw { statusCode: 404, message: "Phiên đặt vé đã hết hạn. Vui lòng đặt lại." };
        }

        const rateLimit = await CacheService.checkRateLimit(email, "momo-resend", 3, 300);
        if (!rateLimit.allowed) {
            throw {
                statusCode: 429,
                message: `Bạn chỉ được gửi tối đa 3 lần trong 5 phút. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
                data: { remainingSeconds: rateLimit.remainingSeconds || 300, maxAttempts: 3 }
            };
        }

        await CacheService.markOTPAsUsed(email, PURPOSE.PAYMENT);
        const otpResult = await OtpService.createOTP(email, PURPOSE.PAYMENT);
        const serverTime = Date.now();

        const updatedData = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;
        updatedData.otp = otpResult.otp;
        updatedData.otpCreatedAt = Date.now();
        await CacheService.set(key, updatedData, 300);

        await MailService.sendPaymentOTP(email, otpResult.otp, updatedData.customerName, updatedData.totalAmount)
            .then(() => console.log(`✅ MoMo OTP resent to ${email}`))
            .catch(err => console.error(`❌ MoMo OTP resend failed: ${err.message}`));

        const otpKey = `otp:${email}:${PURPOSE.PAYMENT}`;
        const ttl = await CacheService.getTTL(otpKey);

        return {
            success: true,
            message: "Mã OTP đã được gửi lại tới email.",
            data: {
                expiresIn: ttl > 0 ? ttl : 300,
                maxAttempts: 3,
                remainingAttempts: 3,
                serverTime: serverTime
            }
        };
    }

    /*=========================================================
        6. CHECK TTL
    =========================================================*/
    async checkTTL(tempBookingId) {
        if (!tempBookingId) {
            throw { statusCode: 400, message: "Thiếu tempBookingId" };
        }

        const key = `temp:${tempBookingId}`;
        const ttl = await CacheService.getTTL(key);
        const data = await CacheService.get(key);

        return {
            success: true,
            data: {
                exists: !!data,
                expiresIn: ttl > 0 ? ttl : 0,
                purpose: 'PAYMENT'
            }
        };
    }

    /*=========================================================
        7. CANCEL BOOKING
    =========================================================*/
    async cancelBooking(tempBookingId) {
        if (!tempBookingId) {
            throw { statusCode: 400, message: "Thiếu tempBookingId" };
        }

        const key = `temp:${tempBookingId}`;
        const deleted = await CacheService.delete(key);

        return {
            success: true,
            message: deleted ? "Đã hủy phiên đặt vé." : "Không tìm thấy phiên đặt vé."
        };
    }

    /*=========================================================
        8. MOMO CALLBACK — ✅ VERIFY SIGNATURE
    =========================================================*/
    async handleCallback(reqBody) {
        try {
            const {
                partnerCode,
                orderId,
                requestId,
                amount,
                orderInfo,
                orderType,
                transId,
                resultCode,
                message,
                payType,
                responseTime,
                extraData,
                signature
            } = reqBody;

            /*=====================================================
                ✅ VERIFY SIGNATURE TỪ MOMO
            =====================================================*/

            if (!signature) {
                console.warn("🚫 [MOMO] Callback missing signature");
                return false;
            }

            const { accessKey, secretKey } = MOMO_CONFIG;

            const rawSignature =
                `accessKey=${accessKey}` +
                `&amount=${amount}` +
                `&extraData=${extraData}` +
                `&message=${message}` +
                `&orderId=${orderId}` +
                `&orderInfo=${orderInfo}` +
                `&orderType=${orderType}` +
                `&partnerCode=${partnerCode}` +
                `&payType=${payType}` +
                `&requestId=${requestId}` +
                `&responseTime=${responseTime}` +
                `&resultCode=${resultCode}` +
                `&transId=${transId}`;

            const expectedSignature = crypto
                .createHmac("sha256", secretKey)
                .update(rawSignature)
                .digest("hex");

            if (signature !== expectedSignature) {
                console.warn(`🚫 [MOMO] Invalid signature. Got: ${signature}, Expected: ${expectedSignature}`);
                return false;
            }

            console.log(`✅ [MOMO] Signature verified for orderId=${orderId}`);

            /*=====================================================
                CHECK RESULT CODE
            =====================================================*/

            if (resultCode !== 0) {
                console.log(`❌ MoMo callback failed: orderId=${orderId}, resultCode=${resultCode}`);
                return false;
            }

            /*=====================================================
                UPDATE CACHE
            =====================================================*/

            const tempBookingId = orderId.replace('TEMP-', '');
            const key = `temp:${tempBookingId}`;
            const tempData = await CacheService.get(key);

            if (!tempData) {
                console.log(`❌ Temp booking ${tempBookingId} not found in Cache`);
                return false;
            }

            const data = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;

            // ✅ Verify amount khớp
            if (Number(amount) !== Number(data.totalAmount)) {
                console.warn(`🚫 [MOMO] Amount mismatch: callback=${amount}, expected=${data.totalAmount}`);
                return false;
            }

            data.momo.status = 'paid';
            data.momo.paidAt = new Date().toISOString();
            data.momo.transId = transId;
            await CacheService.set(key, data, 300);

            console.log(`✅ MoMo payment successful for temp booking ${tempBookingId}`);
            return true;

        } catch (error) {
            console.error("❌ [MOMO] handleCallback error:", error.message);
            return false;
        }
    }
}

module.exports = new MomoService();