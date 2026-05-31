from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.settings import get_settings
from src.database.base import Base
from src.database.seeders.seed import seed_initial_data
from src.database.session import SessionLocal, engine
from src.models import Booking, Customer, Invoice, Room
from src.routes import bookings, customers, dashboard, health, invoices, rooms


settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix=settings.api_prefix)
    app.include_router(dashboard.router, prefix=settings.api_prefix)
    app.include_router(rooms.router, prefix=settings.api_prefix)
    app.include_router(customers.router, prefix=settings.api_prefix)
    app.include_router(bookings.router, prefix=settings.api_prefix)
    app.include_router(invoices.router, prefix=settings.api_prefix)

    @app.on_event("startup")
    def on_startup() -> None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_initial_data(db)
        finally:
            db.close()

    return app


app = create_app()

# Keep imported models referenced so metadata registration is explicit for readers.
_registered_models = (Booking, Customer, Invoice, Room)
