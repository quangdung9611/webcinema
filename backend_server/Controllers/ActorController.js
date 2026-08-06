
const ActorService = require("../Services/ActorService");


/* ==========================================================
PUBLIC/ADMIN - GET ALL ACTORS (KHÔNG PHÂN TRANG)
========================================================== */
exports.getAllActorsAll = async (req, res) => {

    try {

        const {
            search = "",
            page,
            limit
        } = req.query;


        // ======================================================
        // KHÔNG CHO PHÉP PHÂN TRANG
        // ======================================================

        if (
            page !== undefined ||
            limit !== undefined
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Route /api/actors không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/actors/paginated để phân trang."

            });

        }


        // ======================================================
        // GET ACTORS
        // ======================================================

        const data =
            await ActorService.getAllActorsAll(
                search
            );


        // ======================================================
        // RESPONSE CHUẨN
        // ======================================================

        return res.status(200).json({

            success: true,

            data: Array.isArray(data)
                ? data
                : []

        });

    } catch (err) {

        console.error(
            "Get All Actors Error:",
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


/* ==========================================================
    ADMIN - GET ACTORS WITH PAGINATION
========================================================== */
exports.getActorsWithPagination = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = ""
        } = req.query;

        const data = await ActorService.getAllActorsPaginated(
            page,
            limit,
            search
        );

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get Actors Paginated Error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    ADMIN - GET ACTOR BY ID
========================================================== */
exports.getActorById = async (req, res) => {
    try {
        const { actor_id } = req.params;

        const actor = await ActorService.getActorById(actor_id);

        return res.status(200).json({
            success: true,
            data: actor
        });
    } catch (err) {
        console.error("Get Actor By ID Error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    PUBLIC - GET ACTOR BY SLUG
========================================================== */
exports.getActorBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const actor = await ActorService.getActorBySlug(slug);

        return res.status(200).json({
            success: true,
            data: actor
        });
    } catch (err) {
        console.error("Get Actor By Slug Error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    ADMIN - CREATE ACTOR
========================================================== */
exports.createActor = async (req, res) => {
    try {
        const actorId = await ActorService.createActor(
            req.body,
            req.file
        );

        return res.status(201).json({
            success: true,
            message: "Thêm diễn viên thành công!",
            data: {
                actor_id: actorId
            }
        });
    } catch (err) {
        console.error("Create Actor Error:", err);

        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    ADMIN - UPDATE ACTOR
========================================================== */
exports.updateActor = async (req, res) => {
    try {
        const { actor_id } = req.params;

        await ActorService.updateActor(
            actor_id,
            req.body,
            req.file
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật diễn viên thành công!"
        });
    } catch (err) {
        console.error("Update Actor Error:", err);

        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/* ==========================================================
    ADMIN - DELETE ACTOR
========================================================== */
exports.deleteActor = async (req, res) => {
    try {
        const { actor_id } = req.params;

        await ActorService.deleteActor(actor_id);

        return res.status(200).json({
            success: true,
            message: "Đã xóa diễn viên thành công."
        });
    } catch (err) {
        console.error("Delete Actor Error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

