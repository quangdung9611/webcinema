const db = require("../Config/db");
const CacheService = require("./CacheService");
const crypto = require("crypto");


/*=========================================================
    CONFIG
=========================================================*/

const TEMP_BOOKING_TTL = 300; // 5 phút
const SEAT_LOCK_TTL = 10 * 60; // 10 phút

const RATE_LIMIT_WINDOW = 300;
const MAX_OTP_ATTEMPTS = 5;


/*=========================================================
    GENERATE TEMP BOOKING ID
=========================================================*/

const generateTempBookingId = () => {
    return crypto
        .randomBytes(8)
        .toString("hex")
        .toUpperCase();
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


/*=========================================================
    PAYMENT SERVICE
=========================================================*/

class PaymentService {

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

        // ✅ FIX LỖ HỔNG 2: userId PHẢI từ JWT, không từ body
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
            ✅ FIX LỖ HỔNG 5: VERIFY GHẾ THUỘC ĐÚNG ROOM + CINEMA
            VÀ LẤY GIÁ TỪ DB (KHÔNG TIN FRONTEND)
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

        // ✅ Check từng ghế thuộc đúng room/cinema của showtime
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
            ✅ FIX LỖ HỔNG 1 + 3: TÍNH GIÁ VÉ TỪ price_config
            (KHÔNG TIN totalAmount + seat.price TỪ FRONTEND)
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
                price: seatPrice  // ✅ Giá từ DB, không từ frontend
            });
        }

        console.log(`💰 [PAYMENT] Seat subtotal: ${seatSubtotal} (timeSlot=${timeSlot}, dayType=${dayType}, roomType=${roomType})`);

        /*=====================================================
            ✅ FIX LỖ HỔNG 4: TÍNH GIÁ FOOD TỪ product_menu
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
                        throw new Error(`Số lượng món không hợp lệ`);
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
                        price: foodPrice,  // ✅ Giá từ DB
                        quantity
                    });
                }
            }
        }

        console.log(`💰 [PAYMENT] Food subtotal: ${foodSubtotal}`);

        /*=====================================================
            ✅ VERIFY COUPON (nếu có)
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

            // Check expiry
            const expiryDate = new Date(coupon.expiry_date);
            if (expiryDate < new Date()) {
                throw new Error("Mã giảm giá đã hết hạn");
            }

            couponDiscount = Number(coupon.discount_value) || 0;
            verifiedCouponId = coupon.coupon_id;

            console.log(`🎟️ [PAYMENT] Coupon ${coupon.coupon_code} - discount: ${couponDiscount}`);
        }

        /*=====================================================
            ✅ TÍNH TOTAL AMOUNT (SERVER-SIDE)
        =====================================================*/

        let totalAmount = seatSubtotal + foodSubtotal - couponDiscount;

        // Không cho âm
        if (totalAmount < 0) totalAmount = 0;

        console.log(`💰 [PAYMENT] TOTAL: ${totalAmount} (seats=${seatSubtotal} + foods=${foodSubtotal} - coupon=${couponDiscount})`);

        /*=====================================================
            KIỂM TRA CACHE SEAT LOCK
        =====================================================*/

        const seatLockResults = await Promise.all(
            verifiedSeats.map(async (seat) => {
                const lock = await CacheService.getSeatLock(showtimeId, seat.seat_id);
                return { seat, lock };
            })
        );

        for (const item of seatLockResults) {
            const { seat, lock } = item;

            if (!lock.locked) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} không còn được giữ. Vui lòng chọn lại ghế.`);
            }

            if (lock.ownerToken !== ownerToken) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} đang được người khác giữ. Vui lòng chọn ghế khác.`);
            }

            if (!lock.ttl || lock.ttl <= 0) {
                throw new Error(`Thời gian giữ ghế ${seat.seat_row}${seat.seat_number} đã hết. Vui lòng chọn lại.`);
            }
        }

        /*=====================================================
            TẠO TEMP BOOKING — DÙNG GIÁ ĐÃ VERIFY
        =====================================================*/

        const tempBookingId = generateTempBookingId();

        const tempData = {
            tempBookingId,
            userId,                              // ✅ Từ JWT
            showtimeId,
            room_id,
            roomName,
            roomType,
            cinema_id,
            totalAmount,                         // ✅ Tính server-side
            couponId: verifiedCouponId,
            couponDiscount,
            seatSubtotal,
            foodSubtotal,
            selectedSeats: verifiedSeats,        // ✅ Giá từ DB
            selectedFoods: verifiedFoods,        // ✅ Giá từ DB
            customerEmail,
            customerName,
            customerPhone,
            movieTitle: finalMovieTitle,
            moviePoster: finalMoviePoster,
            cinemaName: finalCinemaName,
            startTime: finalStartTime,
            ownerToken,
            status: "pending",
            createdAt: Date.now()
        };

        const key = `temp:${tempBookingId}`;
        await CacheService.set(key, tempData, TEMP_BOOKING_TTL);

        console.log(`✅ Temp booking ${tempBookingId} saved (${TEMP_BOOKING_TTL}s)`);
        console.log(`💰 Total amount: ${totalAmount}`);

        return { tempBookingId };
    }


    /*=========================================================
        2. COMMIT TO DATABASE — DÙNG GIÁ ĐÃ VERIFY TRONG CACHE
    =========================================================*/

    async commitToDatabase(connection, tempBookingId) {
        const key = `temp:${tempBookingId}`;

        let tempData = await CacheService.get(key);

        if (!tempData) {
            throw new Error("Phiên đặt vé đã hết hạn. Vui lòng đặt lại.");
        }

        if (typeof tempData === "string") {
            try {
                tempData = JSON.parse(tempData);
            } catch (error) {
                console.error("❌ Parse temp booking error:", error);
                throw new Error("Dữ liệu đặt vé không hợp lệ.");
            }
        }

        const {
            userId,
            showtimeId,
            room_id,
            roomName,
            cinema_id,
            totalAmount,        // ✅ Giá đã verify ở processOrder
            couponId,
            selectedSeats,      // ✅ Ghế đã verify + giá từ DB
            selectedFoods,      // ✅ Food đã verify + giá từ DB
            customerEmail,
            customerName,
            customerPhone,
            movieTitle,
            moviePoster,
            cinemaName,
            startTime,
            ownerToken
        } = tempData;

        if (!ownerToken) {
            throw new Error("Phiên giữ ghế không hợp lệ. Vui lòng chọn ghế lại.");
        }

        if (!selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
            throw new Error("Không tìm thấy ghế trong phiên đặt vé.");
        }

        /*=====================================================
            VERIFY SEAT LOCKS LẦN CUỐI
        =====================================================*/

        const finalSeatLocks = await Promise.all(
            selectedSeats.map(async (seat) => {
                const lock = await CacheService.getSeatLock(showtimeId, seat.seat_id);
                return { seat, lock };
            })
        );

        for (const item of finalSeatLocks) {
            const { seat, lock } = item;

            if (!lock.locked) {
                throw new Error(`Thời gian giữ ghế ${seat.seat_row}${seat.seat_number} đã hết. Vui lòng đặt lại.`);
            }

            if (lock.ownerToken !== ownerToken) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} không còn thuộc phiên đặt vé này.`);
            }

            if (lock.ttl <= 0) {
                throw new Error(`Thời gian giữ ghế ${seat.seat_row}${seat.seat_number} đã hết. Vui lòng đặt lại.`);
            }
        }

        /*=====================================================
            ✅ CHECK GHẾ CHƯA ĐƯỢC ĐẶT (chống race condition)
        =====================================================*/

        for (const seat of selectedSeats) {
            const [existing] = await connection.execute(`
                SELECT t.ticket_id
                FROM tickets t
                INNER JOIN bookings b ON t.booking_id = b.booking_id
                WHERE t.showtime_id = ? 
                  AND t.cinema_id = ? 
                  AND t.room_id = ? 
                  AND t.seat_id = ? 
                  AND b.status = 'Completed'
                LIMIT 1
            `, [showtimeId, cinema_id, room_id, seat.seat_id]);

            if (existing.length > 0) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} đã được đặt. Vui lòng chọn ghế khác.`);
            }
        }

        /*=====================================================
            INSERT BOOKING
        =====================================================*/

        const memo = `DUNG${Date.now()}`;

        const [bookingResult] = await connection.execute(`
            INSERT INTO bookings (user_id, showtime_id, total_amount, coupon_id, status, booking_date, memo, email)
            VALUES (?, ?, ?, ?, 'Completed', NOW(), ?, ?)
        `, [userId, showtimeId, totalAmount, couponId || null, memo, customerEmail]);

        const bookingId = bookingResult.insertId;

        /*=====================================================
            INSERT BOOKING DETAILS + TICKETS
        =====================================================*/

        for (const seat of selectedSeats) {
            await connection.execute(`
                INSERT INTO booking_details (booking_id, seat_id, price, item_name, quantity)
                VALUES (?, ?, ?, ?, 1)
            `, [bookingId, seat.seat_id, seat.price, `Ghế ${seat.seat_row}${seat.seat_number}`]);

            const ticketCode = `TIC-${bookingId}-${seat.seat_id}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

            await connection.execute(`
                INSERT INTO tickets (booking_id, showtime_id, room_id, cinema_id, seat_id, ticket_code, price, seat_status, ticket_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Booked', 'Valid', NOW())
            `, [bookingId, showtimeId, room_id, cinema_id, seat.seat_id, ticketCode, seat.price]);
        }

        /*=====================================================
            INSERT FOODS
        =====================================================*/

        if (selectedFoods && Array.isArray(selectedFoods) && selectedFoods.length > 0) {
            for (const food of selectedFoods) {
                await connection.execute(`
                    INSERT INTO booking_details (booking_id, product_id, item_name, quantity, price)
                    VALUES (?, ?, ?, ?, ?)
                `, [bookingId, food.product_id, food.product_name, food.quantity, food.price]);
            }
        }

        /*=====================================================
            TÍNH ĐIỂM
        =====================================================*/

        let earnedPoints = 0;

        if (userId && totalAmount > 0) {
            const points = Math.floor(totalAmount * 0.05);

            if (points > 0) {
                await connection.execute(`
                    UPDATE users SET points = points + ? WHERE user_id = ?
                `, [points, userId]);
                earnedPoints = points;
            }
        }

        await CacheService.delete(key);

        console.log(`✅ Booking ${bookingId} committed successfully (total: ${totalAmount})`);

        return {
            bookingId,
            memo,
            userId,
            showtimeId,
            room_id,
            roomName,
            cinema_id,
            totalAmount,
            customerEmail,
            customerName,
            customerPhone,
            movieTitle,
            moviePoster,
            cinemaName,
            startTime,
            selectedSeats,
            selectedFoods,
            earnedPoints,
            ownerToken
        };
    }


    /*=========================================================
        3. RELEASE SEAT LOCKS
    =========================================================*/

    async releaseBookingSeatLocks(showtimeId, selectedSeats, ownerToken) {
        if (!showtimeId || !selectedSeats || !Array.isArray(selectedSeats) || !ownerToken) {
            return 0;
        }

        let releasedCount = 0;

        for (const seat of selectedSeats) {
            const released = await CacheService.releaseSeatLock(showtimeId, seat.seat_id, ownerToken);
            if (released) releasedCount++;
        }

        console.log(`🔓 [PAYMENT] Released ${releasedCount}/${selectedSeats.length} seat locks`);
        return releasedCount;
    }


    /*=========================================================
        4. GET TEMP DATA
    =========================================================*/

    async getTempData(tempBookingId) {
        const key = `temp:${tempBookingId}`;
        let tempData = await CacheService.get(key);

        if (!tempData) {
            return null;
        }

        if (typeof tempData === "string") {
            try {
                tempData = JSON.parse(tempData);
            } catch (error) {
                console.error("❌ Parse temp booking error:", error);
                return null;
            }
        }

        return tempData;
    }


    /*=========================================================
        5. DELETE TEMP DATA
    =========================================================*/

    async deleteTempData(tempBookingId) {
        const key = `temp:${tempBookingId}`;
        const deleted = await CacheService.delete(key);

        if (deleted) {
            console.log(`🗑️ Temp booking ${tempBookingId} deleted from Cache`);
        }

        return deleted;
    }


    /*=========================================================
        6. CHECK TEMP BOOKING TTL
    =========================================================*/

    async checkTempBookingTTL(tempBookingId) {
        const key = `temp:${tempBookingId}`;
        const ttl = await CacheService.getTTL(key);
        const data = await CacheService.get(key);

        return {
            success: true,
            data: {
                exists: !!data,
                expiresIn: ttl > 0 ? ttl : 0,
                isExpired: ttl <= 0 || !data
            }
        };
    }


    /*=========================================================
        7. RESEND OTP PAYMENT
    =========================================================*/

    async resendOtpPayment(email, tempBookingId) {
        if (!email?.trim()) {
            throw {
                statusCode: 400,
                field: "email",
                message: "Email không được để trống"
            };
        }

        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);

        if (!tempData) {
            throw {
                statusCode: 404,
                message: "Phiên đặt vé đã hết hạn. Vui lòng đặt lại."
            };
        }

        const rateLimit = await CacheService.checkRateLimit(email, "payment-resend", 3, RATE_LIMIT_WINDOW);

        if (!rateLimit.allowed) {
            throw {
                statusCode: 429,
                message: `Bạn chỉ được gửi tối đa 3 lần trong 5 phút. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
                data: {
                    remainingSeconds: rateLimit.remainingSeconds || 300,
                    maxAttempts: 3
                }
            };
        }

        const OtpService = require("./OtpService");
        await CacheService.markOTPAsUsed(email, OtpService.PURPOSE.PAYMENT);

        const otpResult = await OtpService.createOTP(email, OtpService.PURPOSE.PAYMENT);

        const serverTime = Date.now();

        const updatedData = typeof tempData === "string" ? JSON.parse(tempData) : tempData;
        updatedData.otp = otpResult.otp;
        updatedData.otpCreatedAt = Date.now();

        await CacheService.set(key, updatedData, TEMP_BOOKING_TTL);

        const MailService = require("./MailService");

        await MailService.sendPaymentOTP(email, otpResult.otp, updatedData.customerName, updatedData.totalAmount)
            .then(() => {
                console.log(`✅ Payment OTP email sent to ${email}`);
            })
            .catch((err) => {
                console.error(`❌ Payment OTP email failed: ${err.message}`);
            });

        const otpKey = `otp:${email}:${OtpService.PURPOSE.PAYMENT}`;
        const ttl = await CacheService.getTTL(otpKey);

        return {
            success: true,
            message: "Mã OTP đã được gửi lại tới email.",
            data: {
                expiresIn: ttl > 0 ? ttl : 300,
                serverTime: serverTime
            }
        };
    }
}


/*===========================================================
    EXPORT
===========================================================*/

module.exports = new PaymentService();