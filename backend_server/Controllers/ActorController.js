const ActorService = require("../Services/ActorService");

/* ==========================================================
   ADMIN - LẤY DANH SÁCH (Pagination + Search)
========================================================== */
exports.getAllActorsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const data = await ActorService.getAllActors(page, limit, search);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Get All Actors Admin Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

/* ==========================================================
   PUBLIC - LẤY DANH SÁCH (Pagination + Search)
========================================================== */
exports.getAllActorsPublic = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const data = await ActorService.getAllActors(page, limit, search);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Get All Actors Public Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

/* ==========================================================
   PUBLIC - CHI TIẾT THEO SLUG
========================================================== */
exports.getActorBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const actor = await ActorService.getActorBySlug(slug);
    return res.status(200).json({ success: true, data: actor });
  } catch (err) {
    console.error("Get Actor By Slug Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

/* ==========================================================
   ADMIN - LẤY CHI TIẾT THEO ID
========================================================== */
exports.getActorById = async (req, res) => {
  try {
    const { actor_id } = req.params;
    const actor = await ActorService.getActorById(actor_id);
    return res.status(200).json({ success: true, data: actor });
  } catch (err) {
    console.error("Get Actor By ID Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

/* ==========================================================
   ADMIN - THÊM DIỄN VIÊN
========================================================== */
exports.addActor = async (req, res) => {
  try {
    const actorId = await ActorService.createActor(req.body, req.file);
    return res.status(201).json({
      success: true,
      message: "Thêm diễn viên thành công!",
      data: { actor_id: actorId },
    });
  } catch (err) {
    console.error("Add Actor Error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

/* ==========================================================
   ADMIN - CẬP NHẬT DIỄN VIÊN
========================================================== */
exports.updateActor = async (req, res) => {
  try {
    const { actor_id } = req.params;
    await ActorService.updateActor(actor_id, req.body, req.file);
    return res.status(200).json({
      success: true,
      message: "Cập nhật diễn viên thành công!",
    });
  } catch (err) {
    console.error("Update Actor Error:", err);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};

/* ==========================================================
   ADMIN - XÓA DIỄN VIÊN
========================================================== */
exports.deleteActor = async (req, res) => {
  try {
    const { actor_id } = req.params;
    await ActorService.deleteActor(actor_id);
    return res.status(200).json({
      success: true,
      message: "Đã xóa diễn viên và ảnh thành công.",
    });
  } catch (err) {
    console.error("Delete Actor Error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};