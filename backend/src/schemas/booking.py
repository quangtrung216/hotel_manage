from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.models.enums import BookingStatus
from src.schemas.customer import CustomerRead
from src.schemas.room import RoomRead


class BookingCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=120)
    phone: str = Field(..., min_length=1, max_length=30)
    room_id: int
    check_in_date: date
    check_out_date: date
    deposit_amount: Decimal = Field(default=0, ge=0)
    note: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "BookingCreate":
        if self.check_out_date <= self.check_in_date:
            raise ValueError("check_out_date must be after check_in_date")
        return self


class BookingUpdate(BaseModel):
    check_in_date: date | None = None
    check_out_date: date | None = None
    deposit_amount: Decimal | None = Field(default=None, ge=0)
    status: BookingStatus | None = None
    note: str | None = None


class BookingRead(BaseModel):
    id: int
    customer_id: int
    room_id: int
    check_in_date: date
    check_out_date: date
    deposit_amount: Decimal
    status: BookingStatus
    note: str | None
    created_at: datetime
    customer: CustomerRead
    room: RoomRead

    model_config = ConfigDict(from_attributes=True)
