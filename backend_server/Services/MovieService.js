const MovieRepository = require('../Repositories/MovieRepository');
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require('../Middlewares/UploadCloudinary');

// =========================================================
// HELPER - TẠO SLUG
// =========================================================
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

// =========================================================
// HELPER - TRÍCH XUẤT PUBLIC_ID CLOUDINARY
// =========================================================
const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    return parts.slice(uploadIndex + 1).join('/').split('.')[0];
};

// =========================================================
// HELPER - LẤY TÊN FILE TỪ URL
// =========================================================
const getFileNameFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1];
};

// =========================================================
// VALIDATE MOVIE DATA
// =========================================================
const validateMovieData = (data, files, isUpdate = false) => {
    const {
        title,
        duration,
        release_date,
        status,
        director,
        nation,
        age_rating,
        trailer_url
    } = data;

    if (!title || title.trim() === "") {
        return "Vui lòng nhập tiêu đề phim.";
    }

    if (title.trim().length < 2) {
        return "Tiêu đề phim phải từ 2 ký tự trở lên.";
    }

    if (!director || director.trim() === "") {
        return "Vui lòng nhập tên đạo diễn.";
    }

    if (!nation || nation.trim() === "") {
        return "Vui lòng nhập quốc gia sản xuất.";
    }

    if (!duration || isNaN(duration) || parseInt(duration, 10) <= 0) {
        return "Thời lượng phim phải là số nguyên dương tính bằng phút.";
    }

    if (age_rating === undefined || age_rating === null || age_rating === "") {
        return "Vui lòng chọn giới hạn độ tuổi (C13, C16, C18, P...).";
    }

    if (!release_date || release_date.trim() === "") {
        return "Vui lòng chọn ngày phát hành phim.";
    }

    const validStatuses = ['Đang chiếu', 'Sắp chiếu', 'Ngừng chiếu'];
    if (!status || !validStatuses.includes(status)) {
        return "Trạng thái phim không hợp lệ.";
    }

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

    /*=========================================================
        GET ALL MOVIES - KHÔNG PHÂN TRANG
    =========================================================*/
    async getAllMoviesAll(search = "") {
        return await MovieRepository.findAllAll(search);
    }

    /*=========================================================
        GET ALL MOVIES - CÓ PHÂN TRANG
    =========================================================*/
    async getAllMovies(page = 1, limit = 20, search = "") {
        return await MovieRepository.findAll(page, limit, search);
    }

    /*=========================================================
        GET MOVIE BY ID
    =========================================================*/
    async getMovieById(movieId) {
        const movie = await MovieRepository.findById(movieId);
        if (!movie) {
            throw { statusCode: 404, message: "Không tìm thấy phim" };
        }
        return movie;
    }

    /*=========================================================
        GET MOVIE BY SLUG
    =========================================================*/
    async getMovieBySlug(slug) {
        const movie = await MovieRepository.findBySlug(slug);
        if (!movie) {
            throw { statusCode: 404, message: "Không tìm thấy phim" };
        }

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

    /*=========================================================
        CREATE MOVIE
    =========================================================*/
    async createMovie(data, files) {
        const error = validateMovieData(data, files, false);
        if (error) {
            throw { statusCode: 400, field: "general", message: error };
        }

        const {
            title,
            description,
            director,
            nation,
            duration,
            age_rating,
            release_date,
            status,
            trailer_url
        } = data;

        const slug = createSlug(title);

        // Kiểm tra trùng title và slug
        const allMovies = await MovieRepository.findAllAll();
        const duplicateTitle = allMovies.find(m => 
            m.title && m.title.toLowerCase() === title.trim().toLowerCase()
        );
        if (duplicateTitle) {
            throw {
                statusCode: 400,
                field: "title",
                message: `Tên phim "${title}" đã tồn tại trong hệ thống.`
            };
        }

        const duplicateSlug = allMovies.find(m => m.slug && m.slug === slug);
        if (duplicateSlug) {
            throw {
                statusCode: 400,
                field: "title",
                message: `Slug "${slug}" đã tồn tại trong hệ thống.`
            };
        }

        // Upload ảnh
        let movie_poster = null;
        let movie_backdrop = null;

        if (files['movie_poster']?.[0]) {
            const result = await uploadToCloudinary(
                files['movie_poster'][0],
                'cinema_shop/posters'
            );
            movie_poster = result.url;
        }

        if (files['movie_backdrop']?.[0]) {
            const result = await uploadToCloudinary(
                files['movie_backdrop'][0],
                'cinema_shop/backdrops'
            );
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
            status
        });

        return movieId;
    }

    /*=========================================================
        UPDATE MOVIE
    =========================================================*/
    async updateMovie(movieId, data, files) {
        const existing = await MovieRepository.findById(movieId);
        if (!existing) {
            throw { statusCode: 404, message: "Phim không tồn tại" };
        }

        const error = validateMovieData(data, files, true);
        if (error) {
            throw { statusCode: 400, field: "general", message: error };
        }

        const {
            title,
            director,
            nation,
            duration,
            age_rating,
            release_date,
            status,
            description,
            trailer_url
        } = data;

        const slug = createSlug(title);

        // ==================================================
        // KIỂM TRA TRÙNG LẶP VỚI CÁC PHIM KHÁC
        // ==================================================
        const allMovies = await MovieRepository.findAllAll();
        const otherMovies = allMovies.filter(m => m.movie_id !== parseInt(movieId));

        // Kiểm tra trùng title
        const duplicateTitle = otherMovies.find(m => 
            m.title && m.title.toLowerCase() === title.trim().toLowerCase()
        );
        if (duplicateTitle) {
            throw {
                statusCode: 400,
                field: "title",
                message: `Tên phim "${title}" đã tồn tại trong hệ thống (phim: ${duplicateTitle.title}). Vui lòng nhập tên khác.`
            };
        }

        // Kiểm tra trùng slug
        const duplicateSlug = otherMovies.find(m => m.slug && m.slug === slug);
        if (duplicateSlug) {
            throw {
                statusCode: 400,
                field: "title",
                message: `Slug "${slug}" đã tồn tại trong hệ thống (phim: ${duplicateSlug.title}). Vui lòng nhập tên khác.`
            };
        }

        // ==================================================
        // XỬ LÝ ẢNH - KIỂM TRA TRÙNG TÊN FILE
        // ==================================================

        let finalPoster = existing.movie_poster;
        let finalBackdrop = existing.movie_backdrop;

        // Xử lý Poster
        if (files['movie_poster']?.[0]) {
            const newFile = files['movie_poster'][0];
            const newFileName = newFile.originalname;
            
            // Kiểm tra tên file poster có trùng với phim khác?
            const existingPosterNames = otherMovies
                .map(m => m.movie_poster)
                .filter(url => url)
                .map(url => getFileNameFromUrl(url));

            if (existingPosterNames.includes(newFileName)) {
                throw {
                    statusCode: 400,
                    field: "movie_poster",
                    message: `File poster "${newFileName}" đã được sử dụng cho phim khác. Vui lòng chọn file khác.`
                };
            }

            // Kiểm tra tên file poster có trùng với phim hiện tại?
            if (existing.movie_poster) {
                const currentFileName = getFileNameFromUrl(existing.movie_poster);
                if (currentFileName === newFileName) {
                    throw {
                        statusCode: 400,
                        field: "movie_poster",
                        message: `File poster "${newFileName}" đã được sử dụng cho phim này. Vui lòng chọn file khác.`
                    };
                }
            }

            // Xóa ảnh cũ
            if (existing.movie_poster) {
                const publicId = extractPublicId(existing.movie_poster);
                await deleteFromCloudinary(publicId);
            }

            // Upload ảnh mới
            const result = await uploadToCloudinary(
                newFile,
                'cinema_shop/posters'
            );
            finalPoster = result.url;
        }

        // Xử lý Backdrop
        if (files['movie_backdrop']?.[0]) {
            const newFile = files['movie_backdrop'][0];
            const newFileName = newFile.originalname;
            
            // Kiểm tra tên file backdrop có trùng với phim khác?
            const existingBackdropNames = otherMovies
                .map(m => m.movie_backdrop)
                .filter(url => url)
                .map(url => getFileNameFromUrl(url));

            if (existingBackdropNames.includes(newFileName)) {
                throw {
                    statusCode: 400,
                    field: "movie_backdrop",
                    message: `File backdrop "${newFileName}" đã được sử dụng cho phim khác. Vui lòng chọn file khác.`
                };
            }

            // Kiểm tra tên file backdrop có trùng với phim hiện tại?
            if (existing.movie_backdrop) {
                const currentFileName = getFileNameFromUrl(existing.movie_backdrop);
                if (currentFileName === newFileName) {
                    throw {
                        statusCode: 400,
                        field: "movie_backdrop",
                        message: `File backdrop "${newFileName}" đã được sử dụng cho phim này. Vui lòng chọn file khác.`
                    };
                }
            }

            // Xóa ảnh cũ
            if (existing.movie_backdrop) {
                const publicId = extractPublicId(existing.movie_backdrop);
                await deleteFromCloudinary(publicId);
            }

            // Upload ảnh mới
            const result = await uploadToCloudinary(
                newFile,
                'cinema_shop/backdrops'
            );
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
            trailer_url: trailer_url ? trailer_url.trim() : null
        };

        const affected = await MovieRepository.update(movieId, updateData);
        if (affected === 0) {
            throw { statusCode: 500, message: "Không thể cập nhật phim" };
        }

        return true;
    }

    /*=========================================================
        DELETE MOVIE
    =========================================================*/
    async deleteMovie(movieId) {
        const movie = await MovieRepository.findById(movieId);
        if (!movie) {
            throw { statusCode: 404, message: "Phim không tồn tại" };
        }

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

    /*=========================================================
        GET MOVIES BY STATUS GROUP
    =========================================================*/
    async getMoviesByStatusGroup() {
        return await MovieRepository.findGroupedByStatus();
    }

    /*=========================================================
        GET MOVIES BY STATUS
    =========================================================*/
    async getMoviesByStatus(status, page = 1, limit = 20, search = "") {
        const valid = ['Đang chiếu', 'Sắp chiếu'];
        if (!valid.includes(status)) {
            throw { statusCode: 400, message: "Trạng thái không hợp lệ" };
        }
        return await MovieRepository.findByStatus(status, page, limit, search);
    }

    /*=========================================================
        GET MOVIES BY GENRE
    =========================================================*/
    async getMoviesByGenre(genreSlug, page = 1, limit = 20, search = "") {
        return await MovieRepository.findByGenre(genreSlug || null, page, limit, search);
    }

    /*=========================================================
        LIKE MOVIE
    =========================================================*/
    async likeMovie(movieId) {
        const affected = await MovieRepository.incrementLikes(movieId);
        if (affected === 0) {
            throw { statusCode: 404, message: "Phim không tồn tại" };
        }
        return true;
    }

    /*=========================================================
        INCREMENT VIEWS
    =========================================================*/
    async incrementViews(movieId) {
        const affected = await MovieRepository.incrementViews(movieId);
        if (affected === 0) {
            throw { statusCode: 404, message: "Phim không tồn tại" };
        }
        return true;
    }
}

module.exports = new MovieService();