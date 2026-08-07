const GenreRepository = require("../Repositories/GenreRepository");

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
// VALIDATE GENRE
// ==========================================================
const validateGenre = (data) => {
    const { genre_name } = data;
    if (!genre_name || genre_name.trim() === "") {
        return "Vui lòng nhập tên thể loại.";
    }
    if (genre_name.trim().length < 2) {
        return "Tên thể loại phải từ 2 ký tự trở lên.";
    }
    if (genre_name.trim().length > 50) {
        return "Tên thể loại không được vượt quá 50 ký tự.";
    }
    return null;
};

// ==========================================================
// SERVICE
// ==========================================================
class GenreService {

    /*=========================================================
        GET ALL GENRES - KHÔNG PHÂN TRANG
        TRẢ VỀ MẢNG
    =========================================================*/
    async getAllGenresAll(search = "") {
        return await GenreRepository.findAllAll(search);
    }

    /*=========================================================
        GET ALL GENRES - CÓ PHÂN TRANG
        TRẢ VỀ { data: [], pagination: {} }
    =========================================================*/
    async getAllGenresPaginated(page = 1, limit = 20, search = "") {
        return await GenreRepository.findAll(page, limit, search);
    }

    /*=========================================================
        GET GENRE BY ID
    =========================================================*/
    async getGenreById(genreId) {
        const genre = await GenreRepository.findById(genreId);
        if (!genre) {
            const err = new Error("Không tìm thấy thể loại.");
            err.statusCode = 404;
            throw err;
        }
        return genre;
    }

    /*=========================================================
        CREATE GENRE
    =========================================================*/
    async createGenre(data) {
        const error = validateGenre(data);
        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const genreName = data.genre_name.trim();
        const slug = createSlug(genreName);

        const duplicate = await GenreRepository.findByNameOrSlug(genreName, slug);
        if (duplicate) {
            const err = new Error("Tên thể loại đã tồn tại.");
            err.statusCode = 400;
            throw err;
        }

        return await GenreRepository.create({ genre_name: genreName, slug });
    }

    /*=========================================================
        UPDATE GENRE
    =========================================================*/
    async updateGenre(genreId, data) {
        const genre = await GenreRepository.findById(genreId);
        if (!genre) {
            const err = new Error("Không tìm thấy thể loại.");
            err.statusCode = 404;
            throw err;
        }

        const error = validateGenre(data);
        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const genreName = data.genre_name.trim();
        const slug = createSlug(genreName);

        const duplicate = await GenreRepository.findByNameOrSlug(genreName, slug, genreId);
        if (duplicate) {
            const err = new Error("Tên thể loại đã tồn tại.");
            err.statusCode = 400;
            throw err;
        }

        const affectedRows = await GenreRepository.update(genreId, {
            genre_name: genreName,
            slug
        });

        if (affectedRows === 0) {
            const err = new Error("Cập nhật thể loại thất bại.");
            err.statusCode = 400;
            throw err;
        }

        return true;
    }

    /*=========================================================
        DELETE GENRE
    =========================================================*/
    async deleteGenre(genreId) {
        const genre = await GenreRepository.findById(genreId);
        if (!genre) {
            const err = new Error("Không tìm thấy thể loại.");
            err.statusCode = 404;
            throw err;
        }

        const linked = await GenreRepository.checkLinked(genreId);
        if (linked) {
            const err = new Error("Không thể xóa vì thể loại đang được sử dụng.");
            err.statusCode = 400;
            throw err;
        }

        const affectedRows = await GenreRepository.delete(genreId);
        if (affectedRows === 0) {
            const err = new Error("Xóa thể loại thất bại.");
            err.statusCode = 400;
            throw err;
        }

        return true;
    }
}

module.exports = new GenreService();