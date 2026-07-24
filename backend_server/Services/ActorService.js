const ActorRepository = require("../Repositories/ActorRepository");
const { uploadToCloudinary, deleteFromCloudinary } = require("../Middlewares/UploadCloudinary");

/* ==========================================================
   HELPERS
========================================================== */

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
  if (!gender || gender.trim() === "") return "Vui lòng chọn giới tính cho diễn viên.";
  const validGenders = ["Nam", "Nữ", "Khác"];
  if (!validGenders.includes(gender)) return "Giới tính không hợp lệ (Nam, Nữ, Khác).";
  if (!nationality || nationality.trim() === "") return "Vui lòng nhập quốc tịch của diễn viên.";
  if (!birthday || birthday.trim() === "") return "Vui lòng chọn ngày sinh của diễn viên.";
  const inputDate = new Date(birthday);
  const today = new Date();
  if (isNaN(inputDate.getTime())) return "Định dạng ngày sinh không hợp lệ.";
  if (inputDate > today) return "Ngày sinh không thể lớn hơn ngày hiện tại.";
  if (!biography || biography.trim() === "") return "Vui lòng điền tiểu sử của diễn viên.";
  if (!isUpdate && !file) return "Vui lòng upload ảnh đại diện cho diễn viên.";

  return null;
};

/* ==========================================================
   ACTOR SERVICE
========================================================== */

class ActorService {
  // ==========================================================
  // LẤY DANH SÁCH
  // ==========================================================
  async getAllActors() {
    return await ActorRepository.findAll();
  }

  // ==========================================================
  // LẤY CHI TIẾT THEO ID
  // ==========================================================
  async getActorById(id) {
    const actor = await ActorRepository.findById(id);
    if (!actor) {
      const error = new Error("Không tìm thấy diễn viên.");
      error.statusCode = 404;
      throw error;
    }
    return actor;
  }

  // ==========================================================
  // LẤY CHI TIẾT THEO SLUG (kèm phim)
  // ==========================================================
  async getActorBySlug(slug) {
    const actor = await ActorRepository.findBySlugWithMovies(slug);
    if (!actor) {
      const error = new Error("Không tìm thấy diễn viên");
      error.statusCode = 404;
      throw error;
    }
    return actor;
  }

  // ==========================================================
  // THÊM DIỄN VIÊN (có upload Cloudinary + transaction)
  // ==========================================================
  async createActor(data, file) {
    // 1. Validate
    const errorMsg = validateActorData(data, file, false);
    if (errorMsg) {
      const error = new Error(errorMsg);
      error.statusCode = 400;
      throw error;
    }

    const { name, gender, nationality, biography, birthday } = data;

    const connection = await ActorRepository.getConnection();

    try {
      await ActorRepository.beginTransaction(connection);

      const slug = createSlug(name);

      // 2. Check duplicate
      const existed = await ActorRepository.findByNameOrSlug(name.trim(), slug);
      if (existed) {
        const error = new Error("Tên hoặc slug của diễn viên này đã tồn tại trong hệ thống.");
        error.statusCode = 400;
        throw error;
      }

      // 3. Upload avatar
      let actorAvatar = null;
      if (file) {
        const result = await uploadToCloudinary(file, "cinema_shop/actors");
        actorAvatar = result.url;
      }

      // 4. Insert DB
      const actorId = await ActorRepository.createWithConnection(connection, {
        name: name.trim(),
        slug,
        gender,
        nationality: nationality.trim(),
        actor_avatar: actorAvatar,
        biography: biography.trim(),
        birthday,
      });

      await ActorRepository.commit(connection);
      return actorId;
    } catch (error) {
      await ActorRepository.rollback(connection);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==========================================================
  // CẬP NHẬT DIỄN VIÊN (có upload Cloudinary + transaction)
  // ==========================================================
  async updateActor(id, data, file) {
    // 1. Kiểm tra tồn tại
    const existing = await ActorRepository.findById(id);
    if (!existing) {
      const error = new Error("Diễn viên không tồn tại.");
      error.statusCode = 404;
      throw error;
    }

    // 2. Validate
    const errorMsg = validateActorData(data, file, true);
    if (errorMsg) {
      const error = new Error(errorMsg);
      error.statusCode = 400;
      throw error;
    }

    const { name, gender, nationality, biography, birthday } = data;

    const connection = await ActorRepository.getConnection();

    try {
      await ActorRepository.beginTransaction(connection);

      const slug = createSlug(name);

      // 3. Check duplicate (trừ chính nó)
      const existed = await ActorRepository.findByNameOrSlug(name.trim(), slug, id);
      if (existed) {
        const error = new Error("Tên hoặc slug của diễn viên đã bị trùng với một diễn viên khác.");
        error.statusCode = 400;
        throw error;
      }

      // 4. Xử lý avatar
      let newAvatar = existing.actor_avatar;
      if (file) {
        // Xóa ảnh cũ
        if (existing.actor_avatar) {
          const publicId = extractPublicId(existing.actor_avatar);
          await deleteFromCloudinary(publicId);
        }
        // Upload ảnh mới
        const result = await uploadToCloudinary(file, "cinema_shop/actors");
        newAvatar = result.url;
      }

      // 5. Update DB
      await ActorRepository.updateWithConnection(connection, id, {
        name: name.trim(),
        slug,
        gender,
        nationality: nationality.trim(),
        actor_avatar: newAvatar,
        biography: biography.trim(),
        birthday,
      });

      await ActorRepository.commit(connection);
      return true;
    } catch (error) {
      await ActorRepository.rollback(connection);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==========================================================
  // XÓA DIỄN VIÊN (có xóa ảnh Cloudinary + transaction)
  // ==========================================================
  async deleteActor(id) {
    // 1. Kiểm tra tồn tại
    const existing = await ActorRepository.findById(id);
    if (!existing) {
      const error = new Error("Diễn viên không tồn tại.");
      error.statusCode = 404;
      throw error;
    }

    const connection = await ActorRepository.getConnection();

    try {
      await ActorRepository.beginTransaction(connection);

      // 2. Xóa ảnh trên Cloudinary
      if (existing.actor_avatar) {
        const publicId = extractPublicId(existing.actor_avatar);
        await deleteFromCloudinary(publicId);
      }

      // 3. Xóa DB record
      await ActorRepository.deleteWithConnection(connection, id);

      await ActorRepository.commit(connection);
      return true;
    } catch (error) {
      await ActorRepository.rollback(connection);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new ActorService();