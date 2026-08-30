import * as React from 'react';

const {
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
  memo,
  forwardRef,
} = React;

// A custom hook, to exercise the hooks tree in react_get_component_by_uid.
function useToggle(initial) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn(value => !value), []);
  return [on, toggle];
}

// Function component with a single State hook + a button that triggers
// re-renders (useful for profiling).
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="row">
      <span>Count: {count}</span>
      <button onClick={() => setCount(value => value + 1)}>+1</button>
    </div>
  );
}

// Uses the custom hook above, so its hooks tree nests a "Toggle" custom hook.
function Toggle() {
  const [on, toggle] = useToggle(false);
  return <button onClick={toggle}>{on ? 'ON' : 'OFF'}</button>;
}

// State + Effect hook with a timer — re-renders every second, handy for
// react_start_profiling / react_get_trace_overview / react_get_commit_report.
function Clock() {
  const [now, setNow] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="row">Clock: {now}</div>;
}

// Context, to exercise the "context" node type and useContext.
const ThemeContext = createContext('light');

function ThemeProvider({children}) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>;
}

function ThemedPanel() {
  const theme = useContext(ThemeContext);
  return (
    <section className="panel" data-theme={theme}>
      <h2>Panel (theme: {theme})</h2>
      <Counter />
      <Toggle />
      <Clock />
    </section>
  );
}

// List with keys, to exercise key reporting and find_components pagination.
function Todo({text}) {
  return <li>{text}</li>;
}

function TodoList() {
  const items = [
    {id: 'learn', text: 'Learn the tools'},
    {id: 'test', text: 'Test the fixture'},
    {id: 'ship', text: 'Ship the package'},
  ];
  return (
    <ul className="todos">
      {items.map(item => (
        <Todo key={item.id} text={item.text} />
      ))}
    </ul>
  );
}

// memo and forwardRef, to exercise the "memo" and "forwardRef" node types.
const MemoBox = memo(function MemoBox({label}) {
  return <div className="box">Memo: {label}</div>;
});

const FancyInput = forwardRef(function FancyInput({placeholder}, ref) {
  return <input ref={ref} placeholder={placeholder} />;
});

function Header() {
  return (
    <header>
      <h1>react-devtools-cdt-mcp fixture</h1>
    </header>
  );
}

export default function App() {
  return (
    <main className="app">
      <Header />
      <ThemeProvider>
        <ThemedPanel />
      </ThemeProvider>
      <TodoList />
      <MemoBox label="hello" />
      <FancyInput placeholder="type here" />
    </main>
  );
}
