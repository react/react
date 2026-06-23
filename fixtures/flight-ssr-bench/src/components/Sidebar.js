import NavLink from './NavLink';
import SidebarSection from './SidebarSection';
import Badge from './Badge';

const navItems = [
  {href: '/', label: 'Dashboard', icon: 'home'},
  {href: '/products', label: 'Products', icon: 'box', count: 142},
  {href: '/orders', label: 'Orders', icon: 'cart', count: 38},
  {href: '/customers', label: 'Customers', icon: 'users'},
  {href: '/analytics', label: 'Analytics', icon: 'chart'},
  {href: '/settings', label: 'Settings', icon: 'gear'},
];

const recentItems = [
  {id: 1, label: 'Order #1234', status: 'pending'},
  {id: 2, label: 'Order #1235', status: 'shipped'},
  {id: 3, label: 'Order #1236', status: 'delivered'},
  {id: 4, label: 'Return #891', status: 'processing'},
];

export default function Sidebar({itemCount}) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <SidebarSection title="Navigation">
          {navItems.map(item => (
            <NavLink key={item.href} href={item.href} icon={item.icon}>
              {item.label}
              {item.count != null && <Badge count={item.count} />}
            </NavLink>
          ))}
        </SidebarSection>
        <SidebarSection title="Recent Activity">
          {recentItems.map(item => (
            <div key={item.id} className="recent-item">
              <span className="recent-label">{item.label}</span>
              <Badge count={item.status} variant="status" />
            </div>
          ))}
        </SidebarSection>
        <SidebarSection title="Quick Stats">
          <div className="stat">
            <span className="stat-label">Total Items</span>
            <span className="stat-value">{itemCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Active Users</span>
            <span className="stat-value">1,247</span>
          </div>
          <div className="stat">
            <span className="stat-label">Revenue</span>
            <span className="stat-value">$84,320</span>
          </div>
        </SidebarSection>
      </nav>
    </aside>
  );
}
