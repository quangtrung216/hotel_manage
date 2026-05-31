# Hotel Manage

Ứng dụng demo quản lý khách sạn nhỏ, gồm frontend Next.js, backend FastAPI và database MySQL chạy bằng Docker Compose.

## Mục tiêu của case

Case này mô phỏng một hệ thống quản lý khách sạn quy mô nhỏ với các nghiệp vụ cơ bản:

- Xem dashboard tổng quan: tổng số phòng, phòng trống, phòng đang có khách, doanh thu hôm nay.
- Quản lý phòng: xem danh sách, thêm phòng, sửa phòng, xóa phòng.
- Quản lý khách hàng: xem danh sách và thêm khách hàng.
- Quản lý đặt phòng: tạo đơn đặt phòng, check-in, check-out, hủy đặt phòng.
- Quản lý hóa đơn: xem hóa đơn phát sinh sau khi khách check-out.

Ứng dụng phù hợp để thực hành luồng fullstack đơn giản: giao diện gọi API, API xử lý nghiệp vụ, dữ liệu lưu xuống MySQL.

## Công nghệ sử dụng

- Frontend: Next.js, React, TypeScript, CSS.
- Backend: Python, FastAPI, SQLAlchemy, PyMySQL.
- Database: MySQL 8.4.
- Runtime: Docker Compose.

## Cấu trúc thư mục

```text
hotel_manage/
  backend/              # FastAPI backend
    src/
      config/           # Cấu hình app
      database/         # Kết nối DB, migration nhỏ, seed data
      models/           # SQLAlchemy models
      routes/           # API routes
      schemas/          # Pydantic schemas
      services/         # Xử lý nghiệp vụ
    Dockerfile
    requirements.txt

  frontend/             # Next.js frontend
    app/
      page.tsx          # Giao diện chính
      globals.css       # Style giao diện

  docker-compose.yml    # Chạy MySQL và FastAPI
```

## Cách chạy nhanh

Ở thư mục gốc project:

```powershell
docker compose up -d --build
```

Sau đó chạy frontend:

```powershell
cd frontend
npm run dev
```

Mở trình duyệt:

```text
Frontend: http://localhost:3000
Swagger API: http://localhost:8000/docs
Health check: http://localhost:8000/api/health
```

## Cổng sử dụng

```text
Frontend: 3000
FastAPI: 8000
MySQL trong máy host: 4000
MySQL trong Docker network: 3306
```

Thông tin database mặc định:

```text
Database: hotel_manage
User: hotel_user
Password: hotel_password
Root password: root_password
```

## Chạy từng phần

Chỉ chạy MySQL và API:

```powershell
docker compose up -d --build
```

Chỉ chạy lại API sau khi sửa backend:

```powershell
docker compose up -d --build api
```

Chạy frontend:

```powershell
cd frontend
npm run dev
```

Nếu port `3000` đã bị chiếm:

```powershell
cd frontend
npm run dev -- --port 3001
```

## API chính

```text
GET  /api/health
GET  /api/dashboard/summary

GET  /api/rooms
POST /api/rooms
GET  /api/rooms/{room_id}
PATCH /api/rooms/{room_id}
DELETE /api/rooms/{room_id}

GET  /api/customers
POST /api/customers
GET  /api/customers/{customer_id}
PATCH /api/customers/{customer_id}

GET  /api/bookings
GET  /api/bookings/upcoming
POST /api/bookings
GET  /api/bookings/{booking_id}
PATCH /api/bookings/{booking_id}
POST /api/bookings/{booking_id}/check-in
POST /api/bookings/{booking_id}/check-out
POST /api/bookings/{booking_id}/cancel

GET  /api/invoices
```

## Luồng nghiệp vụ cơ bản

1. Tạo hoặc chọn phòng còn trống.
2. Tạo đặt phòng với thông tin khách hàng, số điện thoại, ngày nhận phòng, ngày trả phòng và tiền cọc.
3. Khi khách đến, bấm check-in để chuyển booking sang trạng thái đang ở.
4. Khi khách trả phòng, bấm check-out để tạo hóa đơn và giải phóng phòng.
5. Dashboard tự cập nhật số phòng và doanh thu dựa trên dữ liệu hiện tại.

## Dữ liệu mẫu

Backend có seed dữ liệu mẫu khi database đang trống. Nếu bạn muốn tạo lại dữ liệu từ đầu, có thể xóa volume database:

```powershell
docker compose down -v
docker compose up -d --build
```

Lưu ý: `docker compose down -v` sẽ xóa toàn bộ dữ liệu MySQL hiện tại.

## Xử lý lỗi thường gặp

Nếu frontend báo `Failed to fetch`, kiểm tra backend:

```text
http://localhost:8000/api/health
```

Nếu port `3000` báo đã có Next dev server chạy, tắt process đang giữ port hoặc chạy frontend ở port khác.

Nếu sửa backend nhưng API chưa cập nhật, rebuild lại service:

```powershell
docker compose up -d --build api
```
