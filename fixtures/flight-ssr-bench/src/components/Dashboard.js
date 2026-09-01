import StatsGrid from './StatsGrid';
import ProductTable from './ProductTable';
import ActivityFeed from './ActivityFeed';
import ChartPanel from './ChartPanel';
import {generateProducts, generateActivities, generateStats} from './data';

export default function Dashboard({itemCount}) {
  const products = generateProducts(itemCount);
  const activities = generateActivities(Math.min(itemCount, 50));
  const stats = generateStats();

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p className="dashboard-subtitle">
          Welcome back. Here is what is happening with your store today.
        </p>
      </div>
      <StatsGrid stats={stats} />
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <ProductTable products={products} />
        </div>
        <div className="dashboard-aside">
          <ChartPanel title="Revenue" data={stats.revenueByMonth} type="bar" />
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </main>
  );
}
