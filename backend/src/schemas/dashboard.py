from decimal import Decimal

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_rooms: int
    available_rooms: int
    occupied_rooms: int
    today_revenue: Decimal
