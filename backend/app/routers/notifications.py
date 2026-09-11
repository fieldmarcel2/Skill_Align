"""
Notification Management Router
==============================

Endpoints:
- POST /api/notifications      (HR & Admin: Trigger email / candidate notification)
- GET  /api/notifications/my   (Candidate/User: Fetch personal notifications)
- GET  /api/notifications      (HR & Admin: List all sent notifications)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user, require_admin_or_hr
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.post(
    "",
    response_model=NotificationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create and dispatch notification (HR Only)",
    description="HR dispatches email notifications to candidates regarding interview schedules, status updates, or rejections."
)
def create_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db),
    hr_user: User = Depends(require_admin_or_hr)
):
    target_user = db.query(User).filter(User.id == data.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target user with id {data.user_id} not found."
        )

    notification = Notification(
        user_id=data.user_id,
        channel=data.channel or "email",
        subject=data.subject,
        body=data.body,
        status=data.status or "sent",
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.get(
    "/my",
    response_model=List[NotificationOut],
    status_code=status.HTTP_200_OK,
    summary="Get current user's notifications"
)
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return notifications


@router.get(
    "",
    response_model=List[NotificationOut],
    status_code=status.HTTP_200_OK,
    summary="List all notifications (HR & Admin)"
)
def list_notifications(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_hr)
):
    query = db.query(Notification)
    if user_id:
        query = query.filter(Notification.user_id == user_id)
    return query.order_by(Notification.created_at.desc()).all()


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationOut,
    status_code=status.HTTP_200_OK,
    summary="Mark notification as read"
)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post(
    "/mark-all-read",
    status_code=status.HTTP_200_OK,
    summary="Mark all current user notifications as read"
)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_200_OK,
    summary="Dismiss or delete notification"
)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )
    db.delete(notif)
    db.commit()
    return {"message": "Notification dismissed."}
