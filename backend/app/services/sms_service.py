"""
SMS Service — Provider abstraction for sending OTP messages.

Supports:
- Twilio (production)
- Console (development — prints OTP to stdout)

The active provider is selected based on settings.OTP_DEV_MODE and
settings.SMS_PROVIDER. In dev mode, OTPs are logged to the console
regardless of the SMS_PROVIDER setting.
"""

import logging
from abc import ABC, abstractmethod

from app.core.config import settings

logger = logging.getLogger(__name__)


class SMSService(ABC):
    """Abstract base class for SMS providers."""

    @abstractmethod
    def send_otp(self, phone: str, otp: str) -> bool:
        """
        Send an OTP to the given phone number.

        Returns True if the message was accepted by the provider.
        Raises on unrecoverable errors.
        """
        ...


class ConsoleSMSService(SMSService):
    """
    Development-only SMS service that prints OTPs to the console.

    NEVER use this in production.
    """

    def send_otp(self, phone: str, otp: str) -> bool:
        msg = f"[DEV OTP] Phone: {phone} | OTP: {otp}"
        print(msg)
        logger.info(msg)
        return True


class TwilioSMSService(SMSService):
    """Production SMS service using Twilio."""

    def __init__(self) -> None:
        from twilio.rest import Client

        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            raise RuntimeError(
                "Twilio credentials not configured. "
                "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER."
            )
        self._client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        self._from_number = settings.TWILIO_FROM_NUMBER

    def send_otp(self, phone: str, otp: str) -> bool:
        message = self._client.messages.create(
            body=f"Your SkillAlign verification code is: {otp}. Valid for {settings.OTP_EXPIRY_SECONDS // 60} minutes.",
            from_=self._from_number,
            to=phone,
        )
        logger.info("Twilio message SID: %s to %s", message.sid, phone)
        return True


# ── Factory ──────────────────────────────────────────────────────────────────

def get_sms_service() -> SMSService:
    """
    Return the appropriate SMS service based on configuration.

    In dev mode, always returns ConsoleSMSService.
    """
    if settings.OTP_DEV_MODE:
        return ConsoleSMSService()

    provider = settings.SMS_PROVIDER.lower()
    if provider == "twilio":
        return TwilioSMSService()
    else:
        raise ValueError(f"Unsupported SMS provider: {settings.SMS_PROVIDER}")
