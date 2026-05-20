const db = require('../Config/db');
const fs = require('fs');
const path = require('path');

/* ==========================================================
    1. HELPERS & VALIDATION UTILS
   ========================================================== */

/**
 * Tạo slug từ tên diễn viên (Dùng chung logic với Movie)
 */
const createSlug = (name) => {
    if (!name) return "";
    return name.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Validate dữ liệu đầu vào cho Diễn viên
 * Đã nâng cấp để kiểm tra đầy đủ tất cả các trường dựa theo CSDL
 */
const validateActorData = (data, file, isUpdate = false) => {
    const { name, gender, nationality, biography, birthday } = data;

    // 1. Kiểm tra Tên diễn viên (Bắt buộc)
    if (!name || name.trim() === "") {
        return "Vui lòng nhập tên diễn viên.";
    }
    if (name.trim().length < 2) { 
        return "Tên diễn viên phải từ 2 ký tự trở lên.";
    }

    // 2. Kiểm tra Giới tính (Bắt buộc)
    if (!gender || gender.trim() === "") {
        return "Vui lòng chọn giới tính cho diễn viên.";
    }
    const validGenders = ['Nam', 'Nữ', 'Khác'];
    if (!validGenders.includes(gender)) {
        return "Giới tính không hợp lệ (Nam, Nữ, Khác).";
    }

    // 3. Kiểm tra Quốc tịch (Bắt buộc)
    if (!nationality || nationality.trim() === "") {
        return "Vui lòng nhập quốc tịch của diễn viên.";
    }

    // 4. Kiểm tra Ngày sinh (Bắt buộc và phải hợp lệ)
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

    // 5. Kiểm tra Tiểu sử (Bắt buộc)
    if (!biography || biography.trim() === "") {
        return "Vui lòng điền tiểu sử của diễn viên.";
    }

    // 6. Kiểm tra ảnh đại diện (Khi thêm mới bắt buộc phải có file)
    if (!isUpdate && !file) {
        return "Vui lòng upload ảnh đại diện cho diễn viên.";
    }

    return null;
};

/**
 * Xóa file vật lý trên server (Thư mục uploads/actors)
 */
const deleteActorFile = (fileName) => {
    if (!fileName) return;

    const pureFileName = path.basename(fileName);
    const filePath = path.join(__dirname, '..', 'uploads', 'actors', pureFileName); 

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("✅ Đã xóa ảnh diễn viên thành công");
        }
    } catch (err) {
        console.error("❌ Lỗi khi xóa ảnh diễn viên:", err.message);
    }
};

/* ==========================================================
    2. CONTROLLER FUNCTIONS
   ========================================================== */

// [GET] /api/actors - Lấy danh sách toàn bộ diễn viên
exports.getAllActors = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM actors ORDER BY actor_id DESC");
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error getAllActors:", error);
        res.status(500).json({ error: "Lỗi khi lấy danh sách diễn viên." });
    }
};

// [GET] /api/actors/id/:id - Lấy chi tiết theo ID (Dùng cho Admin Edit)
exports.getActorById = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM actors WHERE actor_id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy diễn viên." });
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Lỗi hệ thống khi lấy chi tiết diễn viên." });
    }
};

// [GET] /api/actors/slug/:slug - Lấy chi tiết diễn viên + Danh sách phim họ tham gia
exports.getActorBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        // 1. Lấy thông tin cơ bản của diễn viên
        const [actorRows] = await db.query(`SELECT * FROM actors WHERE slug = ?`, [slug]);
        const actor = actorRows[0];

        if (!actor) return res.status(404).json({ message: "Không tìm thấy diễn viên" });

        // 2. Lấy danh sách phim diễn viên này tham gia
        const [movies] = await db.query(`
            SELECT m.movie_id, m.title, m.slug, m.poster_url, m.release_date
            FROM movies m
            JOIN movie_actors ma ON m.movie_id = ma.movie_id
            WHERE ma.actor_id = ?
            ORDER BY m.release_date DESC
        `, [actor.actor_id]);

        actor.movies = movies;

        res.status(200).json(actor);
    } catch (error) {
        console.error("Lỗi getActorBySlug:", error);
        res.status(500).json({ error: error.message });
    }
};

// [POST] /api/actors/add - Thêm diễn viên mới
exports.addActor = async (req, res) => {
    const { name, gender, nationality, biography, birthday } = req.body;

    // 1. Validate dữ liệu cơ bản
    const errorMsg = validateActorData(req.body, req.file, false);
    if (errorMsg) {
        if (req.file) deleteActorFile(req.file.originalname);
        return res.status(400).json({ error: errorMsg });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const actorSlug = createSlug(name);

        // ĐOẠN CHECK TRÙNG KHI THÊM MỚI: Kiểm tra xem tên hoặc slug này đã tồn tại chưa
        const [existingActor] = await connection.query(
            "SELECT actor_id FROM actors WHERE name = ? OR slug = ?", 
            [name.trim(), actorSlug]
        );

        if (existingActor.length > 0) {
            if (req.file) deleteActorFile(req.file.originalname);
            await connection.rollback();
            return res.status(400).json({ error: "Tên hoặc slug của diễn viên này đã tồn tại trong hệ thống." });
        }

        const avatar = req.file.originalname; 

        await connection.query(
            `INSERT INTO actors (name, slug, gender, nationality, avatar, biography, birthday) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), actorSlug, gender, nationality.trim(), avatar, biography.trim(), birthday]
        );

        await connection.commit();
        res.status(201).json({ message: "Thêm diễn viên thành công!" });
    } catch (error) {
        await connection.rollback();
        if (req.file) deleteActorFile(req.file.originalname);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
};

// [PUT] /api/actors/update/:id - Cập nhật thông tin diễn viên
exports.updateActor = async (req, res) => {
    const { id } = req.params;
    const { name, gender, nationality, biography, birthday, avatar_old } = req.body;
    
    // 1. Validate dữ liệu cơ bản (isUpdate = true)
    const errorMsg = validateActorData(req.body, req.file, true);
    if (errorMsg) {
        if (req.file) deleteActorFile(req.file.originalname);
        return res.status(400).json({ error: errorMsg });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 2. Kiểm tra diễn viên mục tiêu có tồn tại hay không
        const [old] = await connection.query("SELECT avatar FROM actors WHERE actor_id = ?", [id]);
        if (old.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Diễn viên không tồn tại." });
        }

        const actorSlug = createSlug(name);

        // ĐOẠN CHECK TRÙNG KHI CẬP NHẬT: Kiểm tra xem tên hoặc slug mới có trùng với AI KHÁC không (loại trừ ID hiện tại ra)
        const [duplicateActor] = await connection.query(
            "SELECT actor_id FROM actors WHERE (name = ? OR slug = ?) AND actor_id != ?", 
            [name.trim(), actorSlug, id]
        );

        if (duplicateActor.length > 0) {
            if (req.file) deleteActorFile(req.file.originalname); // Xóa ảnh mới vừa upload lên nếu bị trùng thông tin
            await connection.rollback();
            return res.status(400).json({ error: "Tên hoặc đường dẫn slug của diễn viên đã bị trùng với một diễn viên khác." });
        }

        let finalAvatar = old[0].avatar;

        // Nếu có upload ảnh mới
        if (req.file) {
            deleteActorFile(old[0].avatar); // Xóa file ảnh cũ trên server
            finalAvatar = req.file.originalname;
        }

        await connection.query(
            `UPDATE actors 
             SET name=?, slug=?, gender=?, nationality=?, avatar=?, biography=?, birthday=? 
             WHERE actor_id=?`,
            [name.trim(), actorSlug, gender, nationality.trim(), finalAvatar, biography.trim(), birthday, id]
        );

        await connection.commit();
        res.status(200).json({ message: "Cập nhật diễn viên thành công!" });
    } catch (error) {
        await connection.rollback();
        if (req.file) deleteActorFile(req.file.originalname);
        res.status(500).json({ error: "Lỗi server: " + error.message });
    } finally {
        connection.release();
    }
};

// [DELETE] /api/actors/delete/:id - Xóa diễn viên
exports.deleteActor = async (req, res) => {
    const { id } = req.params;
    const { token } = req.body; // Dùng usertoken của Quang Dũng

    const connection = await db.getConnection();
    try {
        if (!token) return res.status(401).json({ error: "Thiếu usertoken!" });

        await connection.beginTransaction();

        // 1. Lấy thông tin ảnh để xóa file vật lý
        const [actor] = await connection.query("SELECT avatar FROM actors WHERE actor_id = ?", [id]);
        if (actor.length > 0) {
            deleteActorFile(actor[0].avatar);
        }

        // 2. Xóa trong database (Sẽ tự xóa movie_actors nếu có ON DELETE CASCADE)
        await connection.query("DELETE FROM actors WHERE actor_id = ?", [id]);
        
        await connection.commit();
        res.status(200).json({ message: "Đã xóa diễn viên và ảnh thành công." });
    } catch (error) {
        await connection.rollback();
        console.error("Lỗi xóa diễn viên:", error);
        res.status(500).json({ error: "Lỗi khi xóa diễn viên." });
    } finally {
        connection.release();
    }
};