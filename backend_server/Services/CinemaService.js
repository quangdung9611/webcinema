// services/CinemaService.js
const CinemaRepository = require('../Repositories/CinemaRepository');
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require('../Middlewares/UploadCloudinary');

// ==========================================================
// HELPER - CREATE SLUG
// ==========================================================
const createSlug = (text) => {
    if (!text) return "";
    return text
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// ==========================================================
// HELPER - EXTRACT PUBLIC_ID FROM CLOUDINARY URL
// ==========================================================
const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    return parts.slice(uploadIndex + 1).join('/').split('.')[0];
};

// ==========================================================
// VALIDATE CINEMA DATA
// ==========================================================
const validateCinema = (data, files = {}, isUpdate = false) => {
    const { cinema_name, address, city, hotline, map_link } = data;

    if (!cinema_name || cinema_name.trim() === "") {
        return "Vui lòng nhập tên rạp.";
    }
    if (cinema_name.trim().length < 5) {
        return "Tên rạp phải từ 5 ký tự trở lên.";
    }
    if (!address || address.trim() === "") {
        return "Vui lòng nhập địa chỉ.";
    }
    if (!city || city.trim() === "") {
        return "Vui lòng nhập tỉnh/thành phố.";
    }
    if (!hotline || hotline.trim() === "") {
        return "Vui lòng nhập hotline.";
    }
    if (!/^[0-9]{8,15}$/.test(hotline.trim())) {
        return "Hotline không hợp lệ (8-15 chữ số).";
    }
    if (!map_link || map_link.trim() === "") {
        return "Vui lòng nhập iframe Google Map.";
    }
    const trimmedMapLink = map_link.trim();
    if (!trimmedMapLink.includes('<iframe') || !trimmedMapLink.includes('</iframe>')) {
        return "Vui lòng nhập đúng thẻ iframe Google Map.";
    }

    return null;
};

// ==========================================================
// VALIDATE OPERATING HOURS
// ==========================================================
const validateOperatingHours = (data) => {
    const { weekday_open, weekday_close, weekend_open, weekend_close } = data;

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (weekday_open && !timeRegex.test(weekday_open)) {
        return "Giờ mở cửa ngày thường không hợp lệ.";
    }
    if (weekday_close && !timeRegex.test(weekday_close)) {
        return "Giờ đóng cửa ngày thường không hợp lệ.";
    }
    if (weekend_open && !timeRegex.test(weekend_open)) {
        return "Giờ mở cửa cuối tuần không hợp lệ.";
    }
    if (weekend_close && !timeRegex.test(weekend_close)) {
        return "Giờ đóng cửa cuối tuần không hợp lệ.";
    }

    return null;
};

class CinemaService {

    /* ==========================================================
        GET ALL CINEMAS - KHÔNG PHÂN TRANG
    ========================================================== */
    async getAllCinemasAll(search = "") {
        return await CinemaRepository.findAllAll(search);
    }

    /* ==========================================================
        GET ALL CINEMAS - CÓ PHÂN TRANG
    ========================================================== */
    async getAllCinemasPaginated(page = 1, limit = 20, search = "") {
        return await CinemaRepository.findAll(page, limit, search);
    }

    /* ==========================================================
        GET CINEMA BY ID (ADMIN)
    ========================================================== */
    async getCinemaById(cinemaId) {
        const cinema = await CinemaRepository.findById(cinemaId);
        if (!cinema) {
            const err = new Error("Không tìm thấy rạp.");
            err.statusCode = 404;
            throw err;
        }
        return cinema;
    }

    /* ==========================================================
        GET CINEMA BY SLUG (PUBLIC)
    ========================================================== */
    async getCinemaBySlug(slug) {
        if (!slug || typeof slug !== "string") {
            const err = new Error("Slug rạp không hợp lệ.");
            err.statusCode = 400;
            throw err;
        }

        const cinema = await CinemaRepository.findBySlug(slug.trim());
        if (!cinema) {
            const err = new Error("Không tìm thấy rạp.");
            err.statusCode = 404;
            throw err;
        }

        const movies = await CinemaRepository.getMoviesByCinema(cinema.cinema_id);
        const movieMap = {};
        for (const item of movies) {
            if (!movieMap[item.movie_id]) {
                movieMap[item.movie_id] = {
                    movie_id: item.movie_id,
                    title: item.title,
                    movie_poster: item.movie_poster,
                    showtimes: []
                };
            }
            movieMap[item.movie_id].showtimes.push({
                showtime_id: item.showtime_id,
                start_time: item.start_time
            });
        }

        return { ...cinema, movies: Object.values(movieMap) };
    }

    /* ==========================================================
        CREATE CINEMA (ADMIN)
    ========================================================== */
    async createCinema(data, files = {}) {
        const error = validateCinema(data, files, false);
        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            err.field = "general";
            throw err;
        }

        const hoursError = validateOperatingHours(data);
        if (hoursError) {
            const err = new Error(hoursError);
            err.statusCode = 400;
            err.field = "general";
            throw err;
        }

        const { 
            cinema_name, 
            address, 
            city, 
            hotline, 
            map_link,
            weekday_open,
            weekday_close,
            weekend_open,
            weekend_close
        } = data;
        
        const cleanCinemaName = cinema_name.trim();
        const slug = createSlug(cleanCinemaName);

        const duplicateName = await CinemaRepository.findByName(cleanCinemaName);
        if (duplicateName) {
            const err = new Error("Tên rạp đã tồn tại.");
            err.statusCode = 400;
            err.field = "cinema_name";
            throw err;
        }

        const duplicateHotline = await CinemaRepository.findByHotline(hotline.trim());
        if (duplicateHotline) {
            const err = new Error("Hotline đã tồn tại.");
            err.statusCode = 400;
            err.field = "hotline";
            throw err;
        }

        let cinema_backdrop = null;
        if (files['cinema_backdrop']?.[0]) {
            const result = await uploadToCloudinary(
                files['cinema_backdrop'][0],
                'cinema_shop/backdrops'
            );
            cinema_backdrop = result.url;
        }

        const cinemaId = await CinemaRepository.create({
            cinema_name: cleanCinemaName,
            slug,
            address: address.trim(),
            city: city.trim(),
            hotline: hotline.trim(),
            map_link: map_link.trim(),
            cinema_backdrop,
            weekday_open: weekday_open || '08:00:00',
            weekday_close: weekday_close || '23:30:00',
            weekend_open: weekend_open || '08:00:00',
            weekend_close: weekend_close || '24:00:00'
        });

        return cinemaId;
    }

    /* ==========================================================
        UPDATE CINEMA (ADMIN)
    ========================================================== */
    async updateCinema(cinemaId, data, files = {}) {
        const existing = await CinemaRepository.findById(cinemaId);
        if (!existing) {
            const err = new Error("Rạp không tồn tại.");
            err.statusCode = 404;
            throw err;
        }

        const error = validateCinema(data, files, true);
        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            err.field = "general";
            throw err;
        }

        const hoursError = validateOperatingHours(data);
        if (hoursError) {
            const err = new Error(hoursError);
            err.statusCode = 400;
            err.field = "general";
            throw err;
        }

        const { 
            cinema_name, 
            address, 
            city, 
            hotline, 
            map_link,
            weekday_open,
            weekday_close,
            weekend_open,
            weekend_close
        } = data;
        
        const cleanCinemaName = cinema_name.trim();
        const slug = createSlug(cleanCinemaName);

        const duplicateName = await CinemaRepository.findByName(cleanCinemaName, cinemaId);
        if (duplicateName) {
            const err = new Error("Tên rạp đã tồn tại.");
            err.statusCode = 400;
            err.field = "cinema_name";
            throw err;
        }

        const duplicateHotline = await CinemaRepository.findByHotline(hotline.trim(), cinemaId);
        if (duplicateHotline) {
            const err = new Error("Hotline đã tồn tại.");
            err.statusCode = 400;
            err.field = "hotline";
            throw err;
        }

        let finalBackdrop = existing.cinema_backdrop;
        if (files['cinema_backdrop']?.[0]) {
            if (existing.cinema_backdrop) {
                const publicId = extractPublicId(existing.cinema_backdrop);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            }
            const result = await uploadToCloudinary(
                files['cinema_backdrop'][0],
                'cinema_shop/backdrops'
            );
            finalBackdrop = result.url;
        }

        const affectedRows = await CinemaRepository.update(cinemaId, {
            cinema_name: cleanCinemaName,
            slug,
            address: address.trim(),
            city: city.trim(),
            hotline: hotline.trim(),
            map_link: map_link.trim(),
            cinema_backdrop: finalBackdrop,
            weekday_open: weekday_open || '08:00:00',
            weekday_close: weekday_close || '23:30:00',
            weekend_open: weekend_open || '08:00:00',
            weekend_close: weekend_close || '24:00:00'
        });

        if (affectedRows === 0) {
            const err = new Error("Cập nhật rạp thất bại.");
            err.statusCode = 400;
            throw err;
        }
        return true;
    }

    /* ==========================================================
        DELETE CINEMA (ADMIN)
    ========================================================== */
    async deleteCinema(cinemaId) {
        const cinema = await CinemaRepository.findById(cinemaId);
        if (!cinema) {
            const err = new Error("Rạp không tồn tại.");
            err.statusCode = 404;
            throw err;
        }

        if (cinema.cinema_backdrop) {
            const publicId = extractPublicId(cinema.cinema_backdrop);
            if (publicId) {
                await deleteFromCloudinary(publicId);
            }
        }

        const affectedRows = await CinemaRepository.delete(cinemaId);
        if (affectedRows === 0) {
            const err = new Error("Xóa rạp thất bại.");
            err.statusCode = 400;
            throw err;
        }
        return true;
    }

    /* ==========================================================
        GET OPERATING HOURS BY CINEMA
    ========================================================== */
    async getOperatingHours(cinemaId) {
        const cinema = await CinemaRepository.findById(cinemaId);
        if (!cinema) {
            const err = new Error("Không tìm thấy rạp.");
            err.statusCode = 404;
            throw err;
        }
        return {
            weekday: {
                open: cinema.weekday_open || '08:00:00',
                close: cinema.weekday_close || '23:30:00'
            },
            weekend: {
                open: cinema.weekend_open || '08:00:00',
                close: cinema.weekend_close || '24:00:00'
            }
        };
    }
}

module.exports = new CinemaService();