import React, {useState} from 'react';
import {useSession} from './lib/session.js';
import {ROLES} from './domain/constants.js';
import Login from './screens/Login.jsx';

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

  // Step 3 placeholder home. Replaced by real screens in steps 4–8.
  if (current.screen === 'home') {
    return (
      <div>
        <h1>Home</h1>
        <p>
          You are logged in as a <strong>{user.role}</strong>. Role-specific
          screens are built in the next steps.
        </p>
      </div>
    );
  }

  return <p>Unknown screen: {current.screen}</p>;
}
