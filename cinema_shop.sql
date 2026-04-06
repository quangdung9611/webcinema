-- Thêm cho bảng users (nếu lệnh trên chưa chạy)
ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Thêm cho bảng cinemas
ALTER TABLE cinemas ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Thêm cho bảng rooms
ALTER TABLE rooms ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Thêm cho bảng movies (nếu chưa có)
ALTER TABLE movies ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;