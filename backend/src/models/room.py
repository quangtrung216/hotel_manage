from decimal import Decimal

from sqlalchemy import DECIMAL, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base
from src.models.enums import RoomStatus


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    room_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    room_type: Mapped[str] = mapped_column(String(50), nullable=False)
    price_per_night: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    status: Mapped[RoomStatus] = mapped_column(
        Enum(RoomStatus, values_callable=lambda items: [item.value for item in items], native_enum=False),
        default=RoomStatus.AVAILABLE,
        nullable=False,
    )
    floor: Mapped[int | None] = mapped_column(nullable=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)

    bookings = relationship("Booking", back_populates="room")
