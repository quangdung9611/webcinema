const UserService = require("../Services/UserService");

/*=========================================================
    ADMIN - GET ALL USERS
=========================================================*/
exports.getAllUsers = async (req, res) => {
    try {
        const { search = "" } = req.query;
        if (req.query.page !== undefined || req.query.limit !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Route /api/users không hỗ trợ page/limit. Vui lòng dùng /api/users/paginated"
            });
        }
        const data = await UserService.getAllUsersAll(search);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Get All Users Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};

/*=========================================================
    ADMIN - GET USERS WITH PAGINATION
=========================================================*/
exports.getUsersWithPagination = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;
        const result = await UserService.getAllUsers(page, limit, search);
        return res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (err) {
        console.error("Get Users Paginated Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};

/*=========================================================
    ADMIN - GET USER BY ID
=========================================================*/
exports.getUserById = async (req, res) => {
    try {
        const user = await UserService.getUserById(req.params.user_id);
        return res.status(200).json({ success: true, data: user });
    } catch (err) {
        console.error("Get User By ID Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};

/*=========================================================
    ADMIN - CREATE USER
=========================================================*/
exports.createUser = async (req, res) => {
    try {
        const userId = await UserService.createUser(req.body, req.file);
        return res.status(201).json({ success: true, message: "Tạo user thành công", data: { user_id: userId } });
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
        await UserService.updateUser(req.params.user_id, req.body, req.file);
        return res.status(200).json({ success: true, message: "Cập nhật user thành công" });
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
        const { status } = req.body;
        if (!status || !["active", "banned"].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status phải là "active" hoặc "banned"' });
        }
        await UserService.updateUserStatus(req.params.user_id, status);
        return res.status(200).json({ success: true, message: `Cập nhật trạng thái thành công: ${status}` });
    } catch (err) {
        console.error("Update User Status Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};

/*=========================================================
    ADMIN - UPDATE USER ROLE
=========================================================*/
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!role || !["admin", "customer"].includes(role)) {
            return res.status(400).json({ success: false, message: 'Role phải là "admin" hoặc "customer"' });
        }
        await UserService.updateUserRole(req.params.user_id, role);
        return res.status(200).json({ success: true, message: `Cập nhật role thành công: ${role}` });
    } catch (err) {
        console.error("Update User Role Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};

/*=========================================================
    ADMIN - DELETE USER
=========================================================*/
exports.deleteUser = async (req, res) => {
    try {
        await UserService.deleteUser(req.params.user_id);
        return res.status(200).json({ success: true, message: "Xóa user thành công" });
    } catch (err) {
        console.error("Delete User Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};

/*=========================================================
    USER - GET MY PROFILE
=========================================================*/
exports.getUserProfile = async (req, res) => {
    try {
        const user = await UserService.getProfile(req.user.user_id);
        return res.status(200).json({ success: true, data: user });
    } catch (err) {
        console.error("Get Profile Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};

/*=========================================================
    USER - UPDATE MY PROFILE
=========================================================*/
exports.updateUserProfile = async (req, res) => {
    try {
        const result = await UserService.updateProfile(req.user.user_id, req.body);
        return res.status(200).json({ success: true, message: "Cập nhật hồ sơ thành công", data: result });
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
        if (!req.file) return res.status(400).json({ success: false, message: "Vui lòng chọn file ảnh" });
        const avatarUrl = await UserService.updateAvatar(req.user.user_id, req.file);
        return res.status(200).json({ success: true, message: "Cập nhật ảnh đại diện thành công", data: { avatar: avatarUrl } });
    } catch (err) {
        console.error("Upload Avatar Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};

/*=========================================================
    USER - GET MY BOOKINGS
=========================================================*/
exports.getMyBookings = async (req, res) => {
    try {
        const { from, to } = req.query;
        const bookings = await UserService.getUserBookings(req.user.user_id, from, to);
        return res.status(200).json({ success: true, bookings });
    } catch (err) {
        console.error("Get My Bookings Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};

/*=========================================================
    USER - CLEAR BOOKING HISTORY
=========================================================*/
exports.clearBookingHistory = async (req, res) => {
    try {
        await UserService.clearHistory(req.user.user_id);
        return res.status(200).json({ success: true, message: "Đã xóa lịch sử đặt vé và reset điểm về 0" });
    } catch (err) {
        console.error("Clear History Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};

/*=========================================================
    USER - RESET MY POINTS
=========================================================*/
exports.resetMyPoints = async (req, res) => {
    try {
        await UserService.resetPoints(req.user.user_id);
        return res.status(200).json({ success: true, message: "Đã reset điểm thành công" });
    } catch (err) {
        console.error("Reset Points Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};

/*=========================================================
    🔐 USER - PIN MANAGEMENT
=========================================================*/
exports.setupPin = async (req, res) => {
    try {
        const { pin } = req.body;
        await UserService.setupPin(req.user.user_id, pin);
        return res.status(200).json({ success: true, message: "Thiết lập mã PIN thành công!" });
    } catch (err) {
        console.error("Setup PIN Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            code: err.code || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

exports.verifyPin = async (req, res) => {
    try {
        const { pin } = req.body;
        await UserService.verifyPin(req.user.user_id, pin);
        return res.status(200).json({ success: true, message: "Xác thực PIN thành công" });
    } catch (err) {
        console.error("Verify PIN Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    🆕 UPDATE / ĐỔI PIN
=========================================================*/
exports.updatePin = async (req, res) => {
    try {
        const { oldPin, newPin } = req.body;

        if (!oldPin || !newPin) {
            return res.status(400).json({
                success: false,
                field: !oldPin ? "oldPin" : "newPin",
                message: "Vui lòng nhập đầy đủ PIN cũ và PIN mới"
            });
        }

        await UserService.updatePin(req.user.user_id, oldPin, newPin);

        return res.status(200).json({
            success: true,
            message: "Đổi mã PIN thành công!"
        });
    } catch (err) {
        console.error("Update PIN Error:", err);
        return res.status(err.statusCode || 400).json({
            success: false,
            field: err.field || null,
            code: err.code || null,
            message: err.message || "Lỗi máy chủ"
        });
    }
};

exports.getPinStatus = async (req, res) => {
    try {
        const status = await UserService.getPinStatus(req.user.user_id);
        return res.status(200).json({ success: true, data: status });
    } catch (err) {
        console.error("Get PIN Status Error:", err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
    }
};