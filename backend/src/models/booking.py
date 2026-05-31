from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import DECIMAL, Date, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base
from src.models.enums import BookingStatus


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)
    check_in_date: Mapped[date] = mapped_column(Date, nullable=False)
    check_out_date: Mapped[date] = mapped_column(Date, nullable=False)
    deposit_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0, nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, values_callable=lambda items: [item.value for item in items], native_enum=False),
        default=BookingStatus.BOOKED,
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    customer = relationship("Customer", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
    invoice = relationship("Invoice", back_populates="booking", uselist=False)
