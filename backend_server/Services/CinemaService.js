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
    // Kiểm tra map_link có chứa iframe không
    const trimmedMapLink = map_link.trim();
    if (!trimmedMapLink.includes('<iframe') || !trimmedMapLink.includes('</iframe>')) {
        return "Vui lòng nhập đúng thẻ iframe Google Map.";
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

        // Lấy danh sách phim + suất chiếu
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

        const { cinema_name, address, city, hotline, map_link } = data;
        const cleanCinemaName = cinema_name.trim();
        const slug = createSlug(cleanCinemaName);

        // Kiểm tra trùng tên
        const duplicateName = await CinemaRepository.findByName(cleanCinemaName);
        if (duplicateName) {
            const err = new Error("Tên rạp đã tồn tại.");
            err.statusCode = 400;
            err.field = "cinema_name";
            throw err;
        }

        // Kiểm tra trùng hotline
        const duplicateHotline = await CinemaRepository.findByHotline(hotline.trim());
        if (duplicateHotline) {
            const err = new Error("Hotline đã tồn tại.");
            err.statusCode = 400;
            err.field = "hotline";
            throw err;
        }

        // Upload ảnh backdrop nếu có
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
            map_link: map_link.trim(), // Lưu trực tiếp iframe HTML
            cinema_backdrop
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

        const { cinema_name, address, city, hotline, map_link } = data;
        const cleanCinemaName = cinema_name.trim();
        const slug = createSlug(cleanCinemaName);

        // Kiểm tra trùng tên (không tính chính nó)
        const duplicateName = await CinemaRepository.findByName(cleanCinemaName, cinemaId);
        if (duplicateName) {
            const err = new Error("Tên rạp đã tồn tại.");
            err.statusCode = 400;
            err.field = "cinema_name";
            throw err;
        }

        // Kiểm tra trùng hotline (không tính chính nó)
        const duplicateHotline = await CinemaRepository.findByHotline(hotline.trim(), cinemaId);
        if (duplicateHotline) {
            const err = new Error("Hotline đã tồn tại.");
            err.statusCode = 400;
            err.field = "hotline";
            throw err;
        }

        // Xử lý ảnh backdrop
        let finalBackdrop = existing.cinema_backdrop;
        if (files['cinema_backdrop']?.[0]) {
            // Xóa ảnh cũ nếu có
            if (existing.cinema_backdrop) {
                const publicId = extractPublicId(existing.cinema_backdrop);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            }
            // Upload ảnh mới
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
            map_link: map_link.trim(), // Lưu trực tiếp iframe HTML
            cinema_backdrop: finalBackdrop
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

        // Xóa ảnh backdrop trên Cloudinary nếu có
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
}

module.exports = new CinemaService();