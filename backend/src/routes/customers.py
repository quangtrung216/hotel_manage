from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate
from src.services.hotel_service import create_customer, get_customer, list_customers, update_customer


router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerRead])
def read_customers(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return list_customers(db, skip=skip, limit=limit)


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_new_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    return create_customer(db, payload)


@router.get("/{customer_id}", response_model=CustomerRead)
def read_customer(customer_id: int, db: Session = Depends(get_db)):
    return get_customer(db, customer_id)


@router.patch("/{customer_id}", response_model=CustomerRead)
def edit_customer(customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db)):
    return update_customer(db, customer_id, payload)
