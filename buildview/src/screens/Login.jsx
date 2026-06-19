import React, {useState} from 'react';
import {db} from '../data/db.js';
import {useDbVersion} from '../lib/useDb.js';
import {createUser} from '../domain/entities.js';
import {
  ROLES,
  ROLE_LIST,
  TRADES,
  WORKER_TRADES,
} from '../domain/constants.js';

// Screen 1: Login / pick user (prototype only, no passwords).
// Pick an existing user, or create one (name, role, trade).
export default function Login({onLogin}) {
  useDbVersion();
  const users = db.users.list();

  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES.FOREMAN);
  const [trade, setTrade] = useState(TRADES.NONE);

  // Foremen are trade "none"; workers pick a real trade.
  const isForeman = role === ROLES.FOREMAN;

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const finalTrade = isForeman ? TRADES.NONE : trade;
    const user = createUser({name: name.trim(), role, trade: finalTrade});
    setName('');
    onLogin(user.id);
  }

  return (
    <div>
      <h1>BuildView — Login</h1>

      <h2>Pick an existing user</h2>
      {users.length === 0 ? (
        <p>No users yet. Create one below.</p>
      ) : (
        <ul>
          {users.map(u => (
            <li key={u.id}>
              {u.name} — {u.role}
              {u.role === ROLES.WORKER ? ` (${u.trade})` : ''}{' '}
              <button onClick={() => onLogin(u.id)}>Log in</button>
            </li>
          ))}
        </ul>
      )}

      <h2>Or create a user</h2>
      <form onSubmit={handleCreate}>
        <div>
          <label>
            Name:{' '}
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
            />
          </label>
        </div>
        <div>
          <label>
            Role:{' '}
            <select
              value={role}
              onChange={e => {
                const r = e.target.value;
                setRole(r);
                setTrade(
                  r === ROLES.FOREMAN ? TRADES.NONE : WORKER_TRADES[0]
                );
              }}>
              {ROLE_LIST.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!isForeman && (
          <div>
            <label>
              Trade:{' '}
              <select value={trade} onChange={e => setTrade(e.target.value)}>
                {WORKER_TRADES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <button type="submit">Create &amp; log in</button>
      </form>
    </div>
  );
}
