from pydantic import BaseModel, ConfigDict, Field


class CustomerBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)
    phone: str = Field(..., min_length=1, max_length=30)
    email: str | None = None
    address: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, min_length=1, max_length=30)
    email: str | None = None
    address: str | None = None


class CustomerRead(CustomerBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
