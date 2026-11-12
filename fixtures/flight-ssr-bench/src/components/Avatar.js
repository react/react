'use client';

export default function Avatar({name, role, src}) {
  return (
    <div className="avatar-container">
      <img className="avatar-img" src={src} alt={name} width={32} height={32} />
      <div className="avatar-info">
        <span className="avatar-name">{name}</span>
        <span className="avatar-role">{role}</span>
      </div>
    </div>
  );
}
