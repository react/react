'use client';

export default function StatCard({title, value, change, trend, sparkline}) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        <span className={'stat-card-change trend-' + trend}>{change}</span>
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-sparkline">
        {sparkline.map((point, i) => (
          <span
            key={i}
            className="sparkline-bar"
            style={{
              height: Math.round((point / Math.max(...sparkline)) * 100) + '%',
            }}
          />
        ))}
      </div>
    </div>
  );
}
