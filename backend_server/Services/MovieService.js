// services/MovieService.js
const MovieRepository = require('../Repositories/MovieRepository');
const { uploadToCloudinary, deleteFromCloudinary } = require('../Middlewares/UploadCloudinary');
const db = require('../Config/db');

// Helper tạo slug
const createSlug = (title) => {
    if (!title) return "";
    return title
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// Trích xuất public_id từ URL Cloudinary
const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    return parts.slice(uploadIndex + 1).join('/').split('.')[0];
};

// Hàm validate (có thể tách ra utils riêng nếu muốn)
const validateMovieData = (data, files, isUpdate = false) => {
    const { title, duration, release_date, status, director, nation, age_rating, trailer_url } = data;

    if (!title || title.trim() === "") return "Vui lòng nhập tiêu đề phim.";
    if (title.trim().length < 2) return "Tiêu đề phim phải từ 2 ký tự trở lên.";
    if (!director || director.trim() === "") return "Vui lòng nhập tên đạo diễn.";
    if (!nation || nation.trim() === "") return "Vui lòng nhập quốc gia sản xuất.";
    if (!duration || isNaN(duration) || parseInt(duration, 10) <= 0) {
        return "Thời lượng phim phải là số nguyên dương tính bằng phút.";
    }
    if (age_rating === undefined || age_rating === null || age_rating === "") {
        return "Vui lòng chọn giới hạn độ tuổi (C13, C16, C18, P...).";
    }
    if (!release_date || release_date.trim() === "") return "Vui lòng chọn ngày phát hành phim.";
    const validStatuses = ['Đang chiếu', 'Sắp chiếu', 'Ngừng chiếu'];
    if (!status || !validStatuses.includes(status)) return "Trạng thái phim không hợp lệ.";
    if (trailer_url && trailer_url.trim() !== "") {
        if (!trailer_url.startsWith("http://") && !trailer_url.startsWith("https://")) {
            return "Đường dẫn Trailer không hợp lệ (phải bắt đầu bằng http:// hoặc https://).";
        }
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!isUpdate && status === "Sắp chiếu" && new Date(release_date) < today) {
        return "Phim 'Sắp chiếu' thì ngày phát hành không được ở quá khứ.";
    }
    if (!isUpdate && (!files || !files['movie_poster'])) {
        return "Vui lòng upload ảnh poster cho phim.";
    }
    return null;
};

class MovieService {
    // Lấy tất cả phim
    async getAllMovies() {
        return await MovieRepository.findAll();
    }

    // Lấy phim theo ID
    async getMovieById(movieId) {
        const movie = await MovieRepository.findById(movieId);
        if (!movie) {
            throw { statusCode: 404, message: "Không tìm thấy phim" };
        }
        return movie;
    }

    // Lấy phim theo slug (kèm genres, actors, showtimes)
    async getMovieBySlug(slug) {
        const movie = await MovieRepository.findBySlug(slug);
        if (!movie) {
            throw { statusCode: 404, message: "Không tìm thấy phim" };
        }

        // Lấy thêm genres, actors, showtimes
        const genres = await MovieRepository.getGenresByMovieId(movie.movie_id);
        const actors = await MovieRepository.getActorsByMovieId(movie.movie_id);
        let showtimes = [];
        if (movie.status === "Đang chiếu") {
            showtimes = await MovieRepository.getShowtimesByMovieId(movie.movie_id);
        }

        movie.genres = genres;
        movie.actors = actors;
        movie.showtimes = showtimes;
        return movie;
    }

    // Tạo phim mới
    async createMovie(data, files) {
        // Validate
        const error = validateMovieData(data, files, false);
        if (error) {
            throw { statusCode: 400, message: error };
        }

        const {
            title, description, director, nation, duration,
            age_rating, release_date, status, trailer_url, total_likes
        } = data;

        const slug = createSlug(title);

        // Kiểm tra trùng lặp
        const exists = await MovieRepository.existsByTitleOrSlug(title.trim(), slug);
        if (exists) {
            throw { statusCode: 400, message: "Phim này đã tồn tại trong hệ thống (trùng tên hoặc slug)." };
        }

        // Upload ảnh lên Cloudinary
        let movie_poster = null;
        let movie_backdrop = null;

        if (files['movie_poster']?.[0]) {
            const result = await uploadToCloudinary(files['movie_poster'][0], 'cinema_shop/posters');
            movie_poster = result.url;
        }
        if (files['movie_backdrop']?.[0]) {
            const result = await uploadToCloudinary(files['movie_backdrop'][0], 'cinema_shop/backdrops');
            movie_backdrop = result.url;
        }

        const cleanDate = release_date ? release_date.substring(0, 10) : null;

        const movieId = await MovieRepository.create({
            title: title.trim(),
            slug,
            description: description ? description.trim() : "",
            director: director.trim(),
            nation: nation.trim(),
            duration: parseInt(duration, 10),
            age_rating,
            movie_poster,
            movie_backdrop,
            trailer_url: trailer_url ? trailer_url.trim() : null,
            release_date: cleanDate,
            status,
            total_likes: parseInt(total_likes, 10) || 0
        });

        return movieId;
    }

    // Cập nhật phim
    async updateMovie(movieId, data, files) {
        // Check tồn tại
        const existing = await MovieRepository.findById(movieId);
        if (!existing) {
            throw { statusCode: 404, message: "Phim không tồn tại" };
        }

        // Validate (cho phép không upload poster khi update)
        const error = validateMovieData(data, files, true);
        if (error) {
            throw { statusCode: 400, message: error };
        }

        const {
            title, director, nation, duration, age_rating,
            release_date, status, description, trailer_url, total_likes
        } = data;

        const slug = createSlug(title);

        // Kiểm tra trùng lặp (trừ chính nó)
        const exists = await MovieRepository.existsByTitleOrSlug(title.trim(), slug, movieId);
        if (exists) {
            throw { statusCode: 400, message: "Tên phim hoặc slug đã trùng với phim khác." };
        }

        // Xử lý ảnh
        let finalPoster = existing.movie_poster;
        let finalBackdrop = existing.movie_backdrop;

        // Xóa ảnh cũ nếu có ảnh mới
        if (files['movie_poster']?.[0]) {
            if (existing.movie_poster) {
                const publicId = extractPublicId(existing.movie_poster);
                await deleteFromCloudinary(publicId);
            }
            const result = await uploadToCloudinary(files['movie_poster'][0], 'cinema_shop/posters');
            finalPoster = result.url;
        }

        if (files['movie_backdrop']?.[0]) {
            if (existing.movie_backdrop) {
                const publicId = extractPublicId(existing.movie_backdrop);
                await deleteFromCloudinary(publicId);
            }
            const result = await uploadToCloudinary(files['movie_backdrop'][0], 'cinema_shop/backdrops');
            finalBackdrop = result.url;
        }

        const updateData = {
            title: title.trim(),
            slug,
            director: director.trim(),
            nation: nation.trim(),
            duration: parseInt(duration, 10),
            age_rating,
            release_date: release_date?.substring(0, 10) || null,
            status,
            description: description ? description.trim() : "",
            movie_poster: finalPoster,
            movie_backdrop: finalBackdrop,
            trailer_url: trailer_url ? trailer_url.trim() : null,
            total_likes: parseInt(total_likes, 10) || 0
        };

        const affected = await MovieRepository.update(movieId, updateData);
        if (affected === 0) {
            throw { statusCode: 500, message: "Không thể cập nhật phim" };
        }
        return true;
    }

    // Xóa phim
    async deleteMovie(movieId) {
        const movie = await MovieRepository.findById(movieId);
        if (!movie) {
            throw { statusCode: 404, message: "Phim không tồn tại" };
        }

        // Xóa ảnh trên Cloudinary
        if (movie.movie_poster) {
            const publicId = extractPublicId(movie.movie_poster);
            await deleteFromCloudinary(publicId);
        }
        if (movie.movie_backdrop) {
            const publicId = extractPublicId(movie.movie_backdrop);
            await deleteFromCloudinary(publicId);
        }

        const affected = await MovieRepository.delete(movieId);
        if (affected === 0) {
            throw { statusCode: 500, message: "Xóa phim thất bại" };
        }
        return true;
    }

    // Lấy danh sách phim theo status group (Đang chiếu, Sắp chiếu)
    async getMoviesByStatusGroup() {
        return await MovieRepository.findGroupedByStatus();
    }

    // Lấy phim theo status (có avg rating)
    async getMoviesByStatus(status) {
        const valid = ['Đang chiếu', 'Sắp chiếu'];
        if (!valid.includes(status)) {
            throw { statusCode: 400, message: "Trạng thái không hợp lệ" };
        }
        return await MovieRepository.findByStatus(status);
    }

    // Like phim
    async likeMovie(movieId) {
        const affected = await MovieRepository.incrementLikes(movieId);
        if (affected === 0) {
            throw { statusCode: 404, message: "Phim không tồn tại" };
        }
        return true;
    }

    // Tăng views
    async incrementViews(movieId) {
        const affected = await MovieRepository.incrementViews(movieId);
        if (affected === 0) {
            throw { statusCode: 404, message: "Phim không tồn tại" };
        }
        return true;
    }

    // Lấy phim theo genre
    async getMoviesByGenre(genreSlug) {
        return await MovieRepository.findByGenre(genreSlug || null);
    }
}

module.exports = new MovieService();