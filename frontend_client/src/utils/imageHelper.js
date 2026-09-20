/* ==========================================================
   IMAGE HELPER — Tối ưu ảnh Cloudinary cho mobile
========================================================== */

/**
 * Tối ưu ảnh Cloudinary cho mobile
 *
 * @param {string} url - URL ảnh Cloudinary
 * @param {number} width - Chiều rộng mong muốn (px)
 * @returns {string} - URL đã tối ưu
 */
export const optimizeCloudinary = (url, width = 400) => {
    if (!url) return url;

    // Chỉ áp dụng cho ảnh Cloudinary
    if (!url.includes('cloudinary.com')) {
        return url;
    }

    // Nếu URL đã có params rồi → trả nguyên
    if (url.includes('/w_') || url.includes('/q_auto')) {
        return url;
    }

    // Thêm params tối ưu vào sau /upload/
    // w_400: rộng 400px
    // f_auto: tự chọn format (WebP/AVIF)
    // q_auto: tự nén (giảm 70-80% size)
    return url.replace(
        '/upload/',
        `/upload/w_${width},f_auto,q_auto/`
    );
};

/* ==========================================================
   SIZE CHUẨN CHO CÁC LOẠI ẢNH
========================================================== */

export const IMAGE_SIZES = {
    // ============ PHIM ============
    MOVIE_POSTER_CARD: 300,       // Poster phim trong slider/grid
    MOVIE_POSTER_DETAIL: 600,     // Poster phim trang chi tiết
    MOVIE_BACKDROP: 1200,         // Backdrop banner phim
    MOVIE_THUMBNAIL: 200,         // Thumbnail nhỏ

    // ============ RẠP ============
    CINEMA_CARD: 600,             // Ảnh rạp trong danh sách
    CINEMA_HERO: 1600,            // Ảnh rạp to

    // ============ USER ============
    AVATAR_SMALL: 100,            // Avatar header, comment
    AVATAR_LARGE: 300,            // Avatar profile

    // ============ BLOG / NEWS ============
    BLOG_SMALL: 400,              // Card nhỏ
    BLOG_FEATURED: 800,           // Card nổi bật

    // ============ PROMOTION ============
    PROMOTION_CARD: 600,          // Card khuyến mãi
    PROMOTION_DETAIL: 1200,       // Chi tiết khuyến mãi

    // ============ BANNER ============
    BANNER_HERO: 1600,            // Banner hero
    BANNER_SMALL: 800,            // Banner nhỏ

    // ============ ACTOR ============
    ACTOR_CARD: 300,              // Diễn viên trong danh sách
    ACTOR_DETAIL: 600             // Chi tiết diễn viên
};