const TestimonialRepository = require('../Repositories/TestimonialRepository');

class TestimonialService {

    async getAll(page, limit, search) {
        return await TestimonialRepository.findAll(page, limit, search);
    }

    async getActive(limit = 6) {
        return await TestimonialRepository.findActive(limit);
    }

    async getById(id) {
        const item = await TestimonialRepository.findById(id);
        if (!item) {
            const err = new Error('Không tìm thấy đánh giá.');
            err.statusCode = 404;
            throw err;
        }
        return item;
    }

    async create(data) {
        const { user_id, content, rating } = data;

        if (!user_id) {
            const err = new Error('Vui lòng đăng nhập để gửi đánh giá.');
            err.statusCode = 401;
            throw err;
        }
        if (!content || content.trim() === '') {
            const err = new Error('Vui lòng nhập nội dung đánh giá.');
            err.statusCode = 400;
            throw err;
        }
        if (!rating || rating < 1 || rating > 5) {
            const err = new Error('Số sao phải từ 1 đến 5.');
            err.statusCode = 400;
            throw err;
        }

        const isActive = data.is_active !== undefined ? data.is_active : 0;

        return await TestimonialRepository.create({
            user_id,
            content: content.trim(),
            rating: parseInt(rating),
            is_active: isActive
        });
    }

    async update(id, data) {
        const existing = await TestimonialRepository.findById(id);
        if (!existing) {
            const err = new Error('Không tìm thấy đánh giá.');
            err.statusCode = 404;
            throw err;
        }

        const { content, rating, is_active } = data;

        if (!content || content.trim() === '') {
            const err = new Error('Vui lòng nhập nội dung đánh giá.');
            err.statusCode = 400;
            throw err;
        }
        if (!rating || rating < 1 || rating > 5) {
            const err = new Error('Số sao phải từ 1 đến 5.');
            err.statusCode = 400;
            throw err;
        }

        const affected = await TestimonialRepository.update(id, {
            content: content.trim(),
            rating: parseInt(rating),
            is_active: is_active !== undefined ? is_active : existing.is_active
        });

        if (affected === 0) {
            const err = new Error('Cập nhật thất bại.');
            err.statusCode = 400;
            throw err;
        }
        return true;
    }

    async delete(id) {
        const existing = await TestimonialRepository.findById(id);
        if (!existing) {
            const err = new Error('Không tìm thấy đánh giá.');
            err.statusCode = 404;
            throw err;
        }
        const affected = await TestimonialRepository.delete(id);
        if (affected === 0) {
            const err = new Error('Xóa thất bại.');
            err.statusCode = 400;
            throw err;
        }
        return true;
    }

    async toggleActive(id, isActive) {
        const existing = await TestimonialRepository.findById(id);
        if (!existing) {
            const err = new Error('Không tìm thấy đánh giá.');
            err.statusCode = 404;
            throw err;
        }
        const affected = await TestimonialRepository.toggleActive(id, isActive);
        if (affected === 0) {
            const err = new Error('Cập nhật thất bại.');
            err.statusCode = 400;
            throw err;
        }
        return true;
    }
}

module.exports = new TestimonialService();