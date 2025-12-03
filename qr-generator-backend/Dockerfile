# backend/Dockerfile

# 1. Dùng môi trường Node.js
FROM node:18-alpine

# 2. Tạo thư mục làm việc bên trong container
WORKDIR /app

# 3. Copy file package.json vào trước để cài thư viện (tận dụng cache)
COPY package*.json ./

# 4. Cài đặt thư viện
RUN npm install

# 5. Copy toàn bộ code backend vào
COPY . .

# 6. Mở cổng 5000
EXPOSE 5000

# 7. Lệnh chạy server
CMD ["npm", "run", "dev"]