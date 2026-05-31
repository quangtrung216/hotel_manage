from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def run_schema_patches(engine: Engine) -> None:
    """Small startup patches for local development before adding Alembic."""
    inspector = inspect(engine)

    if not inspector.has_table("rooms"):
        return

    room_columns = {column["name"] for column in inspector.get_columns("rooms")}
    statements: list[str] = []

    if "floor" not in room_columns:
        statements.append("ALTER TABLE rooms ADD COLUMN floor INT NULL")

    if "note" not in room_columns:
        statements.append("ALTER TABLE rooms ADD COLUMN note VARCHAR(255) NULL")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
