from enum import Enum


class RoomStatus(str, Enum):
    AVAILABLE = "available"
    BOOKED = "booked"
    OCCUPIED = "occupied"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"


class BookingStatus(str, Enum):
    BOOKED = "booked"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"


class InvoiceStatus(str, Enum):
    UNPAID = "unpaid"
    PAID = "paid"
    CANCELLED = "cancelled"
