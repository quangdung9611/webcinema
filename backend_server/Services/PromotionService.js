const PromotionRepository = require("../Repositories/PromotionRepository");
const { uploadToCloudinary, deleteFromCloudinary } = require("../Middlewares/UploadCloudinary");

const createSlug = (title) => {
  if (!title) return "";
  return title
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

const validatePromotionData = (data, file, isUpdate = false) => {
  const { title, likes } = data;
  if (!title || title.trim() === "") return "Vui lòng nhập tiêu đề khuyến mãi.";
  if (title.trim().length < 5) return "Tiêu đề phải từ 5 ký tự trở lên.";
  if (likes !== undefined && likes !== "") {
    const parsed = parseInt(likes, 10);
    if (isNaN(parsed) || parsed < 0) return "Likes phải là số nguyên hợp lệ.";
  }
  if (!isUpdate && !file) return "Vui lòng upload hình ảnh khuyến mãi.";
  return null;
};

class PromotionService {
  async getAllPromotions(onlyActive = false) {
    return await PromotionRepository.findAll(onlyActive);
  }

  async getPromotionById(promotionId) {
    const p = await PromotionRepository.findById(promotionId);
    if (!p) {
      const err = new Error("Không tìm thấy khuyến mãi");
      err.statusCode = 404;
      throw err;
    }
    return p;
  }

  async getPromotionBySlug(slug) {
    const p = await PromotionRepository.findBySlug(slug);
    if (!p) {
      const err = new Error("Không tìm thấy khuyến mãi");
      err.statusCode = 404;
      throw err;
    }
    await PromotionRepository.incrementViews(p.promotion_id);
    return p;
  }

  async createPromotion(data, file) {
    const { title, description, likes } = data;

    const error = validatePromotionData(data, file, false);
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      throw err;
    }

    const slug = createSlug(title);
    const dup = await PromotionRepository.findByTitleOrSlug(title.trim(), slug);
    if (dup) {
      const err = new Error("Tiêu đề hoặc slug đã tồn tại");
      err.statusCode = 400;
      throw err;
    }

    let promotionImage = null;
    if (file) {
      const result = await uploadToCloudinary(file, "cinema_shop/promotions");
      promotionImage = result.url;
    }

    return await PromotionRepository.create({
      title: title.trim(),
      slug,
      description: description || "",
      promotion_image: promotionImage,
      likes: parseInt(likes, 10) || 0,
      is_active: 1,
    });
  }

  async updatePromotion(promotionId, data, file) {
    const existing = await PromotionRepository.findById(promotionId);
    if (!existing) {
      const err = new Error("Khuyến mãi không tồn tại");
      err.statusCode = 404;
      throw err;
    }

    const { title, description, likes, is_active } = data;
    const error = validatePromotionData(data, file, true);
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      throw err;
    }

    const slug = createSlug(title);
    const dup = await PromotionRepository.findByTitleOrSlug(title.trim(), slug, promotionId);
    if (dup) {
      const err = new Error("Tiêu đề hoặc slug đã trùng với khuyến mãi khác");
      err.statusCode = 400;
      throw err;
    }

    const conn = await PromotionRepository.getConnection();
    try {
      await PromotionRepository.beginTransaction(conn);

      let promotionImage = existing.promotion_image;
      if (file) {
        if (existing.promotion_image) {
          const publicId = extractPublicId(existing.promotion_image);
          await deleteFromCloudinary(publicId);
        }
        const result = await uploadToCloudinary(file, "cinema_shop/promotions");
        promotionImage = result.url;
      }

      await PromotionRepository.update(conn, promotionId, {
        title: title.trim(),
        slug,
        description: description || "",
        promotion_image: promotionImage,
        likes: parseInt(likes, 10) || 0,
        is_active: parseInt(is_active, 10) || 0,
      });

      await PromotionRepository.commit(conn);
      return true;
    } catch (err) {
      await PromotionRepository.rollback(conn);
      throw err;
    } finally {
      conn.release();
    }
  }

  async deletePromotion(promotionId) {
    const existing = await PromotionRepository.findById(promotionId);
    if (!existing) {
      const err = new Error("Khuyến mãi không tồn tại");
      err.statusCode = 404;
      throw err;
    }

    const conn = await PromotionRepository.getConnection();
    try {
      await PromotionRepository.beginTransaction(conn);

      if (existing.promotion_image) {
        const publicId = extractPublicId(existing.promotion_image);
        await deleteFromCloudinary(publicId);
      }

      await PromotionRepository.delete(conn, promotionId);
      await PromotionRepository.commit(conn);
      return true;
    } catch (err) {
      await PromotionRepository.rollback(conn);
      throw err;
    } finally {
      conn.release();
    }
  }

  async toggleStatus(promotionId) {
    const newStatus = await PromotionRepository.toggleStatus(promotionId);
    if (newStatus === null) {
      const err = new Error("Không tìm thấy khuyến mãi");
      err.statusCode = 404;
      throw err;
    }
    return newStatus;
  }

  async likePromotion(promotionId) {
    const affected = await PromotionRepository.incrementLikes(promotionId);
    if (affected === 0) {
      const err = new Error("Không tìm thấy khuyến mãi");
      err.statusCode = 404;
      throw err;
    }
    return true;
  }
}

module.exports = new PromotionService();