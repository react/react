import StatCard from './StatCard';

export default function StatsGrid({stats}) {
  return (
    <div className="stats-grid">
      {stats.cards.map(card => (
        <StatCard
          key={card.title}
          title={card.title}
          value={card.value}
          change={card.change}
          trend={card.trend}
          sparkline={card.sparkline}
        />
      ))}
    </div>
  );
}
