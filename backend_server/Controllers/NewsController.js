const db = require('../Config/db');
const fs = require('fs');
const path = require('path');

/* ==========================================================
    1. HELPERS & VALIDATION UTILS
   ========================================================== */

/**
 * Tạo slug từ tiêu đề tin tức
 */
const createSlug = (title) => {
    if (!title) return "";
    return title.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Xóa file vật lý trên server (Dành cho news)
 */
const deleteFile = (fileName) => {
    if (!fileName) return;

    const pureFileName = path.basename(fileName);
    const filePath = path.join(__dirname, '..', 'uploads', 'news', pureFileName); 

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("✅ Đã xóa file ảnh tin tức thành công");
        }
    } catch (err) {
        console.error("❌ Lỗi khi xóa file vật lý news:", err.message);
    }
};

/* ==========================================================
    2. CONTROLLER FUNCTIONS
   ========================================================== */

const NewsController = {
    // 1. Lấy danh sách tất cả tin tức (Dùng cho trang danh sách Review)
    getAllNews: async (req, res) => {
        try {
            const query = `
                SELECT 
                    news_id, title, slug, image_url, views, likes, created_at,
                    IF(LENGTH(content) > 200, CONCAT(LEFT(content, 200), '...'), content) AS short_content,
                    content
                FROM news 
                ORDER BY created_at DESC`;
            
            const [rows] = await db.query(query);
            res.status(200).json(rows);
        } catch (error) {
            console.error("Lỗi lấy danh sách tin tức:", error);
            res.status(500).json({ message: "Lỗi máy chủ khi lấy tin tức" });
        }
    },

    // 2. Lấy chi tiết bài viết theo Slug (Tăng view và hiển thị tức thì)
    getNewsBySlug: async (req, res) => {
        const { slug } = req.params;
        try {
            // Cập nhật lượt xem ngay lập tức trong CSDL
            await db.query('UPDATE news SET views = views + 1 WHERE slug = ?', [slug]);
            
            // Lấy dữ liệu mới nhất (đã bao gồm view vừa tăng)
            const [rows] = await db.query('SELECT * FROM news WHERE slug = ?', [slug]);

            if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });
            res.status(200).json(rows[0]);
        } catch (error) {
            console.error("Lỗi lấy chi tiết bài viết:", error);
            res.status(500).json({ message: "Lỗi máy chủ" });
        }
    },

    // 3. API Tăng lượt thích (Gọi khi nhấn nút Like)
    increaseLike: async (req, res) => {
        const { id } = req.params;
        try {
            await db.query('UPDATE news SET likes = likes + 1 WHERE news_id = ?', [id]);
            res.status(200).json({ message: "Đã thích bài viết thành công" });
        } catch (error) {
            res.status(500).json({ message: "Lỗi khi cập nhật lượt thích" });
        }
    },

    // 4. Lấy chi tiết bài viết theo ID (Admin)
    getNewsById: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM news WHERE news_id = ?', [req.params.id]);
            if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });
            res.status(200).json(rows[0]);
        } catch (error) {
            res.status(500).json({ message: "Lỗi máy chủ" });
        }
    },

    // 5. Thêm bài viết mới
    createNews: async (req, res) => {
        const { title, content } = req.body;
        
        if (!title || !content || !req.file) {
            if (req.file) deleteFile(req.file.originalname);
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin và upload ảnh." });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const image_url = req.file.originalname;
            const slug = createSlug(title);

            // Mặc định views và likes là 0 khi tạo mới
            const sql = 'INSERT INTO news (title, slug, content, image_url, views, likes) VALUES (?, ?, ?, ?, 0, 0)';
            await connection.query(sql, [title.trim(), slug, content, image_url]);

            await connection.commit();
            res.status(201).json({ message: "Đăng bài viết thành công!" });
        } catch (error) {
            await connection.rollback();
            if (req.file) deleteFile(req.file.originalname);
            
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: "Slug (tiêu đề) này đã tồn tại." });
            }
            res.status(500).json({ message: "Lỗi khi tạo bài viết: " + error.message });
        } finally {
            connection.release();
        }
    },

    // 6. Cập nhật bài viết
    updateNews: async (req, res) => {
        const { news_id } = req.params;
        const { title, content, image_url } = req.body;

        if (!title || !content) {
            if (req.file) deleteFile(req.file.originalname);
            return res.status(400).json({ message: "Tiêu đề và nội dung không được để trống." });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [old] = await connection.query("SELECT image_url FROM news WHERE news_id = ?", [news_id]);
            if (old.length === 0) {
                if (req.file) deleteFile(req.file.originalname);
                return res.status(404).json({ message: "Bài viết không tồn tại." });
            }

            let finalImage = old[0].image_url;
            if (req.file) {
                deleteFile(old[0].image_url);
                finalImage = req.file.originalname;
            } else if (image_url) {
                finalImage = image_url;
            }

            const sql = `
                UPDATE news 
                SET title = ?, slug = ?, content = ?, image_url = ? 
                WHERE news_id = ?`;
            
            await connection.query(sql, [title.trim(), createSlug(title), content, finalImage, news_id]);

            await connection.commit();
            res.status(200).json({ message: "Cập nhật bài viết thành công!" });
        } catch (error) {
            await connection.rollback();
            if (req.file) deleteFile(req.file.originalname);
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
            res.status(200).json({ message: "Đã xóa bài viết và ảnh thành công." });
        } catch (error) {
            await connection.rollback();
            res.status(500).json({ message: "Lỗi khi xóa bài viết." });
        } finally {
            connection.release();
        }
    }
};

module.exports = NewsController;