const db = require('../Config/db');
const fs = require('fs');
const path = require('path');

/* ==========================================================
    1. HELPERS & VALIDATION UTILS
   ========================================================== */

const createSlug = (title) => {
    if (!title) return "";
    return title.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const deleteFile = (fileName) => {
    if (!fileName) return;
    const pureFileName = path.basename(fileName);
    const filePath = path.join(__dirname, '..', 'uploads', 'news', pureFileName); 

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ [DŨNG] Đã xóa file: ${pureFileName}`);
        }
    } catch (err) {
        console.error("❌ [DŨNG] Lỗi khi xóa file news:", err.message);
    }
};

/* ==========================================================
    2. CONTROLLER FUNCTIONS
   ========================================================== */

const NewsController = {
    // --- DÀNH CHO USER (CLIENT) ---
    getAllNews: async (req, res) => {
        try {
            const query = `
                SELECT 
                    news_id, title, slug, image_url, views, likes, 
                    DATE_FORMAT(created_at, '%d/%m/%Y') AS date,
                    IF(LENGTH(content) > 150, CONCAT(LEFT(content, 150), '...'), content) AS short_content
                FROM news 
                ORDER BY created_at DESC`;
            
            const [rows] = await db.query(query);
            res.status(200).json(rows);
        } catch (error) {
            console.error("❌ [DŨNG] Lỗi lấy danh sách tin tức (User):", error);
            res.status(500).json({ message: "Lỗi máy chủ khi lấy tin tức" });
        }
    },

    // --- DÀNH CHO ADMIN ---
    getAllNewsAdmin: async (req, res) => {
        try {
            const query = `
                SELECT *, DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date 
                FROM news 
                ORDER BY created_at DESC`;
            const [rows] = await db.query(query);
            res.status(200).json(rows);
        } catch (error) {
            console.error("❌ [DŨNG] Lỗi lấy danh sách tin tức (Admin):", error);
            res.status(500).json({ message: "Lỗi máy chủ admin" });
        }
    },

    // 2. Lấy chi tiết bài viết theo Slug
    getNewsBySlug: async (req, res) => {
        const { slug } = req.params;
        try {
            await db.query('UPDATE news SET views = views + 1 WHERE slug = ?', [slug]);
            
            const [rows] = await db.query(`
                SELECT *, DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS formatted_date 
                FROM news WHERE slug = ?`, [slug]);

            if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });
            res.status(200).json(rows[0]);
        } catch (error) {
            console.error("❌ [DŨNG] Lỗi lấy chi tiết bài viết:", error);
            res.status(500).json({ message: "Lỗi máy chủ" });
        }
    },

    // 3. API Tăng lượt thích
    increaseLike: async (req, res) => {
        const { id } = req.params;
        try {
            await db.query('UPDATE news SET likes = likes + 1 WHERE news_id = ?', [id]);
            res.status(200).json({ success: true, message: "Đã thích bài viết thành công" });
        } catch (error) {
            res.status(500).json({ message: "Lỗi khi cập nhật lượt thích" });
        }
    },

    // 4. Lấy chi tiết bài viết theo ID
    getNewsById: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT *, DATE_FORMAT(created_at, "%Y-%m-%dT%H:%i") as created_at_edit FROM news WHERE news_id = ?', [req.params.id]);
            if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });
            res.status(200).json(rows[0]);
        } catch (error) {
            res.status(500).json({ message: "Lỗi máy chủ" });
        }
    },

    // 5. Thêm bài viết mới
    createNews: async (req, res) => {
        const { title, content, likes } = req.body;
        
        if (!title || !content || !req.file) {
            if (req.file) deleteFile(req.file.filename);
            return res.status(400).json({ message: "Vui lòng điền đầy đủ và upload ảnh." });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const image_url = req.file.filename;
            const slug = createSlug(title);
            const initialLikes = likes || 0;

            // --- CHỐT GIỜ VIỆT NAM ---
            // Dùng sv-SE để ra định dạng YYYY-MM-DD HH:mm:ss mà MySQL DATETIME hiểu được
            const nowVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

            const sql = 'INSERT INTO news (title, slug, content, image_url, views, likes, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)';
            await connection.query(sql, [title.trim(), slug, content, image_url, initialLikes, nowVN]);

            await connection.commit();
            res.status(201).json({ success: true, message: "Đăng bài viết thành công!" });
        } catch (error) {
            await connection.rollback();
            if (req.file) deleteFile(req.file.filename);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: "Tiêu đề này đã tồn tại rồi ông Dũng ơi!" });
            }
            res.status(500).json({ message: "Lỗi khi tạo bài viết: " + error.message });
        } finally {
            connection.release();
        }
    },

    // 6. Cập nhật bài viết
    updateNews: async (req, res) => {
        const { news_id } = req.params;
        const { title, content, likes } = req.body;

        if (!title || !content) {
            if (req.file) deleteFile(req.file.filename);
            return res.status(400).json({ message: "Tiêu đề và nội dung không được để trống." });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [old] = await connection.query("SELECT image_url FROM news WHERE news_id = ?", [news_id]);
            if (old.length === 0) {
                if (req.file) deleteFile(req.file.filename);
                return res.status(404).json({ message: "Bài viết không tồn tại." });
            }

            let finalImage = old[0].image_url;
            if (req.file) {
                deleteFile(old[0].image_url); // Xóa ảnh cũ vật lý
                finalImage = req.file.filename;
            }

            const sql = `
                UPDATE news 
                SET title = ?, slug = ?, content = ?, image_url = ?, likes = ?
                WHERE news_id = ?`;
            
            await connection.query(sql, [title.trim(), createSlug(title), content, finalImage, likes || 0, news_id]);

            await connection.commit();
            res.status(200).json({ success: true, message: "Cập nhật bài viết thành công!" });
        } catch (error) {
            await connection.rollback();
            if (req.file) deleteFile(req.file.filename);
            res.status(500).json({ message: "Lỗi cập nhật: " + error.message });
        } finally {
            connection.release();
        }
    },

    // 7. Xóa bài viết
    deleteNews: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [news] = await connection.query("SELECT image_url FROM news WHERE news_id = ?", [req.params.id]);
            if (news.length > 0) {
                deleteFile(news[0].image_url);
            }

            await connection.query("DELETE FROM news WHERE news_id = ?", [req.params.id]);
            
            await connection.commit();
            res.status(200).json({ success: true, message: "Đã xóa bài viết thành công." });
        } catch (error) {
            await connection.rollback();
            res.status(500).json({ message: "Lỗi khi xóa bài viết." });
        } finally {
            connection.release();
        }
    }
};

module.exports = NewsController;