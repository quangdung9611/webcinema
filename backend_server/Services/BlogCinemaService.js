const BlogCinemaRepository = require("../Repositories/BlogCinemaRepository");
const { uploadToCloudinary, deleteFromCloudinary } = require("../Middlewares/UploadCloudinary");

const createSlug = (title) => {
  if (!title) return "";
  return title.toLowerCase().trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return null;
  return parts.slice(uploadIndex + 1).join('/').split('.')[0];
};

const validateBlogData = (data, file, isUpdate = false) => {
  const { title, description, likes } = data;
  if (!title || title.trim().length < 5) return "Tiêu đề blog phải từ 5 ký tự.";
  if (!description || description.trim().length < 10) return "Mô tả blog quá ngắn.";
  if (likes !== undefined && likes !== null && likes !== '' && (isNaN(parseInt(likes,10)) || parseInt(likes,10) < 0)) {
    return "Likes phải là số nguyên hợp lệ.";
  }
  if (!isUpdate && !file) return "Vui lòng upload ảnh blog.";
  return null;
};

class BlogCinemaService {
  async getAllBlogs(onlyActive = true) {
    return await BlogCinemaRepository.findAll(onlyActive);
  }

  async getBlogById(blogId) { // ✅ sửa tham số
    const blog = await BlogCinemaRepository.findById(blogId);
    if (!blog) { const err = new Error("Không tìm thấy blog"); err.statusCode = 404; throw err; }
    return blog;
  }

  async getBlogBySlug(slug) {
    const blog = await BlogCinemaRepository.findBySlug(slug);
    if (!blog) { const err = new Error("Không tìm thấy blog"); err.statusCode = 404; throw err; }
    await BlogCinemaRepository.incrementViews(blog.blog_id);
    return blog;
  }

  async likeBlog(blogId) { // ✅ sửa tham số
    const blog = await BlogCinemaRepository.findById(blogId);
    if (!blog) { const err = new Error("Không tìm thấy blog"); err.statusCode = 404; throw err; }
    await BlogCinemaRepository.incrementLikes(blogId);
    return true;
  }

  async createBlog(data, file) {
    const { title, description, likes } = data;
    const errorMsg = validateBlogData(data, file, false);
    if (errorMsg) { const err = new Error(errorMsg); err.statusCode = 400; throw err; }

    const connection = await BlogCinemaRepository.getConnection();
    try {
      await BlogCinemaRepository.beginTransaction(connection);
      const slug = createSlug(title);
      const existing = await BlogCinemaRepository.findByTitleOrSlug(title.trim(), slug);
      if (existing) { throw Object.assign(new Error("Tiêu đề hoặc slug đã tồn tại"), { statusCode: 400 }); }

      let blogImage = null;
      if (file) {
        const result = await uploadToCloudinary(file, 'cinema_shop/blog_cinema');
        blogImage = result.url;
      }

      const blogId = await BlogCinemaRepository.create({
        title: title.trim(), slug, description: description.trim(),
        blog_image: blogImage, likes: parseInt(likes,10)||0, is_active: 1
      });
      await BlogCinemaRepository.commit(connection);
      return blogId;
    } catch (error) {
      await BlogCinemaRepository.rollback(connection);
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateBlog(blogId, data, file) { // ✅ sửa tham số
    const { title, description, likes, is_active } = data;
    const errorMsg = validateBlogData(data, file, true);
    if (errorMsg) { const err = new Error(errorMsg); err.statusCode = 400; throw err; }

    const existing = await BlogCinemaRepository.findById(blogId);
    if (!existing) { const err = new Error("Blog không tồn tại"); err.statusCode = 404; throw err; }

    const connection = await BlogCinemaRepository.getConnection();
    try {
      await BlogCinemaRepository.beginTransaction(connection);
      const slug = createSlug(title);
      const dup = await BlogCinemaRepository.findByTitleOrSlug(title.trim(), slug, blogId);
      if (dup) { throw Object.assign(new Error("Tiêu đề hoặc slug đã trùng với blog khác"), { statusCode: 400 }); }

      let blogImage = existing.blog_image;
      if (file) {
        if (existing.blog_image) {
          const publicId = extractPublicId(existing.blog_image);
          await deleteFromCloudinary(publicId);
        }
        const result = await uploadToCloudinary(file, 'cinema_shop/blog_cinema');
        blogImage = result.url;
      }

      await BlogCinemaRepository.update(blogId, {
        title: title.trim(), slug, description: description.trim(),
        blog_image: blogImage, likes: parseInt(likes,10)||0,
        is_active: (is_active !== undefined) ? parseInt(is_active,10) : existing.is_active
      });
      await BlogCinemaRepository.commit(connection);
      return true;
    } catch (error) {
      await BlogCinemaRepository.rollback(connection);
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteBlog(blogId) { // ✅ sửa tham số
    const blog = await BlogCinemaRepository.getImage(blogId);
    if (!blog) { const err = new Error("Blog không tồn tại"); err.statusCode = 404; throw err; }

    const connection = await BlogCinemaRepository.getConnection();
    try {
      await BlogCinemaRepository.beginTransaction(connection);
      if (blog.blog_image) {
        const publicId = extractPublicId(blog.blog_image);
        await deleteFromCloudinary(publicId);
      }
      await BlogCinemaRepository.delete(blogId);
      await BlogCinemaRepository.commit(connection);
      return true;
    } catch (error) {
      await BlogCinemaRepository.rollback(connection);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new BlogCinemaService();