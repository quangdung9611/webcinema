ALTER TABLE movies 
ADD COLUMN total_likes INT DEFAULT 0;

-- Thêm Index để Admin lọc phim hot nhanh hơn
ALTER TABLE movies ADD INDEX idx_total_likes (total_likes);