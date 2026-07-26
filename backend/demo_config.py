"""Shared demo configuration — single reference date for all backend modules."""
from datetime import date

# The presentation is April 1, 2026.
# All "today" calculations use this so the 30-day window is Mar 2–Mar 31.
DEMO_DATE = date(2026, 4, 1)


def today():
    """Return the demo reference date."""
    return DEMO_DATE
