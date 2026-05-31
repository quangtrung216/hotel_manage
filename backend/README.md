# Mini Hotel API

FastAPI backend cho webapp quản lý khách sạn nhỏ.

## Chạy bằng Docker Compose

Từ thư mục gốc project:

```powershell
docker compose up -d --build
```

API chạy tại:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

## Chạy FastAPI ngoài Docker

MySQL vẫn chạy trong Docker qua port `4000`.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn src.main:app --reload
```

## API chính

- `GET /api/dashboard/summary`
- `GET /api/rooms`
- `POST /api/rooms`
- `PATCH /api/rooms/{room_id}`
- `DELETE /api/rooms/{room_id}`
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/bookings`
- `GET /api/bookings/upcoming`
- `POST /api/bookings`
- `POST /api/bookings/{booking_id}/check-in`
- `POST /api/bookings/{booking_id}/check-out`
- `GET /api/invoices`
