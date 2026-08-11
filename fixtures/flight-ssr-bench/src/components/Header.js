'use client';

import Avatar from './Avatar';
import SearchBar from './SearchBar';
import NotificationBell from './NotificationBell';

export default function Header({title, user}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
      </div>
      <div className="header-center">
        <SearchBar placeholder="Search products, orders, customers..." />
      </div>
      <div className="header-right">
        <NotificationBell count={3} />
        <Avatar name={user.name} role={user.role} src={user.avatar} />
      </div>
    </header>
  );
}
