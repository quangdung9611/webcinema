const db = require('../Config/db');
const fs = require('fs');
const path = require('path');

// ==========================================================
// IMPORT CLOUDINARY HELPERS
// ==========================================================
const { uploadToCloudinary, deleteFromCloudinary } = require('../Middlewares/UploadCloudinary');

/* ==========================================================
    1. HELPERS & VALIDATION UTILS
   ========================================================== */

/**
 * Tạo slug từ tên diễn viên (Dùng chung logic với Movie)
 */
const createSlug = (name) => {
    if (!name) {
        return "";
    }
    return name
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Validate dữ liệu đầu vào cho Diễn viên
 */
const validateActorData = (data, file, isUpdate = false) => {
    const { 
        name, 
        gender, 
        nationality, 
        biography, 
        birthday 
    } = data;

    // 1. Kiểm tra Tên diễn viên
    if (!name || name.trim() === "") {
        return "Vui lòng nhập tên diễn viên.";
    }
    if (name.trim().length < 2) {
        return "Tên diễn viên phải từ 2 ký tự trở lên.";
    }

    // 2. Kiểm tra Giới tính
    if (!gender || gender.trim() === "") {
        return "Vui lòng chọn giới tính cho diễn viên.";
    }
    const validGenders = ['Nam', 'Nữ', 'Khác'];
    if (!validGenders.includes(gender)) {
        return "Giới tính không hợp lệ (Nam, Nữ, Khác).";
    }

    // 3. Kiểm tra Quốc tịch
    if (!nationality || nationality.trim() === "") {
        return "Vui lòng nhập quốc tịch của diễn viên.";
    }

    // 4. Kiểm tra Ngày sinh
    if (!birthday || birthday.trim() === "") {
        return "Vui lòng chọn ngày sinh của diễn viên.";
    } else {
        const inputDate = new Date(birthday);
        const today = new Date();
        if (isNaN(inputDate.getTime())) {
            return "Định dạng ngày sinh không hợp lệ.";
        }
        if (inputDate > today) {
            return "Ngày sinh không thể lớn hơn ngày hiện tại.";
        }
    }

    // 5. Kiểm tra Tiểu sử
    if (!biography || biography.trim() === "") {
        return "Vui lòng điền tiểu sử của diễn viên.";
    }

    // 6. Kiểm tra ảnh đại diện khi thêm mới (cột actor_avatar)
    if (!isUpdate && !file) {
        return "Vui lòng upload ảnh đại diện cho diễn viên.";
    }

    return null;
};

/**
 * Trích xuất public_id từ URL Cloudinary
 */
const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    const publicId = parts.slice(uploadIndex + 1).join('/').split('.')[0];
    return publicId;
};

/* ==========================================================
    2. CONTROLLER FUNCTIONS
   ========================================================== */

// [GET] /api/actors - Lấy danh sách toàn bộ diễn viên
exports.getAllActors = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                actor_id,
                name,
                gender,
                nationality,
                actor_avatar,
                biography,
                birthday,
                slug,
                created_at,
                updated_at
             FROM actors 
             ORDER BY actor_id DESC`
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error getAllActors:", error);
        res.status(500).json({ 
            error: "Lỗi khi lấy danh sách diễn viên." 
        });
    }
};

// [GET] /api/actors/id/:id - Lấy chi tiết theo ID (Dùng cho Admin Edit)
exports.getActorById = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                actor_id,
                name,
                gender,
                nationality,
                actor_avatar,
                biography,
                birthday,
                slug,
                created_at,
                updated_at
             FROM actors 
             WHERE actor_id = ?`, 
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ 
                error: "Không tìm thấy diễn viên." 
            });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ 
            error: "Lỗi hệ thống khi lấy chi tiết diễn viên." 
        });
    }
};

// [GET] /api/actors/slug/:slug - Lấy chi tiết diễn viên + Danh sách phim họ tham gia
exports.getActorBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const [actorRows] = await db.query(
            `SELECT 
                actor_id,
                name,
                gender,
                nationality,
                actor_avatar,
                biography,
                birthday,
                slug,
                created_at,
                updated_at
             FROM actors 
             WHERE slug = ?`, 
            [slug]
        );
        const actor = actorRows[0];

        if (!actor) {
            return res.status(404).json({ 
                message: "Không tìm thấy diễn viên" 
            });
        }

        const [movies] = await db.query(
            `SELECT 
                m.movie_id, 
                m.title, 
                m.slug, 
                m.movie_poster, 
                m.release_date
            FROM movies m
            JOIN movie_actors ma ON m.movie_id = ma.movie_id
            WHERE ma.actor_id = ?
            ORDER BY m.release_date DESC`, 
            [actor.actor_id]
        );

        actor.movies = movies;
        res.status(200).json(actor);
    } catch (error) {
        console.error("Lỗi getActorBySlug:", error);
        res.status(500).json({ 
            error: error.message 
        });
    }
};

// [POST] /api/actors/add - Thêm diễn viên mới (CLOUDINARY)
exports.addActor = async (req, res) => {
    const { 
        name, 
        gender, 
        nationality, 
        biography, 
        birthday 
    } = req.body;

    // 1. Validate dữ liệu
    const errorMsg = validateActorData(req.body, req.file, false);
    if (errorMsg) {
        return res.status(400).json({ 
            error: errorMsg 
        });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const actorSlug = createSlug(name);

        // Kiểm tra xem tên hoặc slug này đã tồn tại chưa
        const [existingActor] = await connection.query(
            "SELECT actor_id FROM actors WHERE name = ? OR slug = ?", 
            [
                name.trim(), 
                actorSlug
            ]
        );

        if (existingActor.length > 0) {
            await connection.rollback();
            return res.status(400).json({ 
                error: "Tên hoặc slug của diễn viên này đã tồn tại trong hệ thống." 
            });
        }

        // Upload avatar lên Cloudinary
        let actorAvatar = null;
        if (req.file) {
            const result = await uploadToCloudinary(req.file, 'cinema_shop/actors');
            actorAvatar = result.url;
        }

        await connection.query(
            `INSERT INTO actors (
                name, 
                slug, 
                gender, 
                nationality, 
                actor_avatar, 
                biography, 
                birthday
             ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(), 
                actorSlug, 
                gender, 
                nationality.trim(), 
                actorAvatar, 
                biography.trim(), 
                birthday
            ]
        );

        await connection.commit();
        res.status(201).json({ 
            message: "Thêm diễn viên thành công!" 
        });
    } catch (error) {
        await connection.rollback();
        console.error("❌ Add actor error:", error);
        res.status(500).json({ 
            error: error.message 
        });
    } finally {
        connection.release();
    }
};

// [PUT] /api/actors/update/:id - Cập nhật thông tin diễn viên (CLOUDINARY)
exports.updateActor = async (req, res) => {
    const { id } = req.params;
    const { 
        name, 
        gender, 
        nationality, 
        biography, 
        birthday 
    } = req.body;
    
    // 1. Validate dữ liệu cơ bản
    const errorMsg = validateActorData(req.body, req.file, true);
    if (errorMsg) {
        return res.status(400).json({ 
            error: errorMsg 
        });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 2. Kiểm tra diễn viên mục tiêu có tồn tại hay không
        const [old] = await connection.query(
            "SELECT actor_avatar FROM actors WHERE actor_id = ?", 
            [id]
        );
        if (old.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                error: "Diễn viên không tồn tại." 
            });
        }

        const actorSlug = createSlug(name);

        // Kiểm tra trùng tên hoặc slug với AI KHÁC
        const [duplicateActor] = await connection.query(
            "SELECT actor_id FROM actors WHERE (name = ? OR slug = ?) AND actor_id != ?", 
            [
                name.trim(), 
                actorSlug, 
                id
            ]
        );

        if (duplicateActor.length > 0) {
            await connection.rollback();
            return res.status(400).json({ 
                error: "Tên hoặc đường dẫn slug của diễn viên đã bị trùng với một diễn viên khác." 
            });
        }

        // Xử lý ảnh với Cloudinary
        let newAvatar = old[0].actor_avatar;

        if (req.file) {
            // Xóa ảnh cũ trên Cloudinary
            if (old[0].actor_avatar) {
                const publicId = extractPublicId(old[0].actor_avatar);
                await deleteFromCloudinary(publicId);
            }
            // Upload ảnh mới
            const result = await uploadToCloudinary(req.file, 'cinema_shop/actors');
            newAvatar = result.url;
        }

        await connection.query(
            `UPDATE actors SET 
                name = ?, 
                slug = ?, 
                gender = ?, 
                nationality = ?, 
                actor_avatar = ?, 
                biography = ?, 
                birthday = ? 
             WHERE actor_id = ?`,
            [
                name.trim(), 
                actorSlug, 
                gender, 
                nationality.trim(), 
                newAvatar, 
                biography.trim(), 
                birthday, 
                id
            ]
        );

        await connection.commit();
        res.status(200).json({ 
            message: "Cập nhật diễn viên thành công!" 
        });
    } catch (error) {
        await connection.rollback();
        console.error("❌ Update actor error:", error);
        res.status(500).json({ 
            error: "Lỗi server: " + error.message 
        });
    } finally {
        connection.release();
    }
};

// [DELETE] /api/actors/delete/:id - Xóa diễn viên (CLOUDINARY)
exports.deleteActor = async (req, res) => {
    const { id } = req.params;
    const { token } = req.body;

    const connection = await db.getConnection();
    try {
        if (!token) {
            return res.status(401).json({ 
                error: "Thiếu usertoken!" 
            });
        }

        await connection.beginTransaction();

        // 1. Lấy thông tin ảnh để xóa trên Cloudinary
        const [actor] = await connection.query(
            "SELECT actor_avatar FROM actors WHERE actor_id = ?", 
            [id]
        );
        if (actor.length > 0 && actor[0].actor_avatar) {
            const publicId = extractPublicId(actor[0].actor_avatar);
            await deleteFromCloudinary(publicId);
        }

        // 2. Xóa trong database
        await connection.query(
            "DELETE FROM actors WHERE actor_id = ?", 
            [id]
        );
        
        await connection.commit();
        res.status(200).json({ 
            message: "Đã xóa diễn viên và ảnh thành công." 
        });
    } catch (error) {
        await connection.rollback();
        console.error("Lỗi xóa diễn viên:", error);
        res.status(500).json({ 
            error: "Lỗi khi xóa diễn viên." 
        });
    } finally {
        connection.release();
    }
};