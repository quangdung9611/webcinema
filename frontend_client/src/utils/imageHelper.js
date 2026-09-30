/* ==========================================================
   IMAGE HELPER — Tối ưu ảnh Cloudinary
   ----------------------------------------------------------
   Quy chuẩn kích thước:
   - ẢNH DỌC  (portrait)  : 500 x 750  → tỉ lệ 2/3
   - ẢNH NGANG (landscape) : 1600 x 900 → tỉ lệ 16/9
   ========================================================== */

/**
 * Tối ưu ảnh Cloudinary
 *
 * @param {string} url  - URL ảnh Cloudinary
 * @param {number|{width:number, height?:number}} size
 *        - Nếu là number  → chỉ resize theo chiều rộng (backward compat)
 *        - Nếu là object  → resize chính xác w×h + crop fill
 * @returns {string} - URL đã tối ưu
 */
export const optimizeCloudinary = (url, size) => {
    if (!url) return url;

    // Chỉ áp dụng cho ảnh Cloudinary
    if (!url.includes('cloudinary.com')) {
        return url;
    }

    // Nếu URL đã có params tối ưu rồi → trả nguyên
    if (url.includes('/w_') || url.includes('/q_auto')) {
        return url;
    }

    // Chuẩn hoá tham số đầu vào
    let width, height;

    if (typeof size === 'number') {
        width = size;
    } else if (size && typeof size === 'object') {
        width = size.width;
        height = size.height;
    }

    if (!width) return url;

    // Build transformation string
    const transforms = [`w_${width}`];

    if (height) {
        // Có cả w và h → crop chính xác theo khung
        transforms.push(`h_${height}`, 'c_fill', 'g_auto');
    }

    // Luôn có: tự chọn format (WebP/AVIF) + tự nén
    transforms.push('f_auto', 'q_auto');

    return url.replace(
        '/upload/',
        `/upload/${transforms.join(',')}/`
    );
};

/* ==========================================================
   SIZE CHUẨN CHO CÁC LOẠI ẢNH
   ----------------------------------------------------------
   Dọc  : { width: 500,  height: 750 }   → 2/3
   Ngang: { width: 1600, height: 900 }   → 16/9
   ========================================================== */

const PORTRAIT  = { width: 500,  height: 750  }; // 2/3
const LANDSCAPE = { width: 1600, height: 900  }; // 16/9

export const IMAGE_SIZES = {
    // ============ PHIM ============
    MOVIE_POSTER_CARD:   PORTRAIT,   // Poster dọc trong slider/grid
    MOVIE_POSTER_DETAIL: PORTRAIT,   // Poster dọc trang chi tiết
    MOVIE_BACKDROP:      LANDSCAPE,  // Backdrop ngang
    MOVIE_THUMBNAIL:     PORTRAIT,   // Thumbnail dọc

    // ============ RẠP ============
    CINEMA_CARD: LANDSCAPE,          // Ảnh rạp (ngang 16/9)
    CINEMA_HERO: LANDSCAPE,          // Hero ảnh rạp

    // ============ USER ============
    AVATAR_SMALL: { width: 100,  height: 100 },  // Vuông 1/1
    AVATAR_LARGE: { width: 300,  height: 300 },  // Vuông 1/1

    // ============ BLOG / NEWS ============
    BLOG_SMALL:    PORTRAIT,         // Card dọc 2/3
    BLOG_FEATURED: LANDSCAPE,        // Card nổi bật ngang

    // ============ PROMOTION ============
    PROMOTION_CARD:   PORTRAIT,      // Card khuyến mãi dọc 2/3
    PROMOTION_DETAIL: PORTRAIT,      // Chi tiết khuyến mãi (ảnh dọc)

    // ============ BANNER ============
    BANNER_HERO:  LANDSCAPE,         // Banner hero ngang 16/9
    BANNER_SMALL: LANDSCAPE,         // Banner nhỏ ngang

    // ============ ACTOR ============
    ACTOR_CARD:   PORTRAIT,          // Diễn viên dọc 2/3
    ACTOR_DETAIL: PORTRAIT           // Chi tiết diễn viên
};