import Header from './Header';
import ThemeProvider from './ThemeProvider';

export default function Shell({children}) {
  return (
    <ThemeProvider theme="light">
      <div className="app-shell">
        <Header
          title="Acme Dashboard"
          user={{name: 'Jane Smith', role: 'Admin', avatar: '/img/avatar.png'}}
        />
        <div className="app-content">{children}</div>
      </div>
    </ThemeProvider>
  );
}
