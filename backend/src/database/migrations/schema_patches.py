from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def run_schema_patches(engine: Engine) -> None:
    """Small startup patches for local development before adding Alembic."""
    inspector = inspect(engine)
    statements: list[str] = []

    if inspector.has_table("rooms"):
        room_columns = {column["name"] for column in inspector.get_columns("rooms")}

        if "floor" not in room_columns:
            statements.append("ALTER TABLE rooms ADD COLUMN floor INT NULL")

        if "note" not in room_columns:
            statements.append("ALTER TABLE rooms ADD COLUMN note VARCHAR(255) NULL")

    if inspector.has_table("bookings"):
        booking_columns = {column["name"] for column in inspector.get_columns("bookings")}

        if "check_in_date" not in booking_columns:
            statements.extend(
                [
                    "ALTER TABLE bookings ADD COLUMN check_in_date DATE NULL",
                    "UPDATE bookings SET check_in_date = checkin_date WHERE checkin_date IS NOT NULL",
                    "ALTER TABLE bookings MODIFY COLUMN check_in_date DATE NOT NULL",
                ]
            )

        if "check_out_date" not in booking_columns:
            statements.extend(
                [
                    "ALTER TABLE bookings ADD COLUMN check_out_date DATE NULL",
                    "UPDATE bookings SET check_out_date = checkout_date WHERE checkout_date IS NOT NULL",
                    "ALTER TABLE bookings MODIFY COLUMN check_out_date DATE NOT NULL",
                ]
            )

        statements.extend(
            [
                "ALTER TABLE bookings MODIFY COLUMN status ENUM('pending','confirmed','booked','checked_in','checked_out','cancelled') NOT NULL DEFAULT 'booked'",
                "UPDATE bookings SET status = 'booked' WHERE status IN ('pending', 'confirmed')",
                "ALTER TABLE bookings MODIFY COLUMN status ENUM('booked','checked_in','checked_out','cancelled') NOT NULL DEFAULT 'booked'",
            ]
        )

    if inspector.has_table("invoices"):
        invoice_columns = {column["name"] for column in inspector.get_columns("invoices")}

        if "paid_amount" not in invoice_columns:
            statements.extend(
                [
                    "ALTER TABLE invoices ADD COLUMN paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0",
                    "UPDATE invoices SET paid_amount = total_amount WHERE payment_status = 'paid'",
                ]
            )

        if "status" not in invoice_columns:
            statements.extend(
                [
                    "ALTER TABLE invoices ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'unpaid'",
                    "UPDATE invoices SET status = payment_status WHERE payment_status IS NOT NULL",
                ]
            )

        if "issued_at" not in invoice_columns:
            statements.extend(
                [
                    "ALTER TABLE invoices ADD COLUMN issued_at DATETIME NULL",
                    "UPDATE invoices SET issued_at = COALESCE(paid_at, created_at, NOW())",
                    "ALTER TABLE invoices MODIFY COLUMN issued_at DATETIME NOT NULL",
                ]
            )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
