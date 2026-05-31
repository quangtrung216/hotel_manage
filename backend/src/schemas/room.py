from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import RoomStatus


class RoomBase(BaseModel):
    room_number: str = Field(..., min_length=1, max_length=20)
    room_type: str = Field(..., min_length=1, max_length=50)
    price_per_night: Decimal = Field(..., ge=0)
    status: RoomStatus = RoomStatus.AVAILABLE
    floor: int | None = None
    note: str | None = None


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    room_number: str | None = Field(default=None, min_length=1, max_length=20)
    room_type: str | None = Field(default=None, min_length=1, max_length=50)
    price_per_night: Decimal | None = Field(default=None, ge=0)
    status: RoomStatus | None = None
    floor: int | None = None
    note: str | None = None


class RoomRead(RoomBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class RoomList(BaseModel):
    items: list[RoomRead]
    total: int
    skip: int
    limit: int
