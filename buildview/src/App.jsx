import React, {useState} from 'react';
import {useSession} from './lib/session.js';
import {ROLES} from './domain/constants.js';
import {Button, Card, Avatar} from './components/ui.jsx';
import Login from './screens/Login.jsx';
import ForemanProjectList from './screens/ForemanProjectList.jsx';
import ForemanProjectView from './screens/ForemanProjectView.jsx';
import ForemanRoomView from './screens/ForemanRoomView.jsx';
import ForemanPendingRequests from './screens/ForemanPendingRequests.jsx';
import ForemanDashboard from './screens/ForemanDashboard.jsx';
import WorkerHome from './screens/WorkerHome.jsx';
import TaskDetail from './screens/TaskDetail.jsx';

// -----------------------------------------------------------------------------
// App shell + dumb stack navigation (a back button + plain screen switching,
// per the spec). No router library. `nav` is passed to every screen.
//
// Screens get added in steps 4–8. For step 3 the "home" screen is a minimal
// placeholder that proves login/logout and role routing work.
// -----------------------------------------------------------------------------
export default function App() {
  const {user, login, logout} = useSession();
  const [stack, setStack] = useState([{screen: 'home', params: {}}]);

  if (!user) {
    return <Login onLogin={login} />;
  }

  const current = stack[stack.length - 1];
  const nav = {
    user,
    go: (screen, params = {}) => setStack(s => [...s, {screen, params}]),
    back: () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)),
    reset: (screen = 'home', params = {}) => setStack([{screen, params}]),
    logout: () => {
      setStack([{screen: 'home', params: {}}]);
      logout();
    },
  };

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="sticky top-0 z-10 border-b-4 border-brand bg-steel text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            {stack.length > 1 && (
              <Button
                variant="ghost"
                className="text-white hover:bg-steel-light"
                onClick={nav.back}>
                ← Back
              </Button>
            )}
            <span className="text-lg font-black tracking-tight">
              BUILD<span className="text-brand">VIEW</span>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right text-sm leading-tight sm:block">
              <span className="font-semibold">{user.name}</span>
              <br />
              <span className="text-zinc-300">
                {user.role}
                {user.role === ROLES.WORKER ? ` · ${user.trade}` : ''}
              </span>
            </span>
            <Avatar name={user.name} />
            <Button
              variant="ghost"
              className="text-white hover:bg-steel-light"
              onClick={nav.logout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">
        <Screen current={current} nav={nav} />
      </main>
      <footer className="mx-auto max-w-3xl px-4 py-6 text-center text-xs text-zinc-400">
        BuildView · construction site tracker
      </footer>
    </div>
  );
}

function Screen({current, nav}) {
  const {user} = nav;
  const {screen, params} = current;

  // Home depends on role.
  if (screen === 'home') {
    if (user.role === ROLES.FOREMAN) {
      return <ForemanProjectList nav={nav} />;
    }
    return <WorkerHome nav={nav} />;
  }

  // Foreman screens
  if (screen === 'project') return <ForemanProjectView nav={nav} params={params} />;
  if (screen === 'room') return <ForemanRoomView nav={nav} params={params} />;
  if (screen === 'requests')
    return <ForemanPendingRequests nav={nav} params={params} />;
  if (screen === 'dashboard')
    return <ForemanDashboard nav={nav} params={params} />;

  // Shared
  if (screen === 'task') return <TaskDetail nav={nav} params={params} />;

  return (
    <Card className="p-6 text-center">
      <p className="text-zinc-600">Unknown screen: {screen}</p>
      <div className="mt-3">
        <Button variant="secondary" onClick={() => nav.reset()}>
          Back to home
        </Button>
      </div>
    </Card>
  );
}
