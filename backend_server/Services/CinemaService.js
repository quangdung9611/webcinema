const CinemaRepository = require("../Repositories/CinemaRepository");

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

const validateCinema = (data) => {
    const {
        cinema_name,
        address,
        city,
        hotline,
        map_link
    } = data;

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
        return "Hotline không hợp lệ.";
    }

    if (!map_link || map_link.trim() === "") {
        return "Vui lòng nhập link Google Map.";
    }

    try {
        new URL(map_link);
    } catch {
        return "Link Google Map không hợp lệ.";
    }

    return null;
};

class CinemaService {

    /* ==========================================================
        GET ALL
    ========================================================== */

    async getAllCinemas() {
        return await CinemaRepository.findAll();
    }

    /* ==========================================================
        GET BY ID
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
        GET BY SLUG
    ========================================================== */

    async getCinemaBySlug(slug) {
        const cinema = await CinemaRepository.findBySlug(slug);

        if (!cinema) {
            const err = new Error("Không tìm thấy rạp.");
            err.statusCode = 404;
            throw err;
        }

        const movies = await CinemaRepository.getMoviesByCinema(cinema.cinema_id);

        const movieMap = {};

        movies.forEach(item => {
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
        });

        return {
            ...cinema,
            movies: Object.values(movieMap)
        };
    }

    /* ==========================================================
        CREATE
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

        const slug = createSlug(cinema_name);

        const duplicateName = await CinemaRepository.findByName(cinema_name.trim());

        if (duplicateName) {
            const err = new Error("Tên rạp đã tồn tại.");
            err.statusCode = 400;
            throw err;
        }

        const duplicateHotline = await CinemaRepository.findByHotline(hotline.trim());

        if (duplicateHotline) {
            const err = new Error("Hotline đã tồn tại.");
            err.statusCode = 400;
            throw err;
        }

        return await CinemaRepository.create({
            cinema_name: cinema_name.trim(),
            slug,
            address: address.trim(),
            city: city.trim(),
            hotline: hotline.trim(),
            map_link: map_link.trim()
        });
    }

    /* ==========================================================
        UPDATE
    ========================================================== */

    async updateCinema(cinemaId, data) {

        const cinema = await CinemaRepository.findById(cinemaId);

        if (!cinema) {
            const err = new Error("Rạp không tồn tại.");
            err.statusCode = 404;
            throw err;
        }

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

        const slug = createSlug(cinema_name);

        const duplicateName = await CinemaRepository.findByName(
            cinema_name.trim(),
            cinemaId
        );

        if (duplicateName) {
            const err = new Error("Tên rạp đã tồn tại.");
            err.statusCode = 400;
            throw err;
        }

        const duplicateHotline = await CinemaRepository.findByHotline(
            hotline.trim(),
            cinemaId
        );

        if (duplicateHotline) {
            const err = new Error("Hotline đã tồn tại.");
            err.statusCode = 400;
            throw err;
        }

        await CinemaRepository.update(cinemaId, {
            cinema_name: cinema_name.trim(),
            slug,
            address: address.trim(),
            city: city.trim(),
            hotline: hotline.trim(),
            map_link: map_link.trim()
        });

        return true;
    }

    /* ==========================================================
        DELETE
    ========================================================== */

    async deleteCinema(cinemaId) {

        const cinema = await CinemaRepository.findById(cinemaId);

        if (!cinema) {
            const err = new Error("Rạp không tồn tại.");
            err.statusCode = 404;
            throw err;
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