const ActorRepository = require("../Repositories/ActorRepository");
const { uploadToCloudinary, deleteFromCloudinary } = require("../Middlewares/UploadCloudinary");

const createSlug = (name) => {
    if (!name) return "";
    return name
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
};

const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;
    return parts.slice(uploadIndex + 1).join("/").split(".")[0];
};

const validateActorData = (data, file, isUpdate = false) => {
    const { name, gender, nationality, biography, birthday } = data;
    if (!name || name.trim() === "") return "Vui lòng nhập tên diễn viên.";
    if (name.trim().length < 2) return "Tên diễn viên phải từ 2 ký tự trở lên.";
    if (!gender || !["Nam", "Nữ", "Khác"].includes(gender)) return "Giới tính không hợp lệ (Nam, Nữ, Khác).";
    if (!nationality || nationality.trim() === "") return "Vui lòng nhập quốc tịch.";
    if (!birthday) return "Vui lòng chọn ngày sinh.";
    const inputDate = new Date(birthday);
    if (isNaN(inputDate.getTime())) return "Định dạng ngày sinh không hợp lệ.";
    if (inputDate > new Date()) return "Ngày sinh không được lớn hơn ngày hiện tại.";
    if (!biography || biography.trim() === "") return "Vui lòng điền tiểu sử.";
    if (!isUpdate && !file) return "Vui lòng upload ảnh đại diện.";
    return null;
};

class ActorService {

    /* ==========================================================
        GET ALL ACTORS - KHÔNG PHÂN TRANG (DÙNG CHUNG)
    ========================================================== */
    async getAllActorsAll(search = "") {
        return await ActorRepository.findAllAll(search);
    }

    /* ==========================================================
        GET ALL ACTORS - CÓ PHÂN TRANG (ADMIN)
    ========================================================== */
    async getAllActorsPaginated(page = 1, limit = 20, search = "") {
        return await ActorRepository.findAll(page, limit, search);
    }

    /* ==========================================================
        GET ACTOR BY ID (ADMIN)
    ========================================================== */
    async getActorById(actorId) {
        const actor = await ActorRepository.findById(actorId);
        if (!actor) {
            const err = new Error("Không tìm thấy diễn viên");
            err.statusCode = 404;
            throw err;
        }
        return actor;
    }

    /* ==========================================================
        GET ACTOR BY SLUG (PUBLIC)
    ========================================================== */
    async getActorBySlug(slug) {
        const actor = await ActorRepository.findBySlugWithMovies(slug);
        if (!actor) {
            const err = new Error("Không tìm thấy diễn viên");
            err.statusCode = 404;
            throw err;
        }
        return actor;
    }

    /* ==========================================================
        CREATE ACTOR (ADMIN)
    ========================================================== */
    async createActor(data, file) {
        const { name, gender, nationality, biography, birthday, slug: providedSlug } = data;
        const error = validateActorData(data, file, false);
        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const slug = providedSlug && providedSlug.trim() ? providedSlug.trim() : createSlug(name);
        const exists = await ActorRepository.existsByNameOrSlug(name.trim(), slug);
        if (exists) {
            const err = new Error("Tên hoặc slug đã tồn tại");
            err.statusCode = 400;
            throw err;
        }

        let actorAvatar = null;
        if (file) {
            const result = await uploadToCloudinary(file, "cinema_shop/actors");
            actorAvatar = result.url;
        }

        return await ActorRepository.create({
            name: name.trim(),
            slug,
            gender,
            nationality: nationality.trim(),
            actor_avatar: actorAvatar,
            biography: biography.trim(),
            birthday,
        });
    }

    /* ==========================================================
        UPDATE ACTOR (ADMIN)
    ========================================================== */
    async updateActor(actorId, data, file) {
        const existing = await ActorRepository.findById(actorId);
        if (!existing) {
            const err = new Error("Diễn viên không tồn tại");
            err.statusCode = 404;
            throw err;
        }

        const { name, gender, nationality, biography, birthday, slug: providedSlug } = data;
        const error = validateActorData(data, file, true);
        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const slug = (providedSlug && providedSlug.trim() ? providedSlug.trim() : createSlug(name)).toLowerCase();
        const exists = await ActorRepository.existsByNameOrSlug(name.trim(), slug, actorId);
        if (exists) {
            const err = new Error("Tên hoặc slug đã trùng với diễn viên khác");
            err.statusCode = 400;
            throw err;
        }

        const conn = await ActorRepository.getConnection();
        try {
            await ActorRepository.beginTransaction(conn);
            let actorAvatar = existing.actor_avatar;
            if (file) {
                if (existing.actor_avatar) {
                    const publicId = extractPublicId(existing.actor_avatar);
                    await deleteFromCloudinary(publicId);
                }
                const result = await uploadToCloudinary(file, "cinema_shop/actors");
                actorAvatar = result.url;
            }

            await ActorRepository.updateWithConnection(conn, actorId, {
                name: name.trim(),
                slug,
                gender,
                nationality: nationality.trim(),
                actor_avatar: actorAvatar,
                biography: biography.trim(),
                birthday,
            });

            await ActorRepository.commit(conn);
            return true;
        } catch (err) {
            await ActorRepository.rollback(conn);
            throw err;
        } finally {
            conn.release();
        }
    }

    /* ==========================================================
        DELETE ACTOR (ADMIN)
    ========================================================== */
    async deleteActor(actorId) {
        const existing = await ActorRepository.findById(actorId);
        if (!existing) {
            const err = new Error("Diễn viên không tồn tại");
            err.statusCode = 404;
            throw err;
        }

        const conn = await ActorRepository.getConnection();
        try {
            await ActorRepository.beginTransaction(conn);
            if (existing.actor_avatar) {
                const publicId = extractPublicId(existing.actor_avatar);
                await deleteFromCloudinary(publicId);
            }
            await ActorRepository.deleteWithConnection(conn, actorId);
            await ActorRepository.commit(conn);
            return true;
        } catch (err) {
            await ActorRepository.rollback(conn);
            throw err;
        } finally {
            conn.release();
        }
    }
}

module.exports = new ActorService();