const ShowtimeService = require("../Services/ShowtimeService");


/*=========================================================
    PUBLIC / ADMIN - GET ALL SHOWTIMES - KHÔNG PHÂN TRANG
=========================================================*/
exports.getAllShowtimesAll = async (req, res) => {
    try {
        const { search = "", page, limit } = req.query;

        if (page !== undefined || limit !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Route /api/showtimes không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/showtimes/paginated để phân trang."
            });
        }

        const data = await ShowtimeService.getAllShowtimesAll(search);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get All Showtimes Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


/*=========================================================
    ADMIN - GET SHOWTIMES - CÓ PHÂN TRANG
=========================================================*/
exports.getShowtimesWithPagination = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;

        const result = await ShowtimeService.getAllShowtimesPaginated(page, limit, search);

        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (err) {
        console.error("Get Showtimes Paginated Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


/*=========================================================
    ADMIN - GET SHOWTIME DETAIL BY ID
=========================================================*/
exports.getShowtimeDetail = async (req, res) => {
    try {
        const { showtime_id } = req.params;
        const data = await ShowtimeService.getShowtimeDetail(showtime_id);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get Showtime Detail Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


/*=========================================================
    PUBLIC - GET SHOWTIMES BY CINEMA + ROOM
=========================================================*/
exports.getShowtimesByCinemaAndRoom = async (req, res) => {
    try {
        const { cinema_id, room_id } = req.query;

        if (!cinema_id || !room_id) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tham số cinema_id hoặc room_id"
            });
        }

        const data = await ShowtimeService.getShowtimesByCinemaAndRoom(cinema_id, room_id);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get Showtimes By Cinema And Room Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


/*=========================================================
    PUBLIC - GET SHOWTIMES BY MOVIE
=========================================================*/
exports.getShowtimesByMovie = async (req, res) => {
    try {
        const { movieId } = req.params;
        const data = await ShowtimeService.getShowtimesByMovie(movieId);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get Showtimes By Movie Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


/*=========================================================
    PUBLIC - QUICK BOOKING
=========================================================*/
exports.getQuickBookingData = async (req, res) => {
    try {
        const { movie_id, cinema_id, date } = req.query;
        const data = await ShowtimeService.getQuickBookingData(movie_id, cinema_id, date);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Quick Booking Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


/*=========================================================
    PUBLIC - GET SHOWTIMES FOR BOOKING
=========================================================*/
exports.getShowtimesForBooking = async (req, res) => {
    try {
        const { movie_id, cinema_id, date } = req.query;
        const data = await ShowtimeService.getShowtimesForBooking(movie_id, cinema_id, date);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get Showtimes For Booking Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


/*=========================================================
    PUBLIC - FILTER SHOWTIMES
=========================================================*/
exports.filterShowtimes = async (req, res) => {
    try {
        const { movie_id, room_id, date } = req.query;
        const data = await ShowtimeService.filterShowtimes(movie_id, room_id, date);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Filter Showtimes Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


/*=========================================================
    PUBLIC - MOVIE DETAIL - BỎ GIÁ
=========================================================*/
exports.getShowtimesForMovieDetail = async (req, res) => {
    try {
        const { movie_id, cinema_id, date } = req.query;

        if (!movie_id || !cinema_id || !date) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tham số movie_id, cinema_id hoặc date"
            });
        }

        const data = await ShowtimeService.getShowtimesForMovieDetail(movie_id, cinema_id, date);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get Showtimes For Movie Detail Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


/*=========================================================
    ADMIN - CREATE SINGLE SHOWTIME
=========================================================*/
exports.createShowtime = async (req, res) => {
    try {
        const showtimeId = await ShowtimeService.createShowtime(req.body);

        return res.status(201).json({
            success: true,
            message: "Thêm suất chiếu thành công",
            data: { showtime_id: showtimeId }
        });
    } catch (err) {
        console.error("Create Showtime Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


/*=========================================================
    ADMIN - AUTO GENERATE SHOWTIMES
=========================================================*/
exports.createAutoSchedule = async (req, res) => {
    try {
        const result = await ShowtimeService.scheduleShowtimes(req.body);

        return res.status(201).json({
            success: true,
            message: "Tạo lịch chiếu tự động thành công",
            data: result
        });
    } catch (err) {
        console.error("Create Auto Schedule Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || "Không thể tạo lịch chiếu tự động"
        });
    }
};


/*=========================================================
    ADMIN - UPDATE SHOWTIME
=========================================================*/
exports.updateShowtime = async (req, res) => {
    try {
        const { showtime_id } = req.params;
        await ShowtimeService.updateShowtime(showtime_id, req.body);

        return res.status(200).json({
            success: true,
            message: "Cập nhật suất chiếu thành công"
        });
    } catch (err) {
        console.error("Update Showtime Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};


/*=========================================================
    ADMIN - DELETE SHOWTIME
=========================================================*/
exports.deleteShowtime = async (req, res) => {
    try {
        const { showtime_id } = req.params;
        await ShowtimeService.deleteShowtime(showtime_id);

        return res.status(200).json({
            success: true,
            message: "Đã xóa suất chiếu thành công"
        });
    } catch (err) {
        console.error("Delete Showtime Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};