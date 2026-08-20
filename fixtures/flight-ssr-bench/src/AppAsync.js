import Shell from './components/Shell';
import Sidebar from './components/Sidebar';
import DashboardAsync from './components/DashboardAsync';
import Footer from './components/Footer';

export default function AppAsync({itemCount}) {
  return (
    <html>
      <body>
        <Shell>
          <Sidebar itemCount={itemCount} />
          <DashboardAsync itemCount={itemCount} />
          <Footer />
        </Shell>
      </body>
    </html>
  );
}
