-- 1. Thêm cột views_count vào bảng movies
ALTER TABLE movies ADD COLUMN views_count INT DEFAULT 0;

-- 2. Reset tất cả lượt thích và lượt xem về 0 để làm mới giao diện
UPDATE movies SET total_likes = 0, views_count = 0;