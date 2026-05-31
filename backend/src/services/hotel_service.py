from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from src.models.booking import Booking
from src.models.customer import Customer
from src.models.enums import BookingStatus, InvoiceStatus, RoomStatus
from src.models.invoice import Invoice
from src.models.room import Room
from src.schemas.booking import BookingCreate, BookingUpdate
from src.schemas.customer import CustomerCreate, CustomerUpdate
from src.schemas.room import RoomCreate, RoomUpdate


ACTIVE_BOOKING_STATUSES = [BookingStatus.BOOKED, BookingStatus.CHECKED_IN]


def list_rooms(db: Session, skip: int = 0, limit: int = 20, status_filter: RoomStatus | None = None) -> tuple[list[Room], int]:
    query = db.query(Room)
    if status_filter:
        query = query.filter(Room.status == status_filter)

    total = query.count()
    rooms = query.order_by(Room.room_number.asc()).offset(skip).limit(limit).all()
    return rooms, total


def get_room(db: Session, room_id: int) -> Room:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return room


def create_room(db: Session, payload: RoomCreate) -> Room:
    if db.query(Room).filter(Room.room_number == payload.room_number).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room number already exists")

    room = Room(**payload.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def update_room(db: Session, room_id: int, payload: RoomUpdate) -> Room:
    room = get_room(db, room_id)
    data = payload.model_dump(exclude_unset=True)

    if "room_number" in data:
        exists = db.query(Room).filter(Room.room_number == data["room_number"], Room.id != room_id).first()
        if exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room number already exists")

    for field, value in data.items():
        setattr(room, field, value)

    db.commit()
    db.refresh(room)
    return room


def delete_room(db: Session, room_id: int) -> None:
    room = get_room(db, room_id)
    active_booking = (
        db.query(Booking)
        .filter(Booking.room_id == room_id, Booking.status.in_(ACTIVE_BOOKING_STATUSES))
        .first()
    )
    if active_booking:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room has an active booking")

    db.delete(room)
    db.commit()


def list_customers(db: Session, skip: int = 0, limit: int = 20) -> list[Customer]:
    return db.query(Customer).order_by(Customer.id.desc()).offset(skip).limit(limit).all()


def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


def create_customer(db: Session, payload: CustomerCreate) -> Customer:
    if db.query(Customer).filter(Customer.phone == payload.phone).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already exists")

    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def update_customer(db: Session, customer_id: int, payload: CustomerUpdate) -> Customer:
    customer = get_customer(db, customer_id)
    data = payload.model_dump(exclude_unset=True)

    if "phone" in data:
        exists = db.query(Customer).filter(Customer.phone == data["phone"], Customer.id != customer_id).first()
        if exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already exists")

    for field, value in data.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return customer


def _get_or_create_customer(db: Session, customer_name: str, phone: str) -> Customer:
    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if customer:
        customer.full_name = customer_name
        return customer

    customer = Customer(full_name=customer_name, phone=phone)
    db.add(customer)
    db.flush()
    return customer


def _ensure_room_is_bookable(db: Session, room: Room, payload: BookingCreate) -> None:
    if room.status in [RoomStatus.OCCUPIED, RoomStatus.CLEANING, RoomStatus.MAINTENANCE]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room is not bookable")

    overlap = (
        db.query(Booking)
        .filter(
            Booking.room_id == room.id,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
            Booking.check_in_date < payload.check_out_date,
            Booking.check_out_date > payload.check_in_date,
        )
        .first()
    )
    if overlap:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room already has a booking in this period")


def create_booking(db: Session, payload: BookingCreate) -> Booking:
    room = get_room(db, payload.room_id)
    _ensure_room_is_bookable(db, room, payload)

    customer = _get_or_create_customer(db, payload.customer_name, payload.phone)
    booking = Booking(
        customer_id=customer.id,
        room_id=room.id,
        check_in_date=payload.check_in_date,
        check_out_date=payload.check_out_date,
        deposit_amount=payload.deposit_amount,
        note=payload.note,
        status=BookingStatus.BOOKED,
    )
    room.status = RoomStatus.BOOKED

    db.add(booking)
    db.commit()
    db.refresh(booking)
    return get_booking(db, booking.id)


def list_bookings(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    status_filter: BookingStatus | None = None,
) -> list[Booking]:
    query = db.query(Booking).options(joinedload(Booking.customer), joinedload(Booking.room))
    if status_filter:
        query = query.filter(Booking.status == status_filter)

    return query.order_by(Booking.check_in_date.asc(), Booking.id.desc()).offset(skip).limit(limit).all()


def list_upcoming_bookings(db: Session, limit: int = 10) -> list[Booking]:
    return (
        db.query(Booking)
        .options(joinedload(Booking.customer), joinedload(Booking.room))
        .filter(Booking.status == BookingStatus.BOOKED, Booking.check_in_date >= date.today())
        .order_by(Booking.check_in_date.asc())
        .limit(limit)
        .all()
    )


def get_booking(db: Session, booking_id: int) -> Booking:
    booking = (
        db.query(Booking)
        .options(joinedload(Booking.customer), joinedload(Booking.room))
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return booking


def update_booking(db: Session, booking_id: int, payload: BookingUpdate) -> Booking:
    booking = get_booking(db, booking_id)
    data = payload.model_dump(exclude_unset=True)

    for field, value in data.items():
        setattr(booking, field, value)

    db.commit()
    return get_booking(db, booking_id)


def check_in_booking(db: Session, booking_id: int) -> Booking:
    booking = get_booking(db, booking_id)
    booking.status = BookingStatus.CHECKED_IN
    booking.room.status = RoomStatus.OCCUPIED

    db.commit()
    return get_booking(db, booking_id)


def _calculate_total_amount(booking: Booking) -> Decimal:
    nights = max((booking.check_out_date - booking.check_in_date).days, 1)
    return Decimal(nights) * booking.room.price_per_night


def check_out_booking(db: Session, booking_id: int) -> Invoice:
    booking = get_booking(db, booking_id)
    total_amount = _calculate_total_amount(booking)

    booking.status = BookingStatus.CHECKED_OUT
    booking.room.status = RoomStatus.AVAILABLE

    invoice = booking.invoice
    if invoice:
        invoice.total_amount = total_amount
        invoice.paid_amount = total_amount
        invoice.status = InvoiceStatus.PAID
    else:
        invoice = Invoice(
            booking_id=booking.id,
            total_amount=total_amount,
            paid_amount=total_amount,
            status=InvoiceStatus.PAID,
        )
        db.add(invoice)

    db.commit()
    db.refresh(invoice)
    return invoice


def cancel_booking(db: Session, booking_id: int) -> Booking:
    booking = get_booking(db, booking_id)
    booking.status = BookingStatus.CANCELLED
    booking.room.status = RoomStatus.AVAILABLE

    db.commit()
    return get_booking(db, booking_id)


def list_invoices(db: Session, skip: int = 0, limit: int = 20) -> list[Invoice]:
    return db.query(Invoice).order_by(Invoice.issued_at.desc()).offset(skip).limit(limit).all()


def get_dashboard_summary(db: Session) -> dict[str, int | Decimal]:
    today = date.today()
    total_rooms = db.query(func.count(Room.id)).scalar() or 0
    available_rooms = db.query(func.count(Room.id)).filter(Room.status == RoomStatus.AVAILABLE).scalar() or 0
    occupied_rooms = db.query(func.count(Room.id)).filter(Room.status == RoomStatus.OCCUPIED).scalar() or 0
    today_revenue = (
        db.query(func.coalesce(func.sum(Invoice.paid_amount), 0))
        .filter(Invoice.status == InvoiceStatus.PAID, func.date(Invoice.issued_at) == today)
        .scalar()
        or Decimal("0")
    )

    return {
        "total_rooms": total_rooms,
        "available_rooms": available_rooms,
        "occupied_rooms": occupied_rooms,
        "today_revenue": today_revenue,
    }
