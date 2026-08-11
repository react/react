import ActivityItem from './ActivityItem';

export default function ActivityFeed({activities}) {
  return (
    <div className="activity-feed">
      <h3>Recent Activity</h3>
      <ul className="activity-list">
        {activities.map(activity => (
          <ActivityItem
            key={activity.id}
            type={activity.type}
            user={activity.user}
            message={activity.message}
            timestamp={activity.timestamp}
            details={activity.details}
          />
        ))}
      </ul>
    </div>
  );
}
