from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.models.enums import RoomStatus
from src.schemas.room import RoomCreate, RoomList, RoomRead, RoomUpdate
from src.services.hotel_service import create_room, delete_room, get_room, list_rooms, update_room


router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("", response_model=RoomList)
def read_rooms(
    skip: int = 0,
    limit: int = 20,
    status_filter: RoomStatus | None = None,
    db: Session = Depends(get_db),
):
    rooms, total = list_rooms(db, skip=skip, limit=limit, status_filter=status_filter)
    return {"items": rooms, "total": total, "skip": skip, "limit": limit}


@router.post("", response_model=RoomRead, status_code=status.HTTP_201_CREATED)
def create_new_room(payload: RoomCreate, db: Session = Depends(get_db)):
    return create_room(db, payload)


@router.get("/{room_id}", response_model=RoomRead)
def read_room(room_id: int, db: Session = Depends(get_db)):
    return get_room(db, room_id)


@router.patch("/{room_id}", response_model=RoomRead)
def edit_room(room_id: int, payload: RoomUpdate, db: Session = Depends(get_db)):
    return update_room(db, room_id, payload)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_room(room_id: int, db: Session = Depends(get_db)):
    delete_room(db, room_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
