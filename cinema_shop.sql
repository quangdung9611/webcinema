-- 1. Xóa dữ liệu các bảng liên quan đến đơn hàng (như ông đã làm)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE booking_details;
TRUNCATE TABLE tickets;
TRUNCATE TABLE bookings;

-- 2. Reset điểm của tất cả User về 0 để đồng bộ
UPDATE users SET points = 0;

SET FOREIGN_KEY_CHECKS = 1;