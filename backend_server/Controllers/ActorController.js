const ActorService = require("../Services/ActorService");

/* ==========================================================
   PUBLIC - LẤY DANH SÁCH
========================================================== */

exports.getAllActors = async (req, res) => {
  try {
    const data = await ActorService.getAllActors();
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get All Actors Error:", err);
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
    return res.status(200).json(actor);
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
    const { id } = req.params;
    const actor = await ActorService.getActorById(id);
    return res.status(200).json(actor);
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
    const { id } = req.params;
    await ActorService.updateActor(id, req.body, req.file);
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
    const { id } = req.params;
    await ActorService.deleteActor(id);
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