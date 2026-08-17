const BlogCinemaService = require("../Services/BlogCinemaService");


// ==========================================================
// PUBLIC / ADMIN - GET ALL BLOGS
// KHÔNG PHÂN TRANG
// ==========================================================
exports.getAllBlogsAll = async (req, res) => {

    try {

        const {
            search = "",
            page,
            limit
        } = req.query;


        // Không cho phép page / limit ở API thường
        if (
            page !== undefined ||
            limit !== undefined
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Route /api/blog-cinema không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/blog-cinema/paginated để phân trang."

            });
        }


        const data =
            await BlogCinemaService.getAllBlogsAll(
                search
            );


        return res.status(200).json({

            success: true,

            data

        });


    } catch (err) {

        console.error(
            "Get All Blogs Error:",
            err
        );


        return res.status(
            err.statusCode || 500
        ).json({

            success: false,

            message:
                err.message ||
                "Lỗi máy chủ"

        });
    }
};


// ==========================================================
// ADMIN - GET BLOGS WITH PAGINATION
// ==========================================================
exports.getBlogsWithPagination = async (
    req,
    res
) => {

    try {

        const {
            page = 1,
            limit = 20,
            search = ""
        } = req.query;


        const result =
            await BlogCinemaService.getAllBlogsPaginated(
                page,
                limit,
                search
            );


        return res.status(200).json({

            success: true,

            data:
                result.data,

            pagination:
                result.pagination

        });


    } catch (err) {

        console.error(
            "Get Blogs Paginated Error:",
            err
        );


        return res.status(
            err.statusCode || 500
        ).json({

            success: false,

            message:
                err.message ||
                "Lỗi máy chủ"

        });
    }
};


// ==========================================================
// ADMIN - GET BLOG BY ID
// ==========================================================
exports.getBlogById = async (
    req,
    res
) => {

    try {

        const {
            blog_id
        } = req.params;


        const blog =
            await BlogCinemaService.getBlogById(
                blog_id
            );


        return res.status(200).json({

            success: true,

            data: blog

        });


    } catch (err) {

        console.error(
            "Get Blog By ID Error:",
            err
        );


        return res.status(
            err.statusCode || 500
        ).json({

            success: false,

            message:
                err.message ||
                "Lỗi máy chủ"

        });
    }
};


// ==========================================================
// PUBLIC - GET BLOG BY SLUG
// ==========================================================
exports.getBlogBySlug = async (
    req,
    res
) => {

    try {

        const {
            slug
        } = req.params;


        const blog =
            await BlogCinemaService.getBlogBySlug(
                slug
            );


        return res.status(200).json({

            success: true,

            data: blog

        });


    } catch (err) {

        console.error(
            "Get Blog By Slug Error:",
            err
        );


        return res.status(
            err.statusCode || 500
        ).json({

            success: false,

            message:
                err.message ||
                "Lỗi máy chủ"

        });
    }
};


// ==========================================================
// ADMIN - CREATE BLOG
// ==========================================================
exports.createBlog = async (
    req,
    res
) => {

    try {

        // req.file - ảnh chính (vuông)
        // req.files?.backdrop - ảnh backdrop (ngang)
        const imageFile = req.file;
        const backdropFile = req.files?.backdrop ? req.files.backdrop[0] : req.fileBackdrop;

        const blogId =
            await BlogCinemaService.createBlog(
                req.body,
                imageFile,
                backdropFile
            );


        return res.status(201).json({

            success: true,

            message:
                "Thêm blog thành công!",

            data: {
                blog_id: blogId
            }

        });


    } catch (err) {

        console.error(
            "Create Blog Error:",
            err
        );


        return res.status(
            err.statusCode || 500
        ).json({

            success: false,

            message:
                err.message ||
                "Lỗi máy chủ"

        });
    }
};


// ==========================================================
// ADMIN - UPDATE BLOG
// ==========================================================
exports.updateBlog = async (
    req,
    res
) => {

    try {

        const {
            blog_id
        } = req.params;

        const imageFile = req.file;
        const backdropFile = req.files?.backdrop ? req.files.backdrop[0] : req.fileBackdrop;

        await BlogCinemaService.updateBlog(
            blog_id,
            req.body,
            imageFile,
            backdropFile
        );


        return res.status(200).json({

            success: true,

            message:
                "Cập nhật blog thành công!"

        });


    } catch (err) {

        console.error(
            "Update Blog Error:",
            err
        );


        return res.status(
            err.statusCode || 500
        ).json({

            success: false,

            message:
                err.message ||
                "Lỗi máy chủ"

        });
    }
};


// ==========================================================
// ADMIN - DELETE BLOG
// ==========================================================
exports.deleteBlog = async (
    req,
    res
) => {

    try {

        const {
            blog_id
        } = req.params;


        await BlogCinemaService.deleteBlog(
            blog_id
        );


        return res.status(200).json({

            success: true,

            message:
                "Đã xóa blog thành công."

        });


    } catch (err) {

        console.error(
            "Delete Blog Error:",
            err
        );


        return res.status(
            err.statusCode || 500
        ).json({

            success: false,

            message:
                err.message ||
                "Lỗi máy chủ"

        });
    }
};


// ==========================================================
// PUBLIC - INCREASE LIKE
// ==========================================================
exports.increaseLike = async (
    req,
    res
) => {

    try {

        const {
            blog_id
        } = req.params;


        await BlogCinemaService.likeBlog(
            blog_id
        );


        return res.status(200).json({

            success: true,

            message:
                "Đã tăng lượt thích!"

        });


    } catch (err) {

        console.error(
            "Increase Blog Like Error:",
            err
        );


        return res.status(
            err.statusCode || 500
        ).json({

            success: false,

            message:
                err.message ||
                "Lỗi máy chủ"

        });
    }
};