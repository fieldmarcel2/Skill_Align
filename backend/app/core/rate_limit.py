"""
Rate limiting configuration for security-sensitive endpoints.

Uses slowapi (built on top of limits) to enforce per-IP and
per-key rate limits on OTP endpoints.

Usage in routers:
    from app.core.rate_limit import limiter

    @router.post("/send-otp")
    @limiter.limit("5/minute")
    def send_otp(request: Request, ...):
        ...
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter keyed by client IP address
limiter = Limiter(key_func=get_remote_address)
