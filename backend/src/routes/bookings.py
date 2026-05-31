from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.models.enums import BookingStatus
from src.schemas.booking import BookingCreate, BookingRead, BookingUpdate
from src.schemas.invoice import InvoiceRead
from src.services.hotel_service import (
    cancel_booking,
    check_in_booking,
    check_out_booking,
    create_booking,
    get_booking,
    list_bookings,
    list_upcoming_bookings,
    update_booking,
)


router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("", response_model=list[BookingRead])
def read_bookings(
    skip: int = 0,
    limit: int = 20,
    status_filter: BookingStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    return list_bookings(db, skip=skip, limit=limit, status_filter=status_filter)


@router.get("/upcoming", response_model=list[BookingRead])
def read_upcoming_bookings(limit: int = 10, db: Session = Depends(get_db)):
    return list_upcoming_bookings(db, limit=limit)


@router.post("", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
def create_new_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    return create_booking(db, payload)


@router.get("/{booking_id}", response_model=BookingRead)
def read_booking(booking_id: int, db: Session = Depends(get_db)):
    return get_booking(db, booking_id)


@router.patch("/{booking_id}", response_model=BookingRead)
def edit_booking(booking_id: int, payload: BookingUpdate, db: Session = Depends(get_db)):
    return update_booking(db, booking_id, payload)


@router.post("/{booking_id}/check-in", response_model=BookingRead)
def check_in(booking_id: int, db: Session = Depends(get_db)):
    return check_in_booking(db, booking_id)


@router.post("/{booking_id}/check-out", response_model=InvoiceRead)
def check_out(booking_id: int, db: Session = Depends(get_db)):
    return check_out_booking(db, booking_id)


@router.post("/{booking_id}/cancel", response_model=BookingRead)
def cancel(booking_id: int, db: Session = Depends(get_db)):
    return cancel_booking(db, booking_id)
