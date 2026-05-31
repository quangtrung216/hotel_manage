from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.schemas.invoice import InvoiceRead
from src.services.hotel_service import list_invoices


router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceRead])
def read_invoices(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return list_invoices(db, skip=skip, limit=limit)
