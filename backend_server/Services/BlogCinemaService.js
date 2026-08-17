const BlogCinemaRepository = require("../Repositories/BlogCinemaRepository");
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require("../Middlewares/UploadCloudinary");

// ==========================================================
// CREATE SLUG
// ==========================================================
const createSlug = (title) => {
    if (!title) return "";

    return title
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
// CLOUDINARY PUBLIC ID
// ==========================================================
const extractPublicId = (url) => {
    if (!url) return null;

    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");

    if (uploadIndex === -1) return null;

    return parts
        .slice(uploadIndex + 1)
        .join("/")
        .split(".")[0];
};

// ==========================================================
// VALIDATE BLOG DATA
// ==========================================================
const validateBlogData = (data, file, backdropFile, isUpdate = false) => {
    const {
        title,
        description,
        likes
    } = data;

    // TITLE
    if (!title || title.trim() === "") {
        return "Vui lòng nhập tiêu đề.";
    }

    if (title.trim().length < 5) {
        return "Tiêu đề phải từ 5 ký tự.";
    }

    // DESCRIPTION
    if (!description || description.trim() === "") {
        return "Vui lòng nhập mô tả.";
    }

    if (description.trim().length < 10) {
        return "Mô tả quá ngắn.";
    }

    // LIKES
    if (likes !== undefined && likes !== "") {
        const num = Number(likes);

        if (Number.isNaN(num) || num < 0) {
            return "Likes không hợp lệ.";
        }
    }

    // IMAGE (bắt buộc khi tạo mới)
    if (!isUpdate && !file) {
        return "Vui lòng upload ảnh.";
    }

    return null;
};

// ==========================================================
// BLOG CINEMA SERVICE
// ==========================================================
class BlogCinemaService {

    /* ==========================================================
        GET ALL BLOGS - KHÔNG PHÂN TRANG

        Route:
        GET /api/blog-cinema

        Kết quả:
        [
            {...},
            {...}
        ]

        KHÔNG:
        {
            data: [],
            pagination: {}
        }
    ========================================================== */
    async getAllBlogsAll(search = "") {
        return await BlogCinemaRepository.findAllAll(search);
    }

    /* ==========================================================
        GET ALL BLOGS - CÓ PHÂN TRANG

        Route:
        GET /api/blog-cinema/paginated?page=1&limit=20

        Kết quả:
        {
            data: [],
            pagination: {}
        }
    ========================================================== */
    async getAllBlogsPaginated(
        page = 1,
        limit = 20,
        search = ""
    ) {
        return await BlogCinemaRepository.findAll(
            false,
            page,
            limit,
            search
        );
    }

    /* ==========================================================
        GET BLOG BY ID
    ========================================================== */
    async getBlogById(blogId) {

        const blog = await BlogCinemaRepository.findById(blogId);

        if (!blog) {
            const err = new Error("Không tìm thấy blog");
            err.statusCode = 404;
            throw err;
        }

        return blog;
    }

    /* ==========================================================
        GET BLOG BY SLUG
    ========================================================== */
    async getBlogBySlug(slug) {

        const blog = await BlogCinemaRepository.findBySlug(slug);

        if (!blog) {
            const err = new Error("Không tìm thấy blog");
            err.statusCode = 404;
            throw err;
        }

        // Tăng lượt xem
        await BlogCinemaRepository.incrementViews(blog.blog_id);

        return blog;
    }

    /* ==========================================================
        CREATE BLOG
    ========================================================== */
    async createBlog(data, file, backdropFile) {

        const error = validateBlogData(
            data,
            file,
            backdropFile,
            false
        );

        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const {
            title,
            description,
            likes
        } = data;

        // Tạo slug
        const slug = createSlug(title);

        // Kiểm tra trùng title / slug
        const exists =
            await BlogCinemaRepository.existsByTitleOrSlug(
                title.trim(),
                slug
            );

        if (exists) {
            const err = new Error(
                "Tiêu đề hoặc slug đã tồn tại"
            );

            err.statusCode = 400;
            throw err;
        }

        // Upload ảnh
        let blog_image = null;
        let blog_backdrop = null;

        if (file) {
            const result = await uploadToCloudinary(
                file,
                "cinema_shop/blog_cinema"
            );
            blog_image = result.url;
        }

        if (backdropFile) {
            const result = await uploadToCloudinary(
                backdropFile,
                "cinema_shop/blog_cinema/backdrops"
            );
            blog_backdrop = result.url;
        }

        // CREATE
        const blogId =
            await BlogCinemaRepository.create({
                title: title.trim(),
                slug,
                description: description.trim(),
                blog_image,
                blog_backdrop,
                likes: Number(likes) || 0,
                is_active: 1
            });

        return blogId;
    }

    /* ==========================================================
        UPDATE BLOG
    ========================================================== */
    async updateBlog(blogId, data, file, backdropFile) {

        // Lấy blog hiện tại
        const existing =
            await BlogCinemaRepository.findById(blogId);

        if (!existing) {
            const err = new Error(
                "Blog không tồn tại"
            );

            err.statusCode = 404;
            throw err;
        }

        // Validate
        const error = validateBlogData(
            data,
            file,
            backdropFile,
            true
        );

        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const {
            title,
            description,
            likes,
            is_active
        } = data;

        // Tạo slug mới
        const slug = createSlug(title);

        // Kiểm tra trùng
        const exists =
            await BlogCinemaRepository.existsByTitleOrSlug(
                title.trim(),
                slug,
                blogId
            );

        if (exists) {
            const err = new Error(
                "Tiêu đề hoặc slug đã trùng với blog khác"
            );

            err.statusCode = 400;
            throw err;
        }

        // Lấy connection
        const conn =
            await BlogCinemaRepository.getConnection();

        try {

            await BlogCinemaRepository.beginTransaction(
                conn
            );

            // Giữ ảnh cũ nếu không upload ảnh mới
            let blog_image = existing.blog_image;
            let blog_backdrop = existing.blog_backdrop;

            // Upload ảnh mới (chính)
            if (file) {

                // Xóa ảnh cũ trên Cloudinary
                if (existing.blog_image) {

                    const publicId =
                        extractPublicId(
                            existing.blog_image
                        );

                    if (publicId) {
                        await deleteFromCloudinary(
                            publicId
                        );
                    }
                }

                // Upload ảnh mới
                const result =
                    await uploadToCloudinary(
                        file,
                        "cinema_shop/blog_cinema"
                    );

                blog_image = result.url;
            }

            // Upload ảnh backdrop mới
            if (backdropFile) {

                // Xóa backdrop cũ trên Cloudinary
                if (existing.blog_backdrop) {

                    const publicId =
                        extractPublicId(
                            existing.blog_backdrop
                        );

                    if (publicId) {
                        await deleteFromCloudinary(
                            publicId
                        );
                    }
                }

                // Upload backdrop mới
                const result =
                    await uploadToCloudinary(
                        backdropFile,
                        "cinema_shop/blog_cinema/backdrops"
                    );

                blog_backdrop = result.url;
            }

            // UPDATE
            const affected =
                await BlogCinemaRepository.updateWithConnection(
                    conn,
                    blogId,
                    {
                        title: title.trim(),
                        slug,
                        description: description.trim(),
                        blog_image,
                        blog_backdrop,
                        likes: Number(likes) || 0,
                        is_active:
                            is_active !== undefined
                                ? Number(is_active)
                                : existing.is_active
                    }
                );

            if (affected === 0) {
                throw new Error(
                    "Không thể cập nhật blog"
                );
            }

            await BlogCinemaRepository.commit(conn);

            return true;

        } catch (err) {

            await BlogCinemaRepository.rollback(conn);

            throw err;

        } finally {

            conn.release();
        }
    }

    /* ==========================================================
        DELETE BLOG
    ========================================================== */
    async deleteBlog(blogId) {

        // Kiểm tra blog
        const existing =
            await BlogCinemaRepository.findById(blogId);

        if (!existing) {
            const err = new Error(
                "Blog không tồn tại"
            );

            err.statusCode = 404;
            throw err;
        }

        const conn =
            await BlogCinemaRepository.getConnection();

        try {

            await BlogCinemaRepository.beginTransaction(
                conn
            );

            // Xóa ảnh Cloudinary (cả ảnh chính và backdrop)
            if (existing.blog_image) {

                const publicId =
                    extractPublicId(
                        existing.blog_image
                    );

                if (publicId) {
                    await deleteFromCloudinary(
                        publicId
                    );
                }
            }

            if (existing.blog_backdrop) {

                const publicId =
                    extractPublicId(
                        existing.blog_backdrop
                    );

                if (publicId) {
                    await deleteFromCloudinary(
                        publicId
                    );
                }
            }

            // Xóa database
            const affected =
                await BlogCinemaRepository.deleteWithConnection(
                    conn,
                    blogId
                );

            if (affected === 0) {
                throw new Error(
                    "Xóa blog thất bại"
                );
            }

            await BlogCinemaRepository.commit(conn);

            return true;

        } catch (err) {

            await BlogCinemaRepository.rollback(conn);

            throw err;

        } finally {

            conn.release();
        }
    }

    /* ==========================================================
        LIKE BLOG
    ========================================================== */
    async likeBlog(blogId) {

        const affected =
            await BlogCinemaRepository.incrementLikes(
                blogId
            );

        if (affected === 0) {

            const err = new Error(
                "Không tìm thấy blog"
            );

            err.statusCode = 404;

            throw err;
        }

        return true;
    }
}

module.exports = new BlogCinemaService();