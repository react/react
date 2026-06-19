import React, {useState} from 'react';
import {useSession} from './lib/session.js';
import {ROLES} from './domain/constants.js';
import Login from './screens/Login.jsx';
import ForemanProjectList from './screens/ForemanProjectList.jsx';
import ForemanProjectView from './screens/ForemanProjectView.jsx';
import ForemanRoomView from './screens/ForemanRoomView.jsx';
import ForemanPendingRequests from './screens/ForemanPendingRequests.jsx';
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
    <div>
      <div>
        <span>
          Logged in as <strong>{user.name}</strong> ({user.role}
          {user.role === ROLES.WORKER ? `, ${user.trade}` : ''}){' '}
        </span>
        {stack.length > 1 && <button onClick={nav.back}>Back</button>}{' '}
        <button onClick={nav.logout}>Log out</button>
      </div>
      <hr />
      <Screen current={current} nav={nav} />
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

  // Shared
  if (screen === 'task') return <TaskDetail nav={nav} params={params} />;

  return <p>Unknown screen: {screen}</p>;
}
