'use client';

export default function SidebarSection({title, children}) {
  return (
    <div className="sidebar-section">
      <h3 className="sidebar-section-title">{title}</h3>
      <div className="sidebar-section-content">{children}</div>
    </div>
  );
}
