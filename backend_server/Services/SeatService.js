const db = require("../Config/db");  // 👈 ĐÃ THÊM
const SeatRepository = require("../Repositories/SeatRepository");
const PriceConfigService = require("./PriceConfigService");


// ==========================================================
// CẤU HÌNH GHẾ THEO TỪNG LOẠI PHÒNG
// ==========================================================
//
// 🔥 QUAN TRỌNG: Giá cứng trong ROOM_CONFIG đã được XÓA
// Giá sẽ được lấy từ price_config thông qua PriceConfigService
// ==========================================================

const ROOM_CONFIG = {

    // ========================================================
    // 2D
    // ========================================================

    "2D": {
        totalSeats: 120,
        seatsPerRow: 10,
        // ❌ XÓA: standardPrice, vipPrice, deluxePrice, reclinerPrice, couplePrice
        standardRows: [0, 1, 2, 3, 4, 5, 6],
        vipRows: [7, 8, 9],
        deluxeRows: [10],
        reclinerRows: [],
        coupleRow: 11
    },


    // ========================================================
    // 3D
    // ========================================================

    "3D": {
        totalSeats: 80,
        seatsPerRow: 10,
        // ❌ XÓA: standardPrice, vipPrice, deluxePrice, reclinerPrice, couplePrice
        standardRows: [0, 1],
        vipRows: [2, 3],
        deluxeRows: [4, 5],
        reclinerRows: [6],
        coupleRow: 7
    },


    // ========================================================
    // 4DMAX
    // ========================================================

    "4DMAX": {
        totalSeats: 64,
        seatsPerRow: 8,
        // ❌ XÓA: standardPrice, vipPrice, deluxePrice, reclinerPrice, couplePrice
        standardRows: [0, 1],
        vipRows: [2, 3],
        deluxeRows: [4, 5],
        reclinerRows: [6],
        coupleRow: 7
    },


    // ========================================================
    // IMAX
    // ========================================================

    "IMAX": {
        totalSeats: 48,
        seatsPerRow: 8,
        // ❌ XÓA: standardPrice, vipPrice, deluxePrice, reclinerPrice, couplePrice
        standardRows: [],
        vipRows: [0, 1],
        deluxeRows: [2, 3],
        reclinerRows: [4],
        coupleRow: 5
    },


    // ========================================================
    // VIP
    // ========================================================

    "VIP": {
        totalSeats: 36,
        seatsPerRow: 6,
        // ❌ XÓA: standardPrice, vipPrice, deluxePrice, reclinerPrice, couplePrice
        standardRows: [],
        vipRows: [0, 1],
        deluxeRows: [2, 3],
        reclinerRows: [4],
        coupleRow: 5
    }
};


// ==========================================================
// SEAT SERVICE
// ==========================================================

class SeatService {


    // ==========================================================
    // PUBLIC - LẤY SƠ ĐỒ GHẾ THEO SUẤT CHIẾU
    // 🔥 LẤY GIÁ TỪ PRICE_CONFIG
    // ==========================================================

    async getSeatMapByShowtime(showtimeId) {
        const roomInfo = await SeatRepository.getRoomInfo(showtimeId);
        if (!roomInfo) {
            const err = new Error("Không tìm thấy suất chiếu");
            err.statusCode = 404;
            throw err;
        }

        const roomId = roomInfo.room_id;
        const seats = await SeatRepository.findSeatsByShowtime(showtimeId, roomId);

        // 👇 Lấy thông tin showtime để biết room_type, start_time, date
        const showtimeInfo = await this.getShowtimeInfo(showtimeId);
        if (!showtimeInfo) {
            return seats;
        }

        const roomType = showtimeInfo.room_type || '2D';
        const startTime = showtimeInfo.start_time ? new Date(showtimeInfo.start_time).toTimeString().slice(0, 8) : '09:00:00';
        const showDate = showtimeInfo.start_time ? new Date(showtimeInfo.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // 🔥 LẤY GIÁ TỪ PRICE_CONFIG CHO TỪNG GHẾ
        const seatsWithPrice = await Promise.all(seats.map(async (seat) => {
            const seatType = seat.seat_type || 'STANDARD';
            
            // Lấy giá từ price_config theo room_type + time_slot + day_type + seat_type
            const price = await PriceConfigService.getPrice(
                roomType,
                startTime,
                showDate,
                seatType
            );
            
            return {
                ...seat,
                price: price
            };
        }));

        return seatsWithPrice;
    }


    // ==========================================================
    // LẤY THÔNG TIN SHOWTIME
    // ==========================================================

    async getShowtimeInfo(showtimeId) {
        // ✅ ĐÃ CÓ db ở đầu file
        const [rows] = await db.query(
            `SELECT s.*, r.room_type 
             FROM showtimes s
             LEFT JOIN rooms r ON s.room_id = r.room_id
             WHERE s.showtime_id = ?`,
            [showtimeId]
        );
        return rows[0] || null;
    }


    // ==========================================================
    // ADMIN - LẤY DANH SÁCH GHẾ THEO PHÒNG
    // ==========================================================

    async getSeatsByRoom(roomId) {
        const seats = await SeatRepository.findSeatsByRoom(roomId);
        console.log(`✅ [SeatService] getSeatsByRoom: ${seats.length} ghế cho room ${roomId}`);
        return seats;
    }


    // ==========================================================
    // ADMIN - KHỞI TẠO GHẾ CHO PHÒNG
    // 🔥 LẤY GIÁ TỪ PRICE_CONFIG KHI TẠO GHẾ
    // ==========================================================

    async initRoomSeats(roomId, roomType, cinemaId) {
        const config = ROOM_CONFIG[roomType];
        if (!config) {
            const err = new Error(`Loại phòng "${roomType}" không được hỗ trợ`);
            err.statusCode = 400;
            throw err;
        }

        const {
            totalSeats,
            seatsPerRow,
            standardRows,
            vipRows,
            deluxeRows,
            reclinerRows,
            coupleRow
        } = config;

        // 🔥 LẤY GIÁ TỪ PRICE_CONFIG
        // Dùng khung giờ mặc định MORNING và WEEKDAY
        const defaultTimeSlot = 'MORNING';
        const defaultDayType = 'WEEKDAY';

        // Lấy giá cho từng loại ghế từ price_config
        const getPriceForSeatType = async (seatType) => {
            try {
                const price = await PriceConfigService.getPrice(
                    roomType,
                    '09:00:00', // startTime mặc định
                    new Date().toISOString().split('T')[0], // ngày hôm nay
                    seatType
                );
                return price;
            } catch (error) {
                console.warn(`⚠️ Không lấy được giá cho ${seatType}, dùng fallback 75000`);
                return 75000;
            }
        };

        // Lấy giá cho từng loại ghế
        const prices = {
            standard: await getPriceForSeatType('STANDARD'),
            vip: await getPriceForSeatType('VIP'),
            deluxe: await getPriceForSeatType('DELUXE'),
            recliner: await getPriceForSeatType('RECLINER'),
            couple: await getPriceForSeatType('COUPLE')
        };

        console.log(`📊 Giá cho phòng ${roomType}:`, prices);

        // Xóa ghế cũ
        await SeatRepository.deleteAllByRoom(roomId);

        const seatsData = [];

        for (let i = 0; i < totalSeats; i++) {
            const rowIndex = Math.floor(i / seatsPerRow);
            const rowLetter = String.fromCharCode(65 + rowIndex);
            const seatNumber = (i % seatsPerRow) + 1;

            let seatType = "STANDARD";
            let price = prices.standard;

            if (rowIndex === coupleRow) {
                seatType = "COUPLE";
                price = prices.couple;
            } else if (reclinerRows.includes(rowIndex)) {
                seatType = "RECLINER";
                price = prices.recliner;
            } else if (deluxeRows.includes(rowIndex)) {
                seatType = "DELUXE";
                price = prices.deluxe;
            } else if (vipRows.includes(rowIndex)) {
                seatType = "VIP";
                price = prices.vip;
            } else if (standardRows.includes(rowIndex)) {
                seatType = "STANDARD";
                price = prices.standard;
            }

            seatsData.push([
                roomId,
                cinemaId,
                rowLetter,
                seatNumber,
                seatType,
                price,
                1
            ]);
        }

        if (seatsData.length > 0) {
            await SeatRepository.bulkInsert(seatsData);
        }

        await SeatRepository.updateRoomTotalSeats(roomId, totalSeats);

        const summary = seatsData.reduce((result, seat) => {
            const type = seat[4];
            if (!result[type]) result[type] = 0;
            result[type]++;
            return result;
        }, {});

        console.log(`✅ [SeatService] Đã tạo ${seatsData.length} ghế cho room ${roomId}`);
        console.log("📊 Phân bố ghế:", summary);

        return {
            totalSeats: seatsData.length,
            seatTypes: summary
        };
    }


    // ==========================================================
    // ADMIN - XÓA SẠCH GHẾ TRONG PHÒNG
    // ==========================================================

    async deleteSeatsByRoom(roomId) {
        try {
            const affected = await SeatRepository.deleteAllByRoom(roomId);
            if (affected === 0) {
                const err = new Error("Không tìm thấy ghế để xóa hoặc phòng trống");
                err.statusCode = 404;
                throw err;
            }
            return affected;
        } catch (err) {
            if (err.code === "ER_ROW_IS_REFERENCED_2") {
                const e = new Error("Không thể xóa vì phòng này đã có dữ liệu vé đặt!");
                e.statusCode = 400;
                throw e;
            }
            throw err;
        }
    }


    // ==========================================================
    // ADMIN - BẬT / TẮT BẢO TRÌ GHẾ
    // ==========================================================

    async toggleSeatActive(seatId, isActive) {
        const normalizedSeatId = Number(seatId);
        if (!Number.isInteger(normalizedSeatId) || normalizedSeatId <= 0) {
            const err = new Error("seatId không hợp lệ");
            err.statusCode = 400;
            throw err;
        }

        const normalizedIsActive = Number(isActive);
        if (normalizedIsActive !== 0 && normalizedIsActive !== 1) {
            const err = new Error("Trạng thái isActive không hợp lệ");
            err.statusCode = 400;
            throw err;
        }

        const affected = await SeatRepository.updateActiveStatus(
            normalizedSeatId,
            normalizedIsActive
        );

        if (affected === 0) {
            const err = new Error("Không tìm thấy ghế");
            err.statusCode = 404;
            throw err;
        }

        return affected;
    }


    // ==========================================================
    // ADMIN - CẬP NHẬT LOẠI GHẾ + GIÁ
    // ==========================================================

    async updateSeatTypeAndPrice(seatId, seatType, price) {
        const normalizedType = seatType?.toUpperCase();

        const allowedTypes = [
            "STANDARD",
            "VIP",
            "DELUXE",
            "RECLINER",
            "COUPLE"
        ];

        if (!allowedTypes.includes(normalizedType)) {
            const err = new Error(`Loại ghế "${seatType}" không hợp lệ`);
            err.statusCode = 400;
            throw err;
        }

        const normalizedPrice = Number(price);
        if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
            const err = new Error("Giá ghế không hợp lệ");
            err.statusCode = 400;
            throw err;
        }

        const affected = await SeatRepository.updateTypeAndPrice(
            seatId,
            normalizedType,
            normalizedPrice
        );

        if (affected === 0) {
            const err = new Error("Không tìm thấy ghế");
            err.statusCode = 404;
            throw err;
        }

        return affected;
    }
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = new SeatService();