-- 1. Bảng Đánh giá
ALTER TABLE reviews 
MODIFY COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2. Bảng Vé & Đặt vé
ALTER TABLE tickets MODIFY COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE bookings MODIFY COLUMN booking_date DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 3. Bảng Người dùng (Giữ nguyên dữ liệu, chỉ cập nhật cấu trúc để đăng ký mới tự lấy giờ)
ALTER TABLE users MODIFY COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 4. Bảng Phim (Giữ nguyên dữ liệu, chỉ cập nhật cấu trúc)
ALTER TABLE movies MODIFY COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 5. Bảng Suất chiếu
ALTER TABLE showtimes MODIFY COLUMN start_time DATETIME NOT NULL;

-- 6. Bổ sung cột created_at cho Rạp và Phòng (nếu chưa có)
-- Nếu chạy dòng dưới mà báo lỗi "Duplicate column" thì ông cứ bỏ qua nhé
ALTER TABLE cinemas ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rooms ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;