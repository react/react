'use client';

export default function FooterLink({href, children}) {
  return (
    <a className="footer-link" href={href}>
      {children}
    </a>
  );
}
