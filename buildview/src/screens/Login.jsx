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
import {
  Button,
  Card,
  SectionTitle,
  Field,
  TextInput,
  Select,
} from '../components/ui.jsx';

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
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b-4 border-brand bg-steel py-6 text-center text-white">
        <span className="text-3xl font-black tracking-tight">
          BUILD<span className="text-brand">VIEW</span>
        </span>
        <p className="mt-1 text-sm text-zinc-300">Construction site tracker</p>
      </header>

      <main className="mx-auto max-w-md space-y-5 px-4 py-6">
        <section>
          <SectionTitle>Pick a user</SectionTitle>
          <Card className="p-4">
            {users.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No users yet. Create one below.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-200">
                {users.map(u => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm">
                      <span className="font-semibold text-zinc-800">
                        {u.name}
                      </span>{' '}
                      <span className="text-zinc-500">
                        · {u.role}
                        {u.role === ROLES.WORKER ? ` · ${u.trade}` : ''}
                      </span>
                    </span>
                    <Button onClick={() => onLogin(u.id)}>Log in</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle>Or create a user</SectionTitle>
          <Card className="p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <Field label="Name">
                <TextInput
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                />
              </Field>
              <Field label="Role">
                <Select
                  value={role}
                  onChange={e => {
                    const r = e.target.value;
                    setRole(r);
                    setTrade(r === ROLES.FOREMAN ? TRADES.NONE : WORKER_TRADES[0]);
                  }}>
                  {ROLE_LIST.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>
              {!isForeman && (
                <Field label="Trade">
                  <Select
                    value={trade}
                    onChange={e => setTrade(e.target.value)}>
                    {WORKER_TRADES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Button type="submit" className="w-full">
                Create &amp; log in
              </Button>
            </form>
          </Card>
        </section>
      </main>
    </div>
  );
}
