const db = require('../Config/db');

// 1. Kiểm tra mã giảm giá (Dành cho người dùng)
// 1. Kiểm tra mã giảm giá (Dành cho người dùng)
exports.checkCoupon = async (req, res) => {
    try {
        const { code, userId } = req.body;

        if (!code || !userId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin mã hoặc người dùng!"
            });
        }

        // BƯỚC 1: Kiểm tra mã tồn tại và còn hạn
        const [couponRows] = await db.query(
            "SELECT * FROM coupons WHERE coupon_code = ? AND expiry_date >= CURDATE()",
            [code]
        );

        if (couponRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mã giảm giá không tồn tại hoặc đã hết hạn!"
            });
        }

        const coupon = couponRows[0];

        // BƯỚC 2: Kiểm tra trạng thái từ bảng bookings
        // Logic: Chặn nếu trạng thái là 'Pending' hoặc 'Completed'
        // Nếu là 'Cancelled' thì SQL này sẽ không tìm thấy -> Cho phép dùng lại mã.
        const [usedRows] = await db.query(
            `SELECT status FROM bookings 
             WHERE user_id = ? 
             AND coupon_id = ? 
             AND status IN ('Pending', 'Completed')`, 
            [userId, coupon.coupon_id]
        );

        if (usedRows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Bạn đã sử dụng mã giảm giá này rồi hoặc đang có đơn hàng chờ thanh toán!"
            });
        }

        // BƯỚC 3: Trả về kết quả nếu hợp lệ
        return res.status(200).json({
            success: true,
            data: {
                coupon_id: coupon.coupon_id,
                discount_value: coupon.discount_value
            }
        });

    } catch (error) {
        console.error("Lỗi checkCoupon:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi kiểm tra mã." });
    }
};
// 2. Lấy tất cả mã (Admin)
exports.getAllCoupons = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM coupons ORDER BY expiry_date DESC");
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Thêm mã mới (Admin)
exports.createCoupon = async (req, res) => {
    try {
        const { coupon_code, discount_value, expiry_date } = req.body;
        await db.query(
            "INSERT INTO coupons (coupon_code, discount_value, expiry_date) VALUES (?, ?, ?)",
            [coupon_code, discount_value, expiry_date]
        );
        res.status(201).json({ success: true, message: "Thêm mã thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Sửa mã (Admin)
exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { coupon_code, discount_value, expiry_date } = req.body;
        await db.query(
            "UPDATE coupons SET coupon_code = ?, discount_value = ?, expiry_date = ? WHERE coupon_id = ?",
            [coupon_code, discount_value, expiry_date, id]
        );
        res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Xóa mã (Admin)
exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM coupons WHERE coupon_id = ?", [id]);
        res.status(200).json({ success: true, message: "Xóa mã thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};