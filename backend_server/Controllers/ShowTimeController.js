const ShowtimeService =
    require("../Services/ShowtimeService");

/*=========================================================
    PUBLIC / ADMIN
    GET ALL SHOWTIMES
    KHÔNG PHÂN TRANG
=========================================================*/

exports.getAllShowtimesAll = async (
    req,
    res
) => {
    try {

        const {
            search = "",
            page,
            limit
        } = req.query;

        if (
            page !== undefined ||
            limit !== undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Route /api/showtimes không hỗ trợ page hoặc limit. Vui lòng sử dụng /api/showtimes/paginated."
            });
        }

        const data =
            await ShowtimeService
                .getAllShowtimesAll(
                    search
                );

        return res.status(200).json({
            success: true,
            data
        });

    } catch (err) {

        console.error(
            "Get All Showtimes Error:",
            err
        );

        return res
            .status(
                err.statusCode || 500
            )
            .json({
                success: false,
                message:
                    err.message ||
                    "Lỗi máy chủ"
            });
    }
};

/*=========================================================
    ADMIN
    GET SHOWTIMES PAGINATED
=========================================================*/

exports.getShowtimesWithPagination =
    async (req, res) => {
        try {

            const {
                page = 1,
                limit = 20,
                search = ""
            } = req.query;

            const result =
                await ShowtimeService
                    .getAllShowtimesPaginated(
                        page,
                        limit,
                        search
                    );

            return res.status(200).json({
                success: true,
                data: result.data,
                pagination:
                    result.pagination
            });

        } catch (err) {

            console.error(
                "Get Showtimes Paginated Error:",
                err
            );

            return res
                .status(
                    err.statusCode || 500
                )
                .json({
                    success: false,
                    message:
                        err.message ||
                        "Lỗi máy chủ"
                });
        }
    };

/*=========================================================
    GET DETAIL
=========================================================*/

exports.getShowtimeDetail =
    async (req, res) => {
        try {

            const {
                showtime_id
            } = req.params;

            const data =
                await ShowtimeService
                    .getShowtimeDetail(
                        showtime_id
                    );

            return res.status(200).json({
                success: true,
                data
            });

        } catch (err) {

            console.error(
                "Get showtime detail error:",
                err
            );

            return res
                .status(
                    err.statusCode || 500
                )
                .json({
                    success: false,
                    message:
                        err.message ||
                        "Lỗi máy chủ"
                });
        }
    };

/*=========================================================
    BY CINEMA + ROOM
=========================================================*/

exports.getShowtimesByCinemaAndRoom =
    async (req, res) => {

        try {

            const {
                cinema_id,
                room_id
            } = req.query;

            if (
                !cinema_id ||
                !room_id
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Thiếu cinema_id hoặc room_id"
                });
            }

            const data =
                await ShowtimeService
                    .getShowtimesByCinemaAndRoom(
                        cinema_id,
                        room_id
                    );

            return res.status(200).json({
                success: true,
                data
            });

        } catch (err) {

            console.error(
                "Lỗi lấy suất chiếu theo rạp và phòng:",
                err
            );

            return res
                .status(
                    err.statusCode || 500
                )
                .json({
                    success: false,
                    message:
                        err.message ||
                        "Lỗi máy chủ"
                });
        }
    };

/*=========================================================
    BY MOVIE
=========================================================*/

exports.getShowtimesByMovie =
    async (req, res) => {

        try {

            const {
                movieId
            } = req.params;

            const data =
                await ShowtimeService
                    .getShowtimesByMovie(
                        movieId
                    );

            return res.status(200).json({
                success: true,
                data
            });

        } catch (err) {

            console.error(
                "Get showtimes by movie error:",
                err
            );

            return res
                .status(
                    err.statusCode || 500
                )
                .json({
                    success: false,
                    message:
                        err.message ||
                        "Lỗi máy chủ"
                });
        }
    };

/*=========================================================
    QUICK BOOKING
=========================================================*/

exports.getQuickBookingData =
    async (req, res) => {

        try {

            const {
                movie_id,
                cinema_id,
                date
            } = req.query;

            const data =
                await ShowtimeService
                    .getQuickBookingData(
                        movie_id,
                        cinema_id,
                        date
                    );

            return res.status(200).json({
                success: true,
                data
            });

        } catch (err) {

            console.error(
                "Quick booking error:",
                err
            );

            return res
                .status(
                    err.statusCode || 500
                )
                .json({
                    success: false,
                    message:
                        err.message ||
                        "Lỗi máy chủ"
                });
        }
    };

/*=========================================================
    BOOKING
=========================================================*/

exports.getShowtimesForBooking =
    async (req, res) => {

        try {

            const {
                movie_id,
                cinema_id,
                date
            } = req.query;

            const data =
                await ShowtimeService
                    .getShowtimesForBooking(
                        movie_id,
                        cinema_id,
                        date
                    );

            return res.status(200).json({
                success: true,
                data
            });

        } catch (err) {

            console.error(
                "Booking showtime error:",
                err
            );

            return res
                .status(
                    err.statusCode || 400
                )
                .json({
                    success: false,
                    message:
                        err.message ||
                        "Lỗi máy chủ"
                });
        }
    };

/*=========================================================
    FILTER
=========================================================*/

exports.filterShowtimes =
    async (req, res) => {

        try {

            const {
                movie_id,
                room_id,
                date
            } = req.query;

            const data =
                await ShowtimeService
                    .filterShowtimes(
                        movie_id,
                        room_id,
                        date
                    );

            return res.status(200).json({
                success: true,
                data
            });

        } catch (err) {

            console.error(
                "Filter showtime error:",
                err
            );

            return res
                .status(
                    err.statusCode || 400
                )
                .json({
                    success: false,
                    message:
                        err.message ||
                        "Lỗi máy chủ"
                });
        }
    };

/*=========================================================
    MOVIE DETAIL
=========================================================*/

exports.getShowtimesForMovieDetail =
    async (req, res) => {

        try {

            const {
                movie_id,
                cinema_id,
                date
            } = req.query;

            if (
                !movie_id ||
                !cinema_id ||
                !date
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Thiếu movie_id, cinema_id hoặc date"
                });
            }

            const data =
                await ShowtimeService
                    .getShowtimesForMovieDetail(
                        movie_id,
                        cinema_id,
                        date
                    );

            return res.status(200).json({
                success: true,
                data
            });

        } catch (err) {

            console.error(
                "getShowtimesForMovieDetail error:",
                err
            );

            return res
                .status(
                    err.statusCode || 500
                )
                .json({
                    success: false,
                    message:
                        err.message ||
                        "Lỗi máy chủ"
                });
        }
    };

/*=========================================================
    CREATE ONE
=========================================================*/

exports.createShowtime =
    async (req, res) => {

        try {

            const showtimeId =
                await ShowtimeService
                    .createShowtime(
                        req.body
                    );

            return res.status(201).json({
                success: true,
                message:
                    "Thêm suất chiếu thành công",
                data: {
                    showtime_id:
                        showtimeId
                }
            });

        } catch (err) {

            console.error(
                "Create showtime error:",
                err
            );

            return res
                .status(
                    err.statusCode || 400
                )
                .json({
                    success: false,
                    field:
                        err.field || null,
                    message:
                        err.message ||
                        "Lỗi máy chủ"
                });
        }
    };

/*=========================================================
    UPDATE
=========================================================*/

exports.updateShowtime =
    async (req, res) => {

        try {

            const {
                showtime_id
            } = req.params;

            await ShowtimeService
                .updateShowtime(
                    showtime_id,
                    req.body
                );

            return res.status(200).json({
                success: true,
                message:
                    "Cập nhật suất chiếu thành công"
            });

        } catch (err) {

            console.error(
                "Update showtime error:",
                err
            );

            return res
                .status(
                    err.statusCode || 400
                )
                .json({
                    success: false,
                    field:
                        err.field || null,
                    message:
                        err.message ||
                        "Lỗi máy chủ"
                });
        }
    };

/*=========================================================
    DELETE
=========================================================*/

exports.deleteShowtime =
    async (req, res) => {

        try {

            const {
                showtime_id
            } = req.params;

            await ShowtimeService
                .deleteShowtime(
                    showtime_id
                );

            return res.status(200).json({
                success: true,
                message:
                    "Đã xóa suất chiếu thành công"
            });

        } catch (err) {

            console.error(
                "Delete showtime error:",
                err
            );

            return res
                .status(
                    err.statusCode || 500
                )
                .json({
                    success: false,
                    message:
                        err.message ||
                        "Lỗi máy chủ"
                });
        }
    };

/*=========================================================
    BULK CREATE
=========================================================*/

exports.bulkCreateShowtimes =
    async (req, res) => {

        try {

            const result =
                await ShowtimeService
                    .bulkCreateShowtimes(
                        req.body
                    );

            return res.status(201).json({
                success: true,

                message:
                    `Đã tạo ${result.inserted} suất chiếu. Bỏ qua ${result.skipped} suất không hợp lệ.`,

                data: result
            });

        } catch (err) {

            console.error(
                "Bulk create showtime error:",
                err
            );

            return res
                .status(
                    err.statusCode || 400
                )
                .json({
                    success: false,
                    message:
                        err.message ||
                        "Lỗi máy chủ khi tạo suất chiếu hàng loạt"
                });
        }
    };