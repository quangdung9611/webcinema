
const ActorRepository =
    require("../Repositories/ActorRepository");

const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require("../Middlewares/UploadCloudinary");


/* ==========================================================
    CREATE SLUG
========================================================== */
const createSlug = (name) => {

    if (!name) {
        return "";
    }

    return name
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[đĐ]/g,
            "d"
        )
        .replace(
            /[^\w\s-]/g,
            ""
        )
        .replace(
            /[\s_-]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            "");

};


/* ==========================================================
    CLOUDINARY PUBLIC ID
========================================================== */
const extractPublicId = (url) => {

    if (!url) {
        return null;
    }

    const parts =
        url.split("/");


    const uploadIndex =
        parts.indexOf("upload");


    if (uploadIndex === -1) {
        return null;
    }


    return parts
        .slice(uploadIndex + 1)
        .join("/")
        .split(".")[0];

};


/* ==========================================================
    VALIDATE ACTOR DATA
========================================================== */
const validateActorData = (
    data,
    file,
    isUpdate = false
) => {

    const {
        name,
        gender,
        nationality,
        biography,
        birthday
    } = data;


    // NAME
    if (
        !name ||
        name.trim() === ""
    ) {

        return "Vui lòng nhập tên diễn viên.";

    }


    if (
        name.trim().length < 2
    ) {

        return "Tên diễn viên phải từ 2 ký tự trở lên.";

    }


    // GENDER
    if (
        !gender ||
        ![
            "Nam",
            "Nữ",
            "Khác"
        ].includes(gender)
    ) {

        return "Giới tính không hợp lệ (Nam, Nữ, Khác).";

    }


    // NATIONALITY
    if (
        !nationality ||
        nationality.trim() === ""
    ) {

        return "Vui lòng nhập quốc tịch.";

    }


    // BIRTHDAY
    if (!birthday) {

        return "Vui lòng chọn ngày sinh.";

    }


    const inputDate =
        new Date(birthday);


    if (
        Number.isNaN(
            inputDate.getTime()
        )
    ) {

        return "Định dạng ngày sinh không hợp lệ.";

    }


    if (
        inputDate > new Date()
    ) {

        return "Ngày sinh không được lớn hơn ngày hiện tại.";

    }


    // BIOGRAPHY
    if (
        !biography ||
        biography.trim() === ""
    ) {

        return "Vui lòng điền tiểu sử.";

    }


    // AVATAR
    if (
        !isUpdate &&
        !file
    ) {

        return "Vui lòng upload ảnh đại diện.";

    }


    return null;

};


/* ==========================================================
    ACTOR SERVICE
========================================================== */
class ActorService {


    /* ======================================================
        GET ALL ACTORS
        KHÔNG PHÂN TRANG
        PUBLIC
    ====================================================== */
    async getAllActorsAll(
        search = ""
    ) {

        return await ActorRepository.findAllAll(
            search
        );

    }


    /* ======================================================
        GET ALL ACTORS
        CÓ PHÂN TRANG
        ADMIN
    ====================================================== */
    async getAllActorsPaginated(
        page = 1,
        limit = 20,
        search = ""
    ) {

        return await ActorRepository.findAll(
            page,
            limit,
            search
        );

    }


    /* ======================================================
        GET ACTOR BY ID
        ADMIN
    ====================================================== */
    async getActorById(
        actorId
    ) {

        const actor =
            await ActorRepository.findById(
                actorId
            );


        if (!actor) {

            const err =
                new Error(
                    "Không tìm thấy diễn viên"
                );

            err.statusCode = 404;

            throw err;

        }


        return actor;

    }


    /* ======================================================
        GET ACTOR BY SLUG
        PUBLIC
    ====================================================== */
    async getActorBySlug(
        slug
    ) {

        const actor =
            await ActorRepository.findBySlugWithMovies(
                slug
            );


        if (!actor) {

            const err =
                new Error(
                    "Không tìm thấy diễn viên"
                );

            err.statusCode = 404;

            throw err;

        }


        return actor;

    }


    /* ======================================================
        CREATE ACTOR
        ADMIN
    ====================================================== */
    async createActor(
        data,
        file
    ) {

        const {
            name,
            gender,
            nationality,
            biography,
            birthday,
            slug: providedSlug
        } = data;


        // VALIDATE
        const error =
            validateActorData(
                data,
                file,
                false
            );


        if (error) {

            const err =
                new Error(error);

            err.statusCode = 400;

            throw err;

        }


        // CREATE SLUG
        const slug =
            providedSlug &&
            providedSlug.trim()
                ? createSlug(
                    providedSlug
                )
                : createSlug(
                    name
                );


        // CHECK DUPLICATE
        const exists =
            await ActorRepository.existsByNameOrSlug(
                name.trim(),
                slug
            );


        if (exists) {

            const err =
                new Error(
                    "Tên hoặc slug đã tồn tại"
                );

            err.statusCode = 400;

            throw err;

        }


        // UPLOAD AVATAR
        let actorAvatar = null;


        if (file) {

            const result =
                await uploadToCloudinary(
                    file,
                    "cinema_shop/actors"
                );


            actorAvatar =
                result.url;

        }


        // CREATE
        return await ActorRepository.create({

            name:
                name.trim(),

            slug,

            gender,

            nationality:
                nationality.trim(),

            actor_avatar:
                actorAvatar,

            biography:
                biography.trim(),

            birthday

        });

    }


    /* ======================================================
        UPDATE ACTOR
        ADMIN
    ====================================================== */
    async updateActor(
        actorId,
        data,
        file
    ) {

        // GET EXISTING ACTOR
        const existing =
            await ActorRepository.findById(
                actorId
            );


        if (!existing) {

            const err =
                new Error(
                    "Diễn viên không tồn tại"
                );

            err.statusCode = 404;

            throw err;

        }


        const {
            name,
            gender,
            nationality,
            biography,
            birthday,
            slug: providedSlug
        } = data;


        // VALIDATE
        const error =
            validateActorData(
                data,
                file,
                true
            );


        if (error) {

            const err =
                new Error(error);

            err.statusCode = 400;

            throw err;

        }


        // CREATE SLUG
        const slug =
            providedSlug &&
            providedSlug.trim()
                ? createSlug(
                    providedSlug
                )
                : createSlug(
                    name
                );


        // CHECK DUPLICATE
        const exists =
            await ActorRepository.existsByNameOrSlug(
                name.trim(),
                slug,
                actorId
            );


        if (exists) {

            const err =
                new Error(
                    "Tên hoặc slug đã trùng với diễn viên khác"
                );

            err.statusCode = 400;

            throw err;

        }


        // GET CONNECTION
        const connection =
            await ActorRepository.getConnection();


        try {

            // BEGIN TRANSACTION
            await ActorRepository.beginTransaction(
                connection
            );


            // GIỮ AVATAR CŨ
            let actorAvatar =
                existing.actor_avatar;


            // UPLOAD AVATAR MỚI
            if (file) {

                // XÓA ẢNH CŨ
                if (
                    existing.actor_avatar
                ) {

                    const publicId =
                        extractPublicId(
                            existing.actor_avatar
                        );


                    if (publicId) {

                        await deleteFromCloudinary(
                            publicId
                        );

                    }

                }


                // UPLOAD ẢNH MỚI
                const result =
                    await uploadToCloudinary(
                        file,
                        "cinema_shop/actors"
                    );


                actorAvatar =
                    result.url;

            }


            // UPDATE DATABASE
            const affectedRows =
                await ActorRepository.updateWithConnection(
                    connection,
                    actorId,
                    {
                        name:
                            name.trim(),

                        slug,

                        gender,

                        nationality:
                            nationality.trim(),

                        actor_avatar:
                            actorAvatar,

                        biography:
                            biography.trim(),

                        birthday
                    }
                );


            if (
                affectedRows === 0
            ) {

                throw new Error(
                    "Cập nhật diễn viên thất bại"
                );

            }


            // COMMIT
            await ActorRepository.commit(
                connection
            );


            return true;

        } catch (err) {

            // ROLLBACK
            await ActorRepository.rollback(
                connection
            );

            throw err;

        } finally {

            connection.release();

        }

    }


    /* ======================================================
        DELETE ACTOR
        ADMIN
    ====================================================== */
    async deleteActor(
        actorId
    ) {

        // GET EXISTING ACTOR
        const existing =
            await ActorRepository.findById(
                actorId
            );


        if (!existing) {

            const err =
                new Error(
                    "Diễn viên không tồn tại"
                );

            err.statusCode = 404;

            throw err;

        }


        // GET CONNECTION
        const connection =
            await ActorRepository.getConnection();


        try {

            // BEGIN TRANSACTION
            await ActorRepository.beginTransaction(
                connection
            );


            // DELETE CLOUDINARY IMAGE
            if (
                existing.actor_avatar
            ) {

                const publicId =
                    extractPublicId(
                        existing.actor_avatar
                    );


                if (publicId) {

                    await deleteFromCloudinary(
                        publicId
                    );

                }

            }


            // DELETE DATABASE
            const affectedRows =
                await ActorRepository.deleteWithConnection(
                    connection,
                    actorId
                );


            if (
                affectedRows === 0
            ) {

                throw new Error(
                    "Xóa diễn viên thất bại"
                );

            }


            // COMMIT
            await ActorRepository.commit(
                connection
            );


            return true;

        } catch (err) {

            // ROLLBACK
            await ActorRepository.rollback(
                connection
            );

            throw err;

        } finally {

            connection.release();

        }

    }

}


module.exports =
    new ActorService();

