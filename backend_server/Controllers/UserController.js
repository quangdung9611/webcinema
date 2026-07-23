/*=========================================================
    DEPENDENCIES
=========================================================*/

const UserService = require("../Services/UserService");

/*=========================================================
    ADMIN - GET ALL USERS
=========================================================*/

exports.getAllUsers = async (req, res) => {
    try {
        const data = await UserService.getAllUsers();
        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        console.error("Get All Users Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - GET USER BY ID
=========================================================*/

exports.getUserById = async (req, res) => {
    try {
        const { user_id } = req.params;
        const user = await UserService.getUserById(user_id);
        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error("Get User By ID Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - CREATE USER
=========================================================*/

exports.createUser = async (req, res) => {
    try {

        const userId = await UserService.createUser(
            req.body,
            req.file
        );

        return res.status(201).json({
            success: true,
            message: "Tạo user thành công",
            data: {
                user_id: userId
            }
        });

    } catch (err) {

        console.error("Create User Error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - UPDATE USER
=========================================================*/

exports.updateUser = async (req, res) => {
    try {

        const { user_id } = req.params;

        await UserService.updateUser(
            user_id,
            req.body,
            req.file
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật user thành công"
        });

    } catch (err) {

        console.error("Update User Error:", err);

        return res.status(err.statusCode || 500).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};
/*=========================================================
    ADMIN - UPDATE USER STATUS
=========================================================*/

exports.updateUserStatus = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { status } = req.body;

        if (!status || !["active", "banned"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status phải là "active" hoặc "banned"'
            });
        }

        await UserService.updateUserStatus(user_id, status);
        return res.status(200).json({
            success: true,
            message: `Cập nhật trạng thái user thành công: ${status}`
        });
    } catch (err) {
        console.error("Update User Status Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - UPDATE USER ROLE
=========================================================*/

exports.updateUserRole = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { role } = req.body;

        if (!role || !["admin", "customer"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Role phải là "admin" hoặc "customer"'
            });
        }

        await UserService.updateUserRole(user_id, role);
        return res.status(200).json({
            success: true,
            message: `Cập nhật role user thành công: ${role}`
        });
    } catch (err) {
        console.error("Update User Role Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ADMIN - DELETE USER
=========================================================*/

exports.deleteUser = async (req, res) => {
    try {
        const { user_id } = req.params;
        await UserService.deleteUser(user_id);
        return res.status(200).json({
            success: true,
            message: "Xóa user thành công"
        });
    } catch (err) {
        console.error("Delete User Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    USER - GET MY PROFILE
=========================================================*/

exports.getUserProfile = async (req, res) => {
    try {
        const user = await UserService.getProfile(req.user.user_id);
        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error("Get Profile Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    USER - UPDATE MY PROFILE
=========================================================*/

exports.updateUserProfile = async (req, res) => {
    try {
        const result = await UserService.updateProfile(
            req.user.user_id,
            req.body
        );
        return res.status(200).json({
            success: true,
            message: "Cập nhật hồ sơ thành công",
            data: result
        });
    } catch (err) {
        console.error("Update Profile Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    USER - UPLOAD AVATAR
=========================================================*/

exports.uploadAvatar = async (req, res) => {
    try {
        // Kiểm tra file từ multer
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng chọn file ảnh"
            });
        }

        // Gọi service xử lý upload và cập nhật DB
        const avatarUrl = await UserService.updateAvatar(
            req.user.user_id,
            req.file
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật ảnh đại diện thành công",
            data: { avatar: avatarUrl }
        });
    } catch (err) {
        console.error("Upload Avatar Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    USER - GET MY BOOKINGS (ĐÃ SỬA)
=========================================================*/

exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await UserService.getUserBookings(req.user.user_id);
        return res.status(200).json({
            success: true,
            bookings   // ← QUAN TRỌNG: trả về key 'bookings' để client đọc đúng
        });
    } catch (err) {
        console.error("Get My Bookings Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    USER - CLEAR BOOKING HISTORY (ĐÃ SỬA)
=========================================================*/

exports.clearBookingHistory = async (req, res) => {
    try {
        await UserService.clearHistory(req.user.user_id);
        return res.status(200).json({
            success: true,
            message: "Đã xóa lịch sử đặt vé"
        });
    } catch (err) {
        console.error("Clear History Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    USER - RESET MY POINTS
=========================================================*/

exports.resetMyPoints = async (req, res) => {
    try {
        await UserService.resetPoints(req.user.user_id);
        return res.status(200).json({
            success: true,
            message: "Đã reset điểm thành công"
        });
    } catch (err) {
        console.error("Reset Points Error:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Lỗi máy chủ"
        });
    }
};