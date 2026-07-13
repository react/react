'use client';

export default function ChartPanel({title, data, type}) {
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div className="chart-panel">
      <h3 className="chart-title">{title}</h3>
      <div className={'chart chart-' + type}>
        {data.map(point => (
          <div key={point.month} className="chart-bar-group">
            <div
              className="chart-bar"
              style={{height: Math.round((point.value / maxVal) * 100) + '%'}}
            />
            <span className="chart-label">{point.month}</span>
            <span className="chart-value">
              ${(point.value / 1000).toFixed(0)}k
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
