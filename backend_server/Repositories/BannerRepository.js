const db = require("../Config/db");

class BannerRepository {
  // Không phân trang → trả về mảng
  async findAllAll(search = "", page = "") {
    search = typeof search === "string" ? search.trim() : "";
    page = typeof page === "string" ? page.trim() : "";

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`(page LIKE ? OR image_url LIKE ?)`);
      const keyword = `%${search}%`;
      params.push(keyword, keyword);
    }

    if (page) {
      conditions.push(`page = ?`);
      params.push(page);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT banner_id, page, image_url, is_active, created_at, updated_at
      FROM banners
      ${whereClause}
      ORDER BY created_at DESC, banner_id DESC
      `,
      params
    );

    return rows; // mảng
  }

  // Có phân trang → trả về { data: [], pagination: {} }
  async findAll(onlyActive = false, page = 1, limit = 20, search = "") {
    page = Number.parseInt(page, 10) || 1;
    limit = Math.min(Number.parseInt(limit, 10) || 20, 100);
    search = typeof search === "string" ? search.trim() : "";

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`(page LIKE ? OR image_url LIKE ?)`);
      const keyword = `%${search}%`;
      params.push(keyword, keyword);
    }

    if (onlyActive) {
      conditions.push(`is_active = 1`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `
      SELECT banner_id, page, image_url, is_active, created_at, updated_at
      FROM banners
      ${whereClause}
      ORDER BY created_at DESC, banner_id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM banners ${whereClause}`,
      params
    );

    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: rows, // mảng
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages
      }
    };
  }

  async findById(bannerId) {
    const [rows] = await db.query(
      `SELECT * FROM banners WHERE banner_id = ? LIMIT 1`,
      [bannerId]
    );
    return rows[0] || null;
  }

  async create(data) {
    const { page, image_url, is_active } = data;
    const [result] = await db.query(
      `INSERT INTO banners (page, image_url, is_active) VALUES (?, ?, ?)`,
      [page, image_url, is_active !== undefined ? is_active : 1]
    );
    return result.insertId;
  }

  async update(bannerId, data) {
    const fields = [];
    const values = [];
    if (data.page !== undefined) { fields.push(`page = ?`); values.push(data.page); }
    if (data.image_url !== undefined) { fields.push(`image_url = ?`); values.push(data.image_url); }
    if (data.is_active !== undefined) { fields.push(`is_active = ?`); values.push(data.is_active); }

    if (fields.length === 0) return 0;

    values.push(bannerId);
    const [result] = await db.query(
      `UPDATE banners SET ${fields.join(", ")}, updated_at = NOW() WHERE banner_id = ?`,
      values
    );
    return result.affectedRows;
  }

  async delete(bannerId) {
    const [result] = await db.query(
      `DELETE FROM banners WHERE banner_id = ?`,
      [bannerId]
    );
    return result.affectedRows;
  }

  async getImage(bannerId) {
    const [rows] = await db.query(
      `SELECT image_url FROM banners WHERE banner_id = ? LIMIT 1`,
      [bannerId]
    );
    return rows[0] || null;
  }

  async findActiveByPage(page) {
    if (!page) return [];
    const [rows] = await db.query(
      `
      SELECT banner_id, page, image_url, is_active, created_at, updated_at
      FROM banners
      WHERE page = ? AND is_active = 1
      ORDER BY created_at DESC, banner_id DESC
      `,
      [page]
    );
    return rows;
  }
}

module.exports = new BannerRepository();