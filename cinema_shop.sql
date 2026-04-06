-- Tạm thời tắt kiểm tra khóa ngoại để xóa
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE booking_details;
TRUNCATE TABLE bookings;
TRUNCATE TABLE tickets;

-- Bật lại kiểm tra khóa ngoại
SET FOREIGN_KEY_CHECKS = 1;