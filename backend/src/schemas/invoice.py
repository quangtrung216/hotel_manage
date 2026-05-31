from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from src.models.enums import InvoiceStatus


class InvoiceRead(BaseModel):
    id: int
    booking_id: int
    total_amount: Decimal
    paid_amount: Decimal
    status: InvoiceStatus
    issued_at: datetime

    model_config = ConfigDict(from_attributes=True)
