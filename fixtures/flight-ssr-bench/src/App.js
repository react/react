import Shell from './components/Shell';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';

export default function App({itemCount}) {
  return (
    <html>
      <body>
        <Shell>
          <Sidebar itemCount={itemCount} />
          <Dashboard itemCount={itemCount} />
          <Footer />
        </Shell>
      </body>
    </html>
  );
}
