INSERT INTO users (full_name, email, password, role)
VALUES 
('Admin', 'admin@gmail.com', '123456', 'admin');

INSERT INTO rooms 
(room_number, room_type, price_per_night, max_guests, status, description)
VALUES
('101', 'Standard', 400000, 2, 'available', 'Phòng tiêu chuẩn 2 người'),
('102', 'Standard', 400000, 2, 'available', 'Phòng tiêu chuẩn 2 người'),
('201', 'Deluxe', 650000, 2, 'available', 'Phòng Deluxe'),
('301', 'Family', 900000, 4, 'available', 'Phòng gia đình');

INSERT INTO customers 
(full_name, phone, email, identity_number, address)
VALUES
('Nguyễn Văn A', '0987654321', 'vana@gmail.com', '012345678901', 'Hà Nội');

INSERT INTO bookings 
(booking_code, customer_id, room_id, checkin_date, checkout_date, number_of_guests, deposit_amount, status, created_by)
VALUES
('BK001', 1, 1, '2026-06-01', '2026-06-03', 2, 200000, 'confirmed', 1);

UPDATE rooms
SET status = 'booked'
WHERE id = 1;