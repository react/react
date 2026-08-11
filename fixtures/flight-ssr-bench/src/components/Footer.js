import FooterLink from './FooterLink';

const footerSections = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'Changelog', 'Docs', 'API Reference'],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Careers', 'Press', 'Partners'],
  },
  {
    title: 'Support',
    links: ['Help Center', 'Contact', 'Status', 'Community', 'Security'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms', 'Cookie Policy', 'Licenses', 'GDPR'],
  },
];

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-grid">
        {footerSections.map(section => (
          <div key={section.title} className="footer-section">
            <h4>{section.title}</h4>
            <ul>
              {section.links.map(link => (
                <li key={link}>
                  <FooterLink
                    href={'/' + link.toLowerCase().replace(/\s+/g, '-')}>
                    {link}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 Acme Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}
