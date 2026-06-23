'use client';

export default function ActivityItem({
  type,
  user,
  message,
  timestamp,
  details,
}) {
  return (
    <li className={'activity-item activity-' + type}>
      <div className="activity-icon" data-type={type} />
      <div className="activity-content">
        <p className="activity-message">{message}</p>
        <div className="activity-meta">
          <span className="activity-user">{user}</span>
          <span className="activity-time">{timestamp}</span>
          {details && (
            <span className="activity-details">
              {details.amount} &middot; {details.items} items
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
