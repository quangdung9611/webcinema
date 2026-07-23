/*=========================================================
    DEPENDENCIES
=========================================================*/

const Password = require("../utils/Password");
const UserRepository = require("../Repositories/UserRepository");
const { uploadToCloudinary, deleteFromCloudinary } = require("../Middlewares/UploadCloudinary");

/*=========================================================
    USER SERVICE
=========================================================*/

class UserService {

    /*=========================================================
        GET ALL USERS
    =========================================================*/
    async getAllUsers() {
        return await UserRepository.findAll();
    }

    /*=========================================================
        GET USER BY ID
    =========================================================*/
    async getUserById(userId) {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw {
                statusCode: 404,
                message: "Không tìm thấy người dùng"
            };
        }
        return user;
    }

    /*=========================================================
        GET USER PROFILE
    =========================================================*/
    async getProfile(userId) {
        const user = await UserRepository.findProfile(userId);
        if (!user) {
            throw {
                statusCode: 404,
                message: "Không tìm thấy người dùng"
            };
        }
        return user;
    }

    /*=========================================================
        CREATE USER (có upload avatar lên Cloudinary)
    =========================================================*/
    async createUser(data, file) {
        const {
            username,
            email,
            phone,
            password,
            full_name,
            address,
            role
        } = data;

        // Check exists
        const existed = await UserRepository.exists(username, email, phone);
        if (existed) {
            if (existed.username === username) {
                throw { statusCode: 400, field: "username", message: "Tên đăng nhập đã tồn tại" };
            }
            if (existed.email === email) {
                throw { statusCode: 400, field: "email", message: "Email đã tồn tại" };
            }
            if (existed.phone === phone) {
                throw { statusCode: 400, field: "phone", message: "Số điện thoại đã tồn tại" };
            }
        }

        // Hash password
        const hashedPassword = await Password.hash(password);

        // Upload avatar lên Cloudinary nếu có file
        let avatarUrl = null;
        if (file) {
            const result = await uploadToCloudinary(file, 'cinema_shop/avatars');
            avatarUrl = result.url;
        }

        return await UserRepository.create({
            username,
            full_name,
            phone,
            address: address || "",
            email,
            password: hashedPassword,
            user_avatar: avatarUrl, // Lưu URL Cloudinary
            role: role || "customer",
            status: "active",
            email_verified: 0,
            points: 0
        });
    }

    /*=========================================================
        UPDATE USER (Admin) - có upload avatar
    =========================================================*/
    async updateUser(userId, data, file) {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw { statusCode: 404, message: "Không tìm thấy người dùng" };
        }

        // Check email
        if (data.email && data.email !== user.email) {
            const exists = await UserRepository.existsByEmail(data.email);
            if (exists) {
                throw { statusCode: 400, field: "email", message: "Email đã tồn tại" };
            }
        }

        // Check phone
        if (data.phone && data.phone !== user.phone) {
            const exists = await UserRepository.existsByPhone(data.phone);
            if (exists) {
                throw { statusCode: 400, field: "phone", message: "Số điện thoại đã tồn tại" };
            }
        }

        // Check username
        if (data.username && data.username !== user.username) {
            const exists = await UserRepository.existsByUsername(data.username);
            if (exists) {
                throw { statusCode: 400, field: "username", message: "Tên đăng nhập đã tồn tại" };
            }
        }

        // Xử lý avatar mới
        let avatarUrl = user.user_avatar;
        if (file) {
            // Xóa ảnh cũ trên Cloudinary (nếu có)
            if (user.user_avatar) {
                // Lấy public_id từ URL Cloudinary
                const urlParts = user.user_avatar.split('/');
                const publicId = urlParts.slice(7).join('/').split('.')[0];
                await deleteFromCloudinary(publicId);
            }
            // Upload ảnh mới
            const result = await uploadToCloudinary(file, 'cinema_shop/avatars');
            avatarUrl = result.url;
        }

        // Không cho sửa password ở API này
        delete data.password;
        delete data.newPassword;
        delete data.oldPassword;

        // Cập nhật profile với avatar mới
        return await UserRepository.updateProfile(userId, {
            ...data,
            user_avatar: avatarUrl
        });
    }

    /*=========================================================
        UPDATE USER STATUS
    =========================================================*/
    async updateUserStatus(userId, status) {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw {
                statusCode: 404,
                message: "Không tìm thấy người dùng"
            };
        }
        return await UserRepository.updateStatus(userId, status);
    }

    /*=========================================================
        UPDATE USER ROLE
    =========================================================*/
    async updateUserRole(userId, role) {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw {
                statusCode: 404,
                message: "Không tìm thấy người dùng"
            };
        }
        if (!["admin", "customer"].includes(role)) {
            throw {
                statusCode: 400,
                field: "role",
                message: "Role phải là 'admin' hoặc 'customer'"
            };
        }
        return await UserRepository.updateRole(userId, role);
    }

    /*=========================================================
        DELETE USER
    =========================================================*/
    async deleteUser(userId) {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw {
                statusCode: 404,
                message: "Không tìm thấy người dùng"
            };
        }
        // Nên xóa cả ảnh trên Cloudinary trước khi xóa user
        if (user.user_avatar) {
            const urlParts = user.user_avatar.split('/');
            const publicId = urlParts.slice(7).join('/').split('.')[0];
            await deleteFromCloudinary(publicId);
        }
        return await UserRepository.delete(userId);
    }

    /*=========================================================
        UPDATE PROFILE (User tự cập nhật)
    =========================================================*/
    async updateProfile(userId, data) {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw {
                statusCode: 404,
                message: "Không tìm thấy người dùng"
            };
        }

        // Check unique fields
        if (data.email && data.email !== user.email) {
            const exists = await UserRepository.existsByEmail(data.email);
            if (exists) {
                throw {
                    statusCode: 400,
                    field: "email",
                    message: "Email đã tồn tại"
                };
            }
        }

        if (data.phone && data.phone !== user.phone) {
            const exists = await UserRepository.existsByPhone(data.phone);
            if (exists) {
                throw {
                    statusCode: 400,
                    field: "phone",
                    message: "Số điện thoại đã tồn tại"
                };
            }
        }

        if (data.username && data.username !== user.username) {
            const exists = await UserRepository.existsByUsername(data.username);
            if (exists) {
                throw {
                    statusCode: 400,
                    field: "username",
                    message: "Tên đăng nhập đã tồn tại"
                };
            }
        }

        // Handle password change
        if (data.newPassword) {
            if (!data.oldPassword) {
                throw {
                    statusCode: 400,
                    field: "oldPassword",
                    message: "Vui lòng nhập mật khẩu cũ"
                };
            }

            const isMatch = await Password.compare(data.oldPassword, user.password);
            if (!isMatch) {
                throw {
                    statusCode: 400,
                    field: "oldPassword",
                    message: "Mật khẩu cũ không đúng"
                };
            }

            if (!Password.isStrong(data.newPassword)) {
                throw {
                    statusCode: 400,
                    field: "newPassword",
                    message: "Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
                };
            }

            const hashed = await Password.hash(data.newPassword);
            await UserRepository.updatePassword(userId, hashed);
        }

        // Remove password fields before update
        delete data.oldPassword;
        delete data.newPassword;
        delete data.password;

        // Update profile
        return await UserRepository.updateProfile(userId, data);
    }

    /*=========================================================
        UPDATE AVATAR (User tự upload)
    =========================================================*/
    async updateAvatar(userId, file) {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw {
                statusCode: 404,
                message: "Không tìm thấy người dùng"
            };
        }

        // Xóa ảnh cũ trên Cloudinary (nếu có)
        if (user.user_avatar) {
            const urlParts = user.user_avatar.split('/');
            const publicId = urlParts.slice(7).join('/').split('.')[0];
            await deleteFromCloudinary(publicId);
        }

        // Upload ảnh mới lên Cloudinary
        const result = await uploadToCloudinary(file, 'cinema_shop/avatars');
        const avatarUrl = result.url;

        // Cập nhật vào database
        const affectedRows = await UserRepository.updateAvatar(userId, avatarUrl);

        if (affectedRows === 0) {
            throw {
                statusCode: 500,
                message: "Không thể cập nhật ảnh đại diện"
            };
        }

        // Trả về URL Cloudinary
        return avatarUrl;
    }

    /*=========================================================
        GET USER BOOKINGS (ĐÃ SỬA)
    =========================================================*/
    async getUserBookings(userId) {
        // TODO: Thay bằng truy vấn thực tế từ database khi có BookingService
        return [];
    }

    /*=========================================================
        CLEAR BOOKING HISTORY (ĐÃ SỬA)
    =========================================================*/
    async clearHistory(userId) {
        // TODO: Thêm logic xóa booking khi có BookingService
        return true;
    }

    /*=========================================================
        RESET USER POINTS
    =========================================================*/
    async resetPoints(userId) {
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw {
                statusCode: 404,
                message: "Không tìm thấy người dùng"
            };
        }
        return await UserRepository.resetPoints(userId);
    }
}

module.exports = new UserService();