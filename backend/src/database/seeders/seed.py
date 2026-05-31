from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from src.models.booking import Booking
from src.models.customer import Customer
from src.models.enums import BookingStatus, InvoiceStatus, RoomStatus
from src.models.invoice import Invoice
from src.models.room import Room


def seed_initial_data(db: Session) -> None:
    if db.query(Room).count() > 0:
        return

    room_specs = [
        ("101", "Standard", 400000, RoomStatus.AVAILABLE, 1),
        ("102", "Standard", 400000, RoomStatus.BOOKED, 1),
        ("103", "Standard", 400000, RoomStatus.OCCUPIED, 1),
        ("104", "Standard", 400000, RoomStatus.AVAILABLE, 1),
        ("105", "Standard", 400000, RoomStatus.AVAILABLE, 1),
        ("106", "Standard", 400000, RoomStatus.AVAILABLE, 1),
        ("107", "Standard", 400000, RoomStatus.OCCUPIED, 1),
        ("108", "Standard", 400000, RoomStatus.AVAILABLE, 1),
        ("201", "Deluxe", 650000, RoomStatus.OCCUPIED, 2),
        ("202", "Deluxe", 650000, RoomStatus.AVAILABLE, 2),
        ("203", "Deluxe", 650000, RoomStatus.AVAILABLE, 2),
        ("204", "Deluxe", 650000, RoomStatus.BOOKED, 2),
        ("205", "Deluxe", 650000, RoomStatus.OCCUPIED, 2),
        ("206", "Deluxe", 650000, RoomStatus.AVAILABLE, 2),
        ("207", "Deluxe", 650000, RoomStatus.AVAILABLE, 2),
        ("208", "Deluxe", 650000, RoomStatus.CLEANING, 2),
        ("301", "Family", 900000, RoomStatus.CLEANING, 3),
        ("302", "Family", 900000, RoomStatus.OCCUPIED, 3),
        ("303", "Family", 900000, RoomStatus.AVAILABLE, 3),
        ("304", "Family", 900000, RoomStatus.AVAILABLE, 3),
        ("305", "Family", 900000, RoomStatus.OCCUPIED, 3),
        ("306", "Family", 900000, RoomStatus.AVAILABLE, 3),
        ("307", "Family", 900000, RoomStatus.OCCUPIED, 3),
        ("308", "Family", 900000, RoomStatus.OCCUPIED, 3),
    ]

    rooms = [
        Room(
            room_number=room_number,
            room_type=room_type,
            price_per_night=Decimal(price),
            status=room_status,
            floor=floor,
        )
        for room_number, room_type, price, room_status, floor in room_specs
    ]
    db.add_all(rooms)
    db.flush()

    room_by_number = {room.room_number: room for room in rooms}
    today = date.today()

    customers = [
        Customer(full_name="Nguyen Van An", phone="0901234567"),
        Customer(full_name="Tran Thi Mai", phone="0932345678"),
        Customer(full_name="Le Hoang Nam", phone="0987654321"),
        Customer(full_name="Pham Thu Ha", phone="0912888999"),
        Customer(full_name="Do Minh Quan", phone="0909001122"),
    ]
    db.add_all(customers)
    db.flush()

    bookings = [
        Booking(
            customer_id=customers[0].id,
            room_id=room_by_number["102"].id,
            check_in_date=today + timedelta(days=1),
            check_out_date=today + timedelta(days=3),
            deposit_amount=Decimal("200000"),
            status=BookingStatus.BOOKED,
            note=None,
        ),
        Booking(
            customer_id=customers[1].id,
            room_id=room_by_number["204"].id,
            check_in_date=today + timedelta(days=1),
            check_out_date=today + timedelta(days=2),
            deposit_amount=Decimal("300000"),
            status=BookingStatus.BOOKED,
            note="Yeu cau giuong doi",
        ),
    ]

    occupied_room_numbers = ["103", "107", "201", "205", "302", "305", "307", "308"]
    for index, room_number in enumerate(occupied_room_numbers):
        bookings.append(
            Booking(
                customer_id=customers[index % len(customers)].id,
                room_id=room_by_number[room_number].id,
                check_in_date=today - timedelta(days=1),
                check_out_date=today + timedelta(days=1 + (index % 2)),
                deposit_amount=Decimal("0"),
                status=BookingStatus.CHECKED_IN,
            )
        )

    paid_booking = Booking(
        customer_id=customers[4].id,
        room_id=room_by_number["101"].id,
        check_in_date=today - timedelta(days=3),
        check_out_date=today,
        deposit_amount=Decimal("0"),
        status=BookingStatus.CHECKED_OUT,
    )
    bookings.append(paid_booking)

    db.add_all(bookings)
    db.flush()

    db.add(
        Invoice(
            booking_id=paid_booking.id,
            total_amount=Decimal("4200000"),
            paid_amount=Decimal("4200000"),
            status=InvoiceStatus.PAID,
            issued_at=datetime.now(),
        )
    )

    db.commit()
