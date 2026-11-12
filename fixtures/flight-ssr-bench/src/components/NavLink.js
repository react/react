'use client';

export default function NavLink({href, icon, children}) {
  return (
    <a className="nav-link" href={href}>
      <span className="nav-icon" data-icon={icon} />
      <span className="nav-label">{children}</span>
    </a>
  );
}
