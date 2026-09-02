const PriceConfigRepository = require("../Repositories/PriceConfigRepository");

class PriceConfigService {
    // ==========================================================
    // LẤY TẤT CẢ
    // ==========================================================

    async getAll() {
        return await PriceConfigRepository.findAll();
    }

    // ==========================================================
    // LẤY THEO ID
    // ==========================================================

    async getById(id) {
        const config = await PriceConfigRepository.findById(id);
        if (!config) {
            const err = new Error("Không tìm thấy cấu hình giá");
            err.statusCode = 404;
            throw err;
        }
        return config;
    }

    // ==========================================================
    // LẤY THEO ROOM_TYPE + TIME_SLOT + DAY_TYPE + SEAT_TYPE
    // ==========================================================

    async getByRoomTimeDaySeat(roomType, timeSlot, dayType, seatType) {
        const config = await PriceConfigRepository.findByRoomTimeDaySeat(
            roomType,
            timeSlot,
            dayType,
            seatType || 'STANDARD'
        );
        if (!config) {
            // Fallback: nếu không có, dùng STANDARD
            const fallback = await PriceConfigRepository.findByRoomTimeDaySeat(
                roomType,
                timeSlot,
                dayType,
                'STANDARD'
            );
            return fallback?.price || 75000;
        }
        return config.price;
    }

    // ==========================================================
    // LẤY TẤT CẢ THEO ROOM_TYPE + TIME_SLOT + DAY_TYPE
    // ==========================================================

    async getAllByRoomTimeDay(roomType, timeSlot, dayType) {
        return await PriceConfigRepository.findAllByRoomTimeDay(roomType, timeSlot, dayType);
    }

    // ==========================================================
    // LẤY THEO ROOM_TYPE (CŨ)
    // ==========================================================

    async getByRoomType(roomType) {
        return await PriceConfigRepository.findByRoomType(roomType);
    }

    // ==========================================================
    // LẤY TẤT CẢ ACTIVE
    // ==========================================================

    async getAllActive() {
        return await PriceConfigRepository.findAllActive();
    }

    // ==========================================================
    // LẤY DANH SÁCH ROOM_TYPE
    // ==========================================================

    async getDistinctRoomTypes() {
        return await PriceConfigRepository.getDistinctRoomTypes();
    }

    // ==========================================================
    // LẤY DANH SÁCH SEAT_TYPE
    // ==========================================================

    async getDistinctSeatTypes() {
        return await PriceConfigRepository.getDistinctSeatTypes();
    }

    // ==========================================================
    // TẠO MỚI
    // ==========================================================

    async create(data) {
        // Kiểm tra trùng lặp (có seat_type)
        const isDuplicate = await PriceConfigRepository.checkDuplicate(
            data.room_type,
            data.time_slot,
            data.day_type,
            data.seat_type || 'STANDARD'
        );
        if (isDuplicate) {
            const err = new Error(
                `Cấu hình giá cho ${data.room_type} - ${data.time_slot} - ${data.day_type} - ${data.seat_type || 'STANDARD'} đã tồn tại`
            );
            err.statusCode = 400;
            throw err;
        }

        return await PriceConfigRepository.create(data);
    }

    // ==========================================================
    // CẬP NHẬT
    // ==========================================================

    async update(id, data) {
        const config = await PriceConfigRepository.findById(id);
        if (!config) {
            const err = new Error("Không tìm thấy cấu hình giá");
            err.statusCode = 404;
            throw err;
        }

        // Kiểm tra trùng lặp khi update
        if (data.room_type && data.time_slot && data.day_type && data.seat_type) {
            const isDuplicate = await PriceConfigRepository.checkDuplicate(
                data.room_type,
                data.time_slot,
                data.day_type,
                data.seat_type
            );
            if (isDuplicate) {
                const existing = await PriceConfigRepository.findByRoomTimeDaySeat(
                    data.room_type,
                    data.time_slot,
                    data.day_type,
                    data.seat_type
                );
                // Nếu tìm thấy và không phải chính nó
                if (existing && existing.price_config_id && existing.price_config_id !== parseInt(id)) {
                    const err = new Error(
                        `Cấu hình giá cho ${data.room_type} - ${data.time_slot} - ${data.day_type} - ${data.seat_type} đã tồn tại`
                    );
                    err.statusCode = 400;
                    throw err;
                }
            }
        }

        return await PriceConfigRepository.update(id, data);
    }

    // ==========================================================
    // CẬP NHẬT STATUS
    // ==========================================================

    async updateStatus(id, status) {
        const config = await PriceConfigRepository.findById(id);
        if (!config) {
            const err = new Error("Không tìm thấy cấu hình giá");
            err.statusCode = 404;
            throw err;
        }
        return await PriceConfigRepository.updateStatus(id, status);
    }

    // ==========================================================
    // XÓA
    // ==========================================================

    async delete(id) {
        const config = await PriceConfigRepository.findById(id);
        if (!config) {
            const err = new Error("Không tìm thấy cấu hình giá");
            err.statusCode = 404;
            throw err;
        }
        return await PriceConfigRepository.delete(id);
    }

    // ==========================================================
    // SEED DỮ LIỆU MẶC ĐỊNH (CÓ SEAT_TYPE)
    // ==========================================================

    async seedDefaultPrices() {
        const existing = await PriceConfigRepository.findAll();
        if (existing.length > 0) {
            return { message: "Dữ liệu giá đã tồn tại, không seed thêm", count: 0 };
        }

        const defaultPrices = [
            // ================================================
            // 2D - WEEKDAY
            // ================================================
            { room_type: '2D', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 50000 },
            { room_type: '2D', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'VIP', price: 75000 },
            { room_type: '2D', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 100000 },
            { room_type: '2D', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 125000 },
            { room_type: '2D', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 150000 },
            { room_type: '2D', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 65000 },
            { room_type: '2D', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'VIP', price: 97500 },
            { room_type: '2D', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 130000 },
            { room_type: '2D', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 162500 },
            { room_type: '2D', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 195000 },
            { room_type: '2D', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 75000 },
            { room_type: '2D', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'VIP', price: 112500 },
            { room_type: '2D', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 150000 },
            { room_type: '2D', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 187500 },
            { room_type: '2D', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 225000 },
            { room_type: '2D', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 80000 },
            { room_type: '2D', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'VIP', price: 120000 },
            { room_type: '2D', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 160000 },
            { room_type: '2D', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 200000 },
            { room_type: '2D', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 240000 },

            // ================================================
            // 2D - WEEKEND
            // ================================================
            { room_type: '2D', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 60000 },
            { room_type: '2D', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'VIP', price: 90000 },
            { room_type: '2D', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 120000 },
            { room_type: '2D', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 150000 },
            { room_type: '2D', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 180000 },
            { room_type: '2D', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 78000 },
            { room_type: '2D', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'VIP', price: 117000 },
            { room_type: '2D', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 156000 },
            { room_type: '2D', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 195000 },
            { room_type: '2D', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 234000 },
            { room_type: '2D', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 90000 },
            { room_type: '2D', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'VIP', price: 135000 },
            { room_type: '2D', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 180000 },
            { room_type: '2D', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 225000 },
            { room_type: '2D', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 270000 },
            { room_type: '2D', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 96000 },
            { room_type: '2D', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'VIP', price: 144000 },
            { room_type: '2D', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 192000 },
            { room_type: '2D', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 240000 },
            { room_type: '2D', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 288000 },

            // ================================================
            // VIP - WEEKDAY
            // ================================================
            { room_type: 'VIP', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 80000 },
            { room_type: 'VIP', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'VIP', price: 120000 },
            { room_type: 'VIP', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 160000 },
            { room_type: 'VIP', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 200000 },
            { room_type: 'VIP', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 240000 },
            { room_type: 'VIP', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 95000 },
            { room_type: 'VIP', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'VIP', price: 142500 },
            { room_type: 'VIP', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 190000 },
            { room_type: 'VIP', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 237500 },
            { room_type: 'VIP', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 285000 },
            { room_type: 'VIP', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 110000 },
            { room_type: 'VIP', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'VIP', price: 165000 },
            { room_type: 'VIP', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 220000 },
            { room_type: 'VIP', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 275000 },
            { room_type: 'VIP', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 330000 },
            { room_type: 'VIP', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 115000 },
            { room_type: 'VIP', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'VIP', price: 172500 },
            { room_type: 'VIP', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 230000 },
            { room_type: 'VIP', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 287500 },
            { room_type: 'VIP', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 345000 },

            // ================================================
            // VIP - WEEKEND
            // ================================================
            { room_type: 'VIP', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 96000 },
            { room_type: 'VIP', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'VIP', price: 144000 },
            { room_type: 'VIP', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 192000 },
            { room_type: 'VIP', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 240000 },
            { room_type: 'VIP', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 288000 },
            { room_type: 'VIP', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 114000 },
            { room_type: 'VIP', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'VIP', price: 171000 },
            { room_type: 'VIP', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 228000 },
            { room_type: 'VIP', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 285000 },
            { room_type: 'VIP', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 342000 },
            { room_type: 'VIP', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 132000 },
            { room_type: 'VIP', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'VIP', price: 198000 },
            { room_type: 'VIP', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 264000 },
            { room_type: 'VIP', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 330000 },
            { room_type: 'VIP', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 396000 },
            { room_type: 'VIP', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 138000 },
            { room_type: 'VIP', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'VIP', price: 207000 },
            { room_type: 'VIP', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 276000 },
            { room_type: 'VIP', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 345000 },
            { room_type: 'VIP', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 414000 },

            // ================================================
            // 3D - WEEKDAY
            // ================================================
            { room_type: '3D', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 80000 },
            { room_type: '3D', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'VIP', price: 120000 },
            { room_type: '3D', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 160000 },
            { room_type: '3D', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 200000 },
            { room_type: '3D', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 240000 },
            { room_type: '3D', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 95000 },
            { room_type: '3D', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'VIP', price: 142500 },
            { room_type: '3D', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 190000 },
            { room_type: '3D', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 237500 },
            { room_type: '3D', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 285000 },
            { room_type: '3D', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 110000 },
            { room_type: '3D', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'VIP', price: 165000 },
            { room_type: '3D', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 220000 },
            { room_type: '3D', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 275000 },
            { room_type: '3D', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 330000 },
            { room_type: '3D', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 115000 },
            { room_type: '3D', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'VIP', price: 172500 },
            { room_type: '3D', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 230000 },
            { room_type: '3D', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 287500 },
            { room_type: '3D', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 345000 },

            // ================================================
            // 3D - WEEKEND
            // ================================================
            { room_type: '3D', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 96000 },
            { room_type: '3D', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'VIP', price: 144000 },
            { room_type: '3D', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 192000 },
            { room_type: '3D', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 240000 },
            { room_type: '3D', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 288000 },
            { room_type: '3D', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 114000 },
            { room_type: '3D', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'VIP', price: 171000 },
            { room_type: '3D', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 228000 },
            { room_type: '3D', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 285000 },
            { room_type: '3D', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 342000 },
            { room_type: '3D', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 132000 },
            { room_type: '3D', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'VIP', price: 198000 },
            { room_type: '3D', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 264000 },
            { room_type: '3D', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 330000 },
            { room_type: '3D', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 396000 },
            { room_type: '3D', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 138000 },
            { room_type: '3D', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'VIP', price: 207000 },
            { room_type: '3D', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 276000 },
            { room_type: '3D', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 345000 },
            { room_type: '3D', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 414000 },

            // ================================================
            // 4DMAX - WEEKDAY
            // ================================================
            { room_type: '4DMAX', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 180000 },
            { room_type: '4DMAX', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'VIP', price: 220000 },
            { room_type: '4DMAX', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 260000 },
            { room_type: '4DMAX', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 300000 },
            { room_type: '4DMAX', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 340000 },
            { room_type: '4DMAX', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 200000 },
            { room_type: '4DMAX', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'VIP', price: 240000 },
            { room_type: '4DMAX', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 280000 },
            { room_type: '4DMAX', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 320000 },
            { room_type: '4DMAX', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 360000 },
            { room_type: '4DMAX', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 230000 },
            { room_type: '4DMAX', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'VIP', price: 270000 },
            { room_type: '4DMAX', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 310000 },
            { room_type: '4DMAX', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 350000 },
            { room_type: '4DMAX', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 390000 },
            { room_type: '4DMAX', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 240000 },
            { room_type: '4DMAX', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'VIP', price: 280000 },
            { room_type: '4DMAX', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 320000 },
            { room_type: '4DMAX', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 360000 },
            { room_type: '4DMAX', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 400000 },

            // ================================================
            // 4DMAX - WEEKEND
            // ================================================
            { room_type: '4DMAX', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 216000 },
            { room_type: '4DMAX', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'VIP', price: 264000 },
            { room_type: '4DMAX', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 312000 },
            { room_type: '4DMAX', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 360000 },
            { room_type: '4DMAX', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 408000 },
            { room_type: '4DMAX', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 240000 },
            { room_type: '4DMAX', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'VIP', price: 288000 },
            { room_type: '4DMAX', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 336000 },
            { room_type: '4DMAX', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 384000 },
            { room_type: '4DMAX', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 432000 },
            { room_type: '4DMAX', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 276000 },
            { room_type: '4DMAX', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'VIP', price: 324000 },
            { room_type: '4DMAX', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 372000 },
            { room_type: '4DMAX', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 420000 },
            { room_type: '4DMAX', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 468000 },
            { room_type: '4DMAX', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 288000 },
            { room_type: '4DMAX', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'VIP', price: 336000 },
            { room_type: '4DMAX', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 384000 },
            { room_type: '4DMAX', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 432000 },
            { room_type: '4DMAX', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 480000 },

            // ================================================
            // IMAX - WEEKDAY
            // ================================================
            { room_type: 'IMAX', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 120000 },
            { room_type: 'IMAX', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'VIP', price: 180000 },
            { room_type: 'IMAX', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 240000 },
            { room_type: 'IMAX', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 300000 },
            { room_type: 'IMAX', time_slot: 'MORNING', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 360000 },
            { room_type: 'IMAX', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 140000 },
            { room_type: 'IMAX', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'VIP', price: 210000 },
            { room_type: 'IMAX', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 280000 },
            { room_type: 'IMAX', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 350000 },
            { room_type: 'IMAX', time_slot: 'AFTERNOON', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 420000 },
            { room_type: 'IMAX', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 160000 },
            { room_type: 'IMAX', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'VIP', price: 240000 },
            { room_type: 'IMAX', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 320000 },
            { room_type: 'IMAX', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 400000 },
            { room_type: 'IMAX', time_slot: 'EVENING', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 480000 },
            { room_type: 'IMAX', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'STANDARD', price: 165000 },
            { room_type: 'IMAX', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'VIP', price: 247500 },
            { room_type: 'IMAX', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'DELUXE', price: 330000 },
            { room_type: 'IMAX', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'RECLINER', price: 412500 },
            { room_type: 'IMAX', time_slot: 'NIGHT', day_type: 'WEEKDAY', seat_type: 'COUPLE', price: 495000 },

            // ================================================
            // IMAX - WEEKEND
            // ================================================
            { room_type: 'IMAX', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 144000 },
            { room_type: 'IMAX', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'VIP', price: 216000 },
            { room_type: 'IMAX', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 288000 },
            { room_type: 'IMAX', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 360000 },
            { room_type: 'IMAX', time_slot: 'MORNING', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 432000 },
            { room_type: 'IMAX', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 168000 },
            { room_type: 'IMAX', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'VIP', price: 252000 },
            { room_type: 'IMAX', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 336000 },
            { room_type: 'IMAX', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 420000 },
            { room_type: 'IMAX', time_slot: 'AFTERNOON', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 504000 },
            { room_type: 'IMAX', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 192000 },
            { room_type: 'IMAX', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'VIP', price: 288000 },
            { room_type: 'IMAX', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 384000 },
            { room_type: 'IMAX', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 480000 },
            { room_type: 'IMAX', time_slot: 'EVENING', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 576000 },
            { room_type: 'IMAX', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'STANDARD', price: 198000 },
            { room_type: 'IMAX', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'VIP', price: 297000 },
            { room_type: 'IMAX', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'DELUXE', price: 396000 },
            { room_type: 'IMAX', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'RECLINER', price: 495000 },
            { room_type: 'IMAX', time_slot: 'NIGHT', day_type: 'WEEKEND', seat_type: 'COUPLE', price: 594000 },
        ];

        const count = await PriceConfigRepository.bulkInsert(defaultPrices);
        return { message: `Đã seed ${count} dòng dữ liệu giá`, count };
    }

    // ==========================================================
    // HELPER: XÁC ĐỊNH TIME_SLOT TỪ START_TIME
    // ==========================================================

    getTimeSlot(startTime) {
        const hour = parseInt(startTime.split(':')[0]);
        if (hour >= 6 && hour < 12) return 'MORNING';
        if (hour >= 12 && hour < 17) return 'AFTERNOON';
        if (hour >= 17 && hour < 20) return 'EVENING';
        return 'NIGHT';
    }

    // ==========================================================
    // HELPER: XÁC ĐỊNH DAY_TYPE TỪ DATE
    // ==========================================================

    getDayType(date) {
        const dayOfWeek = new Date(date).getDay();
        return (dayOfWeek === 0 || dayOfWeek === 6) ? 'WEEKEND' : 'WEEKDAY';
    }

    // ==========================================================
    // LẤY GIÁ VÉ THEO ROOM_TYPE + START_TIME + DATE + SEAT_TYPE
    // ==========================================================

    async getPrice(roomType, startTime, date, seatType = 'STANDARD') {
        const timeSlot = this.getTimeSlot(startTime);
        const dayType = this.getDayType(date);
        return await this.getByRoomTimeDaySeat(roomType, timeSlot, dayType, seatType);
    }
}

module.exports = new PriceConfigService();