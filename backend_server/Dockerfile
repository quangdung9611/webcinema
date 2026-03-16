# Sử dụng Node 20 bản nhẹ
FROM node:20-alpine

WORKDIR /app

# Copy package.json và package-lock.json
COPY package*.json ./

# Cài đặt tất cả dependencies (bao gồm cả nodemon trong devDependencies)
RUN npm install

# Copy toàn bộ code vào trong container
COPY . .

# Mở port 5000 như Dũng đã nói
EXPOSE 5000

# Chạy lệnh npm run dev để nodemon theo dõi thay đổi file
CMD ["npm", "run", "dev"]