import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_FILE = Path(__file__).resolve().parent / "projectile_simulations.db"


def get_db_connection():
    """Provides a SQLite database connection with row factory configured and safe timeout."""
    conn = sqlite3.connect(DB_FILE, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for high-concurrency non-blocking reads/writes
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
    except Exception:
        pass
    return conn


def init_db():
    """Initializes SQLite database tables for simulation logs."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS simulations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                mass REAL NOT NULL,
                velocity REAL NOT NULL,
                height REAL NOT NULL,
                gravity REAL NOT NULL,
                force REAL NOT NULL,
                kinetic_energy REAL NOT NULL,
                potential_energy REAL NOT NULL,
                total_energy REAL NOT NULL,
                work_done REAL NOT NULL,
                launch_angle REAL,
                predicted_distance REAL NOT NULL,
                theoretical_range REAL,
                max_height REAL,
                flight_time REAL,
                model_name TEXT NOT NULL
            )
        """)
        conn.commit()


def save_simulation(data: Dict[str, Any]) -> int:
    """Inserts a new simulation record into the database."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO simulations (
                timestamp, mass, velocity, height, gravity, force,
                kinetic_energy, potential_energy, total_energy, work_done,
                launch_angle, predicted_distance, theoretical_range, max_height,
                flight_time, model_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            now_iso,
            float(data.get("mass", 0.0)),
            float(data.get("velocity", 0.0)),
            float(data.get("height", 0.0)),
            float(data.get("gravity", 9.8)),
            float(data.get("force", 0.0)),
            float(data.get("kinetic_energy", 0.0)),
            float(data.get("potential_energy", 0.0)),
            float(data.get("total_energy", 0.0)),
            float(data.get("work_done", 0.0)),
            float(data["launch_angle"]) if data.get("launch_angle") is not None else None,
            float(data.get("predicted_distance", 0.0)),
            float(data["theoretical_range"]) if data.get("theoretical_range") is not None else None,
            float(data["max_height"]) if data.get("max_height") is not None else None,
            float(data["flight_time"]) if data.get("flight_time") is not None else None,
            str(data.get("model_name", "RandomForestRegressor")),
        ))
        conn.commit()
        return cursor.lastrowid


def get_all_simulations(limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieves simulation history ordered by newest first."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM simulations ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def delete_simulation(record_id: int) -> bool:
    """Deletes a single simulation record by id."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM simulations WHERE id = ?", (record_id,))
        conn.commit()
        return cursor.rowcount > 0


def clear_simulations() -> int:
    """Clears all simulation records."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM simulations")
        conn.commit()
        return cursor.rowcount
