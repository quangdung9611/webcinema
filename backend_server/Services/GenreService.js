const GenreRepository = require("../Repositories/GenreRepository");

const createSlug = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const validateGenre = (name) => {
  if (!name || typeof name !== "string") {
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

class GenreService {
  async getAllGenres() {
    return await GenreRepository.findAll();
  }

  async getGenreById(genreId) { // ✅ sửa
    const genre = await GenreRepository.findById(genreId);
    if (!genre) {
      const err = new Error("Không tìm thấy thể loại");
      err.statusCode = 404;
      throw err;
    }
    return genre;
  }

  async createGenre(data) {
    const { genre_name, slug: providedSlug } = data;

    const error = validateGenre(genre_name);
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      throw err;
    }

    const name = genre_name.trim();
    const slug = providedSlug || createSlug(name);

    const dup = await GenreRepository.findByNameWithSlug(name, slug);
    if (dup) {
      const err = new Error(`Thể loại "${name}" đã tồn tại.`);
      err.statusCode = 400;
      throw err;
    }

    return await GenreRepository.create({ genre_name: name, slug });
  }

  async updateGenre(genreId, data) { // ✅ sửa
    const { genre_name, slug: providedSlug } = data;

    const existing = await GenreRepository.findById(genreId);
    if (!existing) {
      const err = new Error("Không tìm thấy thể loại");
      err.statusCode = 404;
      throw err;
    }

    const error = validateGenre(genre_name);
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      throw err;
    }

    const name = genre_name.trim();
    const slug = providedSlug || createSlug(name);

    const dup = await GenreRepository.findByNameWithSlug(name, slug, genreId);
    if (dup) {
      const err = new Error("Tên thể loại này đã tồn tại ở mục khác.");
      err.statusCode = 400;
      throw err;
    }

    const affected = await GenreRepository.update(genreId, { genre_name: name, slug });
    if (affected === 0) {
      const err = new Error("Không thể cập nhật thể loại");
      err.statusCode = 500;
      throw err;
    }

    return true;
  }

  async deleteGenre(genreId) { // ✅ sửa
    const existing = await GenreRepository.findById(genreId);
    if (!existing) {
      const err = new Error("Không tìm thấy thể loại");
      err.statusCode = 404;
      throw err;
    }

    const linked = await GenreRepository.checkLinked(genreId);
    if (linked) {
      const err = new Error("Không thể xóa vì thể loại đang được sử dụng trong phim.");
      err.statusCode = 400;
      throw err;
    }

    const affected = await GenreRepository.delete(genreId);
    if (affected === 0) {
      const err = new Error("Không thể xóa thể loại");
      err.statusCode = 500;
      throw err;
    }

    return true;
  }
}

module.exports = new GenreService();