
const CinemaRepository = require("../Repositories/CinemaRepository");

// ==========================================================
// CREATE SLUG
// ==========================================================
const createSlug = (text) => {
    if (!text) return "";

    return text
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
};

// ==========================================================
// VALIDATE CINEMA
// ==========================================================
const validateCinema = (data) => {
    const {
        cinema_name,
        address,
        city,
        hotline,
        map_link
    } = data;

    // Tên rạp
    if (!cinema_name || cinema_name.trim() === "") {
        return "Vui lòng nhập tên rạp.";
    }

    if (cinema_name.trim().length < 5) {
        return "Tên rạp phải từ 5 ký tự trở lên.";
    }

    // Địa chỉ
    if (!address || address.trim() === "") {
        return "Vui lòng nhập địa chỉ.";
    }

    // Thành phố
    if (!city || city.trim() === "") {
        return "Vui lòng nhập tỉnh/thành phố.";
    }

    // Hotline
    if (!hotline || hotline.trim() === "") {
        return "Vui lòng nhập hotline.";
    }

    if (!/^[0-9]{8,15}$/.test(hotline.trim())) {
        return "Hotline không hợp lệ.";
    }

    // Google Maps
    if (!map_link || map_link.trim() === "") {
        return "Vui lòng nhập link Google Map.";
    }

    try {
        new URL(map_link.trim());
    } catch {
        return "Link Google Map không hợp lệ.";
    }

    return null;
};

// ==========================================================
// CINEMA SERVICE
// ==========================================================
class CinemaService {

    // ==========================================================
    // GET ALL CINEMAS - KHÔNG PHÂN TRANG
    // TRẢ VỀ MẢNG rows[]
    // ==========================================================
    async getAllCinemasAll(search = "") {
        return await CinemaRepository.findAllAll(search);
    }

    // ==========================================================
    // GET ALL CINEMAS - CÓ PHÂN TRANG
    // TRẢ VỀ { data: [], pagination: {} }
    // ==========================================================
    async getAllCinemasPaginated(page = 1, limit = 20, search = "") {
        return await CinemaRepository.findAll(page, limit, search);
    }
    /* ==========================================================
        GET CINEMA BY ID
        ADMIN
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
        GET CINEMA BY SLUG
        PUBLIC

        Trả về:
        - Thông tin rạp
        - Danh sách phim
        - Danh sách suất chiếu của từng phim
    ========================================================== */
    async getCinemaBySlug(slug) {
        if (!slug || typeof slug !== "string") {
            const err = new Error("Slug rạp không hợp lệ.");
            err.statusCode = 400;
            throw err;
        }

        const cinema = await CinemaRepository.findBySlug(
            slug.trim()
        );

        if (!cinema) {
            const err = new Error("Không tìm thấy rạp.");
            err.statusCode = 404;
            throw err;
        }

        const movies = await CinemaRepository.getMoviesByCinema(
            cinema.cinema_id
        );

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

        return {
            ...cinema,
            movies: Object.values(movieMap)
        };
    }

    /* ==========================================================
        CREATE CINEMA
        ADMIN
    ========================================================== */
    async createCinema(data) {
        const error = validateCinema(data);

        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const {
            cinema_name,
            address,
            city,
            hotline,
            map_link
        } = data;

        const cleanCinemaName = cinema_name.trim();
        const cleanAddress = address.trim();
        const cleanCity = city.trim();
        const cleanHotline = hotline.trim();
        const cleanMapLink = map_link.trim();

        // ------------------------------------------------------
        // CREATE SLUG
        // ------------------------------------------------------
        const slug = createSlug(cleanCinemaName);

        // ------------------------------------------------------
        // CHECK DUPLICATE NAME
        // ------------------------------------------------------
        const duplicateName =
            await CinemaRepository.findByName(
                cleanCinemaName
            );

        if (duplicateName) {
            const err = new Error("Tên rạp đã tồn tại.");
            err.statusCode = 400;
            throw err;
        }

        // ------------------------------------------------------
        // CHECK DUPLICATE HOTLINE
        // ------------------------------------------------------
        const duplicateHotline =
            await CinemaRepository.findByHotline(
                cleanHotline
            );

        if (duplicateHotline) {
            const err = new Error("Hotline đã tồn tại.");
            err.statusCode = 400;
            throw err;
        }

        // ------------------------------------------------------
        // CREATE
        // ------------------------------------------------------
        return await CinemaRepository.create({
            cinema_name: cleanCinemaName,
            slug,
            address: cleanAddress,
            city: cleanCity,
            hotline: cleanHotline,
            map_link: cleanMapLink
        });
    }

    /* ==========================================================
        UPDATE CINEMA
        ADMIN
    ========================================================== */
    async updateCinema(cinemaId, data) {
        // ------------------------------------------------------
        // CHECK CINEMA
        // ------------------------------------------------------
        const cinema =
            await CinemaRepository.findById(cinemaId);

        if (!cinema) {
            const err = new Error("Rạp không tồn tại.");
            err.statusCode = 404;
            throw err;
        }

        // ------------------------------------------------------
        // VALIDATE
        // ------------------------------------------------------
        const error = validateCinema(data);

        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const {
            cinema_name,
            address,
            city,
            hotline,
            map_link
        } = data;

        const cleanCinemaName = cinema_name.trim();
        const cleanAddress = address.trim();
        const cleanCity = city.trim();
        const cleanHotline = hotline.trim();
        const cleanMapLink = map_link.trim();

        // ------------------------------------------------------
        // CREATE NEW SLUG
        // ------------------------------------------------------
        const slug = createSlug(cleanCinemaName);

        // ------------------------------------------------------
        // CHECK DUPLICATE NAME
        // Bỏ qua chính cinema đang update
        // ------------------------------------------------------
        const duplicateName =
            await CinemaRepository.findByName(
                cleanCinemaName,
                cinemaId
            );

        if (duplicateName) {
            const err = new Error("Tên rạp đã tồn tại.");
            err.statusCode = 400;
            throw err;
        }

        // ------------------------------------------------------
        // CHECK DUPLICATE HOTLINE
        // Bỏ qua chính cinema đang update
        // ------------------------------------------------------
        const duplicateHotline =
            await CinemaRepository.findByHotline(
                cleanHotline,
                cinemaId
            );

        if (duplicateHotline) {
            const err = new Error("Hotline đã tồn tại.");
            err.statusCode = 400;
            throw err;
        }

        // ------------------------------------------------------
        // UPDATE
        // ------------------------------------------------------
        const affectedRows =
            await CinemaRepository.update(
                cinemaId,
                {
                    cinema_name: cleanCinemaName,
                    slug,
                    address: cleanAddress,
                    city: cleanCity,
                    hotline: cleanHotline,
                    map_link: cleanMapLink
                }
            );

        if (affectedRows === 0) {
            const err = new Error("Cập nhật rạp thất bại.");
            err.statusCode = 400;
            throw err;
        }

        return true;
    }

    /* ==========================================================
        DELETE CINEMA
        ADMIN
    ========================================================== */
    async deleteCinema(cinemaId) {
        // ------------------------------------------------------
        // CHECK CINEMA
        // ------------------------------------------------------
        const cinema =
            await CinemaRepository.findById(cinemaId);

        if (!cinema) {
            const err = new Error("Rạp không tồn tại.");
            err.statusCode = 404;
            throw err;
        }

        // ------------------------------------------------------
        // DELETE
        // ------------------------------------------------------
        const affectedRows =
            await CinemaRepository.delete(cinemaId);

        if (affectedRows === 0) {
            const err = new Error("Xóa rạp thất bại.");
            err.statusCode = 400;
            throw err;
        }

        return true;
    }
}

// ==========================================================
// EXPORT
// ==========================================================
module.exports = new CinemaService();

