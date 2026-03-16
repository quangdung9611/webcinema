# Sử dụng node phiên bản nhẹ
FROM node:20-alpine

# Tạo thư mục làm việc trong container
WORKDIR /app

# Copy file cấu hình thư viện trước để tối ưu build
COPY package*.json ./

# Cài đặt toàn bộ thư viện
RUN npm install

# Copy toàn bộ code từ máy thật vào container
COPY . .

# Mở port 5173 cho Vite
EXPOSE 5173

# Chạy lệnh npm run dev để bật chế độ sửa code nhanh (Hot Reload)
# Thêm -- --host để Vite có thể truy cập được từ bên ngoài container
CMD ["npm", "run", "dev", "--", "--host"]