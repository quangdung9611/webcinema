const db = require('../Config/db');

/**
 * =========================================================
 * 1. GỬI ĐÁNH GIÁ / BÌNH LUẬN
 * =========================================================
 */

exports.sendReview = async (
    req,
    res
) => {

    try {

        const {
            movie_id,
            user_id,
            rating,
            comment
        } = req.body;

        /* VALIDATE */

        if (
            !movie_id ||
            !user_id ||
            !rating
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Thiếu thông tin phim, người dùng hoặc điểm đánh giá"

            });

        }

        /* CHECK RATING */

        const numericRating =
            Number(rating);

        if (
            numericRating < 1 ||
            numericRating > 5
        ) {

            return res.status(400).json({

                success: false,

                field:
                    'rating',

                message:
                    "Điểm đánh giá phải từ 1 đến 5"

            });

        }

        /* CLEAN COMMENT */

        const cleanComment =
            comment?.trim() || null;

        /* INSERT REVIEW */

        const sql = `
            INSERT INTO reviews
            (
                movie_id,
                user_id,
                rating_score,
                comment
            )
            VALUES (?, ?, ?, ?)
        `;

        await db.query(
            sql,
            [
                movie_id,
                user_id,
                numericRating,
                cleanComment
            ]
        );

        return res.status(201).json({

            success: true,

            message:
                "Đánh giá của bạn đã được lưu thành công!"

        });

    } catch (error) {

        console.error(
            "Send Review Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Lỗi hệ thống: " +
                error.message

        });

    }

};

/**
 * =========================================================
 * 2. LẤY DANH SÁCH BÌNH LUẬN THEO PHIM
 * =========================================================
 */

exports.getReviewsByMovie = async (
    req,
    res
) => {

    try {

        const {
            movie_id
        } = req.params;

        const sql = `
            SELECT
                r.review_id,
                r.movie_id,
                r.user_id,
                r.rating_score,
                r.comment,

                DATE_FORMAT(
                    r.created_at,
                    '%d/%m/%Y %H:%i'
                ) AS formatted_date,

                u.username,
                u.full_name,

                IFNULL(
                    u.full_name,
                    u.username
                ) AS display_name

            FROM reviews r

            JOIN users u
                ON r.user_id = u.user_id

            WHERE r.movie_id = ?

            ORDER BY
                r.created_at DESC
        `;

        const [results] =
            await db.query(
                sql,
                [movie_id]
            );

        return res.status(200).json(
            results
        );

    } catch (error) {

        console.error(
            "Get Reviews Error:",
            error
        );

        return res.status(200).json([]);

    }

};