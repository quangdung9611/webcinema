const db = require('../Config/db');

/* ==========================================================================
   PHẦN 1: CÁC HÀM TRỢ GIÚP (HELPERS / VALIDATION)
   ========================================================================== */

const validateGenreFormat = (name) => {
    if (!name || name.trim().length < 2) return "Tên thể loại phải có ít nhất 2 ký tự.";
    if (name.length > 50) return "Tên thể loại quá dài (tối đa 50 ký tự).";
    return null;
};

const isGenreDuplicate = async (name, id = null) => {
    let sql = 'SELECT genre_id FROM genres WHERE genre_name = ?';
    const params = [name.trim()];

    if (id) {
        sql += ' AND genre_id != ?';
        params.push(id);
    }

    const [rows] = await db.query(sql, params);
    return rows.length > 0;
};

/* ==========================================================================
   PHẦN 2: CÁC HÀM XỬ LÝ CHÍNH (CONTROLLERS)
   ========================================================================== */

// --- 1. Lấy tất cả thể loại ---
exports.getAllGenres = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM genres ORDER BY genre_id DESC');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: "Lỗi hệ thống khi tải danh sách thể loại." });
    }
};

// --- 1.5. Lấy thể loại theo ID ---
exports.getGenreById = async (req, res) => {
    const { genre_id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM genres WHERE genre_id = ?', [genre_id]);
        
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy thể loại này." });
        
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Lỗi hệ thống khi lấy thông tin thể loại." });
    }
};

// --- 2. Thêm thể loại mới ---
exports.addGenre = async (req, res) => {
    const { genre_name, slug } = req.body;
    const formatError = validateGenreFormat(genre_name);

    if (formatError) return res.status(400).json({ error: formatError });

    try {
        if (await isGenreDuplicate(genre_name)) {
            return res.status(400).json({ error: `Thể loại "${genre_name.trim()}" đã tồn tại.` });
        }

        await db.query(
            'INSERT INTO genres (genre_name, slug) VALUES (?, ?)', 
            [genre_name.trim(), slug]
        );
        res.status(201).json({ message: "Thêm thể loại thành công!" });
    } catch (error) {
        res.status(500).json({ error: "Lỗi khi lưu dữ liệu thể loại." });
    }
};

// --- 3. Cập nhật thể loại ---
exports.updateGenre = async (req, res) => {
    const { genre_id } = req.params;
    const { genre_name, slug } = req.body;
    const formatError = validateGenreFormat(genre_name);

    if (formatError) return res.status(400).json({ error: formatError });

    try {
        if (await isGenreDuplicate(genre_name, genre_id)) {
            return res.status(400).json({ error: "Tên thể loại này đã bị trùng với mục khác." });
        }

        await db.query(
            'UPDATE genres SET genre_name = ?, slug = ? WHERE genre_id = ?', 
            [genre_name.trim(), slug, genre_id]
        );
        res.status(200).json({ message: "Cập nhật thành công!" });
    } catch (error) {
        res.status(500).json({ error: "Lỗi khi cập nhật dữ liệu." });
    }
};

// --- 4. Xóa thể loại ---
exports.deleteGenre = async (req, res) => {
    const { genre_id } = req.params;
    const { token } = req.body; // Bảo mật bằng usertoken

    if (!token) return res.status(401).json({ error: "Thiếu quyền truy cập (Token)!" });

    try {
        const [linked] = await db.query(
            'SELECT movie_id FROM movie_genres WHERE genre_id = ? LIMIT 1', 
            [genre_id]
        );
        
        if (linked.length > 0) {
            return res.status(400).json({ error: "Không thể xóa vì thể loại này đang có phim sử dụng." });
        }

        await db.query('DELETE FROM genres WHERE genre_id = ?', [genre_id]);
        res.status(200).json({ message: "Đã xóa thể loại thành công." });
    } catch (error) {
        res.status(500).json({ error: "Lỗi hệ thống khi xóa thể loại." });
    }
};