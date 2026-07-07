'use client';

export default function NotificationBell({count}) {
  return (
    <button className="notification-bell" aria-label="Notifications">
      <span className="bell-icon">&#128276;</span>
      {count > 0 && <span className="notification-badge">{count}</span>}
    </button>
  );
}
