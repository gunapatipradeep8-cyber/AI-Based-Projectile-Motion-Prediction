import math
from typing import Any, Dict, List

STANDARD_GRAVITY = 9.80665


def calculate_theoretical_trajectory(
    velocity: float,
    angle_deg: float,
    launch_height: float = 0.0,
    gravity: float = STANDARD_GRAVITY,
    mass: float = 1.0,
    points_count: int = 60,
) -> Dict[str, Any]:
    """
    Computes theoretical kinematics equations for projectile motion.
    Returns scalar metrics and trajectory coordinate series.
    """
    g = gravity if gravity > 0 else STANDARD_GRAVITY
    v0 = max(0.0, float(velocity))
    theta_deg = float(angle_deg)
    h0 = max(0.0, float(launch_height))
    m = max(0.001, float(mass))

    theta_rad = math.radians(theta_deg)
    v0x = v0 * math.cos(theta_rad)
    v0y = v0 * math.sin(theta_rad)

    # Time of flight using quadratic formula for y(t) = h0 + v0y*t - 0.5*g*t^2 = 0
    discriminant = v0y**2 + 2 * g * h0
    if discriminant < 0:
        flight_time = 0.0
    else:
        flight_time = (v0y + math.sqrt(discriminant)) / g

    # Time to maximum height
    time_to_peak = max(0.0, v0y / g)
    max_height = h0 + (v0y**2) / (2 * g) if v0y > 0 else h0

    # Theoretical horizontal range
    theoretical_range = v0x * flight_time

    # Generate discrete trajectory points for visualization
    trajectory_points: List[Dict[str, float]] = []
    if flight_time > 0 and points_count > 1:
        dt = flight_time / (points_count - 1)
        for i in range(points_count):
            t = min(flight_time, i * dt)
            x = v0x * t
            y = max(0.0, h0 + v0y * t - 0.5 * g * (t**2))
            vx = v0x
            vy = v0y - g * t
            speed = math.sqrt(vx**2 + vy**2)
            ke = 0.5 * m * (speed**2)
            pe = m * g * y
            trajectory_points.append({
                "time": round(t, 3),
                "x": round(x, 3),
                "y": round(y, 3),
                "vx": round(vx, 3),
                "vy": round(vy, 3),
                "speed": round(speed, 3),
                "kinetic_energy": round(ke, 3),
                "potential_energy": round(pe, 3),
            })
    else:
        trajectory_points.append({
            "time": 0.0,
            "x": 0.0,
            "y": round(h0, 3),
            "vx": round(v0x, 3),
            "vy": round(v0y, 3),
            "speed": round(v0, 3),
            "kinetic_energy": round(0.5 * m * (v0**2), 3),
            "potential_energy": round(m * g * h0, 3),
        })

    return {
        "theoretical_range": round(theoretical_range, 4),
        "max_height": round(max_height, 4),
        "flight_time": round(flight_time, 4),
        "time_to_peak": round(time_to_peak, 4),
        "initial_vx": round(v0x, 4),
        "initial_vy": round(v0y, 4),
        "launch_angle_deg": round(theta_deg, 2),
        "launch_height": round(h0, 2),
        "gravity": round(g, 4),
        "mass": round(m, 4),
        "trajectory": trajectory_points,
    }


def compute_derived_features(
    mass: float,
    velocity: float,
    height: float,
    gravity: float = STANDARD_GRAVITY,
) -> Dict[str, float]:
    """
    Computes standard physical and energy features from fundamental mechanics.
    Helps users populate the 9 model input features consistently.
    """
    m = float(mass)
    v = float(velocity)
    h = float(height)
    g = float(gravity)

    ke = 0.5 * m * (v**2)
    pe = m * g * h
    total_energy = ke + pe
    force = m * g  # Weight force in standard projectile setting
    work_done = ke  # Kinetic energy gained by work done during launch acceleration

    return {
        "mass": round(m, 4),
        "velocity": round(v, 4),
        "height": round(h, 4),
        "gravity": round(g, 4),
        "force": round(force, 4),
        "kinetic_energy": round(ke, 4),
        "potential_energy": round(pe, 4),
        "total_energy": round(total_energy, 4),
        "work_done": round(work_done, 4),
    }
