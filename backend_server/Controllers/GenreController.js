const db = require('../Config/db');

/* ======================================================================
   1. HELPERS / VALIDATION
   ====================================================================== */

const validateGenreFormat = (name) => {
    if (!name || typeof name !== 'string') {
        return "Tên thể loại không hợp lệ.";
    }

    const trimmed = name.trim();

    if (trimmed.length < 2) {
        return "Tên thể loại phải có ít nhất 2 ký tự.";
    }

    if (trimmed.length > 50) {
        return "Tên thể loại quá dài (tối đa 50 ký tự).";
    }

    return null;
};

const isGenreDuplicate = async (name, excludeId = null) => {
    const trimmed = name.trim();

    let sql = `SELECT genre_id FROM genres WHERE genre_name = ?`;
    const params = [trimmed];

    if (excludeId) {
        sql += ` AND genre_id != ?`;
        params.push(excludeId);
    }

    const [rows] = await db.query(sql, params);

    return rows.length > 0;
};

/* ======================================================================
   2. CONTROLLERS
   ====================================================================== */

/**
 * GET ALL GENRES
 */
exports.getAllGenres = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM genres ORDER BY genre_id DESC'
        );

        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json({
            error: "Lỗi hệ thống khi tải danh sách thể loại."
        });
    }
};

/**
 * GET GENRE BY ID
 */
exports.getGenreById = async (req, res) => {
    const { genre_id } = req.params;

    try {
        const [rows] = await db.query(
            'SELECT * FROM genres WHERE genre_id = ?',
            [genre_id]
        );

        if (!rows.length) {
            return res.status(404).json({
                error: "Không tìm thấy thể loại này."
            });
        }

        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({
            error: "Lỗi hệ thống khi lấy thông tin thể loại."
        });
    }
};

/**
 * ADD GENRE
 */
exports.addGenre = async (req, res) => {
    const { genre_name, slug } = req.body;

    const error = validateGenreFormat(genre_name);
    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const duplicate = await isGenreDuplicate(genre_name);

        if (duplicate) {
            return res.status(400).json({
                error: `Thể loại "${genre_name.trim()}" đã tồn tại.`
            });
        }

        await db.query(
            `INSERT INTO genres (genre_name, slug) VALUES (?, ?)`,
            [genre_name.trim(), slug]
        );

        return res.status(201).json({
            message: "Thêm thể loại thành công!"
        });
    } catch (error) {
        return res.status(500).json({
            error: "Lỗi khi lưu dữ liệu thể loại."
        });
    }
};

/**
 * UPDATE GENRE
 */
exports.updateGenre = async (req, res) => {
    const { genre_id } = req.params;
    const { genre_name, slug } = req.body;

    const error = validateGenreFormat(genre_name);
    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const duplicate = await isGenreDuplicate(genre_name, genre_id);

        if (duplicate) {
            return res.status(400).json({
                error: "Tên thể loại này đã tồn tại ở mục khác."
            });
        }

        await db.query(
            `UPDATE genres 
             SET genre_name = ?, slug = ? 
             WHERE genre_id = ?`,
            [genre_name.trim(), slug, genre_id]
        );

        return res.status(200).json({
            message: "Cập nhật thành công!"
        });
    } catch (error) {
        return res.status(500).json({
            error: "Lỗi khi cập nhật dữ liệu."
        });
    }
};

/**
 * DELETE GENRE
 */
exports.deleteGenre = async (req, res) => {
    const { genre_id } = req.params;
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({
            error: "Thiếu quyền truy cập (Token)!"
        });
    }

    try {
        // check đang được dùng bởi phim chưa
        const [linked] = await db.query(
            `SELECT movie_id 
             FROM movie_genres 
             WHERE genre_id = ? 
             LIMIT 1`,
            [genre_id]
        );

        if (linked.length > 0) {
            return res.status(400).json({
                error: "Không thể xóa vì thể loại đang được sử dụng."
            });
        }

        await db.query(
            `DELETE FROM genres WHERE genre_id = ?`,
            [genre_id]
        );

        return res.status(200).json({
            message: "Đã xóa thể loại thành công."
        });
    } catch (error) {
        return res.status(500).json({
            error: "Lỗi hệ thống khi xóa thể loại."
        });
    }
};