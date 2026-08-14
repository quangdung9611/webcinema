const TestimonialService = require('../Services/TestimonialService');

exports.getActive = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 4;
        const data = await TestimonialService.getActive(limit);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Get active testimonials error:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const result = await TestimonialService.getAll(page, limit, search);
        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (err) {
        console.error('Get all testimonials error:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await TestimonialService.getById(id);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Get testimonial by id error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

exports.create = async (req, res) => {
    try {
        const user_id = req.user?.user_id;
        const { content, rating } = req.body;

        const id = await TestimonialService.create({
            user_id,
            content,
            rating
        });

        return res.status(201).json({
            success: true,
            message: 'Cảm ơn bạn đã gửi đánh giá! Đánh giá của bạn sẽ được duyệt sớm.',
            data: { testimonial_id: id }
        });
    } catch (err) {
        console.error('Create testimonial error:', err);
        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        await TestimonialService.update(id, req.body);
        return res.status(200).json({
            success: true,
            message: 'Cập nhật đánh giá thành công!'
        });
    } catch (err) {
        console.error('Update testimonial error:', err);
        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        await TestimonialService.delete(id);
        return res.status(200).json({
            success: true,
            message: 'Xóa đánh giá thành công!'
        });
    } catch (err) {
        console.error('Delete testimonial error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};

exports.toggleActive = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        await TestimonialService.toggleActive(id, is_active);
        return res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái thành công!'
        });
    } catch (err) {
        console.error('Toggle active testimonial error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Lỗi máy chủ'
        });
    }
};