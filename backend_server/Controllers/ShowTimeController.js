const ShowtimeService =
    require("../Services/ShowtimeService");


/*=========================================================
    PUBLIC
    GET ALL - KHÔNG PHÂN TRANG
=========================================================*/
exports.getAllShowtimesAll =
    async (req, res) => {

        try {

            const {
                search = "",
                page,
                limit
            } = req.query;


            /*
             * Route này KHÔNG hỗ trợ pagination.
             *
             * Nếu frontend truyền page hoặc limit
             * thì bắt buộc sử dụng:
             *
             * /api/showtimes/paginated
             */

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

            return res.status(
                err.statusCode || 500
            ).json({

                success: false,

                message:
                    err.message ||
                    "Lỗi máy chủ"
            });
        }
    };


/*=========================================================
    ADMIN
    GET ALL - PHÂN TRANG
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

                data:
                    result.data,

                pagination:
                    result.pagination
            });

        } catch (err) {

            console.error(
                "Get Showtimes Paginated Error:",
                err
            );

            return res.status(
                err.statusCode || 500
            ).json({

                success: false,

                message:
                    err.message ||
                    "Lỗi máy chủ"
            });
        }
    };


/*=========================================================
    PUBLIC
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
                "Get Showtime Detail Error:",
                err
            );

            return res.status(
                err.statusCode || 500
            ).json({

                success: false,

                message:
                    err.message ||
                    "Lỗi máy chủ"
            });
        }
    };


/*=========================================================
    PUBLIC
    GET BY CINEMA + ROOM
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
                        "Thiếu tham số cinema_id hoặc room_id"
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
                "Get Showtimes By Cinema And Room Error:",
                err
            );

            return res.status(
                err.statusCode || 500
            ).json({

                success: false,

                message:
                    err.message ||
                    "Lỗi máy chủ"
            });
        }
    };


/*=========================================================
    PUBLIC
    GET BY MOVIE
=========================================================*/
exports.getShowtimesByMovie =
    async (req, res) => {

        try {

            const {
                movieId
            } = req.params;


            if (!movieId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Thiếu movieId"
                });
            }


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
                "Get Showtimes By Movie Error:",
                err
            );

            return res.status(
                err.statusCode || 500
            ).json({

                success: false,

                message:
                    err.message ||
                    "Lỗi máy chủ"
            });
        }
    };


/*=========================================================
    PUBLIC
    QUICK BOOKING

    STEP 1:
    GET /api/showtimes/quick-booking

    STEP 2:
    ?movie_id=1

    STEP 3:
    ?movie_id=1&cinema_id=2

    STEP 4:
    ?movie_id=1&cinema_id=2&date=2026-08-16
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
                "Quick Booking Error:",
                err
            );

            return res.status(
                err.statusCode || 500
            ).json({

                success: false,

                message:
                    err.message ||
                    "Lỗi máy chủ"
            });
        }
    };


/*=========================================================
    PUBLIC
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
                "Booking Showtime Error:",
                err
            );

            return res.status(
                err.statusCode || 400
            ).json({

                success: false,

                message:
                    err.message ||
                    "Lỗi máy chủ"
            });
        }
    };


/*=========================================================
    PUBLIC
    FILTER LEGACY
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
                "Filter Showtime Error:",
                err
            );

            return res.status(
                err.statusCode || 400
            ).json({

                success: false,

                message:
                    err.message ||
                    "Lỗi máy chủ"
            });
        }
    };


/*=========================================================
    PUBLIC
    MOVIE DETAIL

    GET:
    /api/showtimes/movie-detail
        ?movie_id=1
        &cinema_id=2
        &date=2026-08-16
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
                        "Thiếu tham số movie_id, cinema_id hoặc date"
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
                "Movie Detail Showtime Error:",
                err
            );

            return res.status(
                err.statusCode || 500
            ).json({

                success: false,

                message:
                    err.message ||
                    "Lỗi máy chủ"
            });
        }
    };


/*=========================================================
    ADMIN
    BULK CREATE SHOWTIMES
=========================================================*/
exports.createBulkShowtimes =
    async (req, res) => {

        try {

            const result =
                await ShowtimeService
                    .createBulkShowtimes(
                        req.body
                    );


            return res.status(201).json({

                success: true,

                message:
                    "Tạo hàng loạt suất chiếu thành công",

                data: result
            });

        } catch (err) {

            console.error(
                "Bulk Create Showtimes Error:",
                err
            );

            return res.status(
                err.statusCode || 400
            ).json({

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
    ADMIN
    UPDATE SHOWTIME
=========================================================*/
exports.updateShowtime =
    async (req, res) => {

        try {

            const {
                showtime_id
            } = req.params;


            if (!showtime_id) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Thiếu showtime_id"
                });
            }


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
                "Update Showtime Error:",
                err
            );

            return res.status(
                err.statusCode || 400
            ).json({

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
    ADMIN
    DELETE SHOWTIME
=========================================================*/
exports.deleteShowtime =
    async (req, res) => {

        try {

            const {
                showtime_id
            } = req.params;


            if (!showtime_id) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Thiếu showtime_id"
                });
            }


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
                "Delete Showtime Error:",
                err
            );

            return res.status(
                err.statusCode || 500
            ).json({

                success: false,

                message:
                    err.message ||
                    "Lỗi máy chủ"
            });
        }
    };