/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactDOM;
let ReactDOMClient;
let act;
let Activity;
let Suspense;

// Many siblings placed in the same commit share their host sibling. These
// tests cover the places where that sibling can be found (or not found) to
// make sure every inserted node ends up in the right spot.
describe('ReactDOMConsecutivePlacement', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    Activity = React.Activity;
    Suspense = React.Suspense;
  });

  function Row({id}) {
    return <li>{id}</li>;
  }

  function texts(parent) {
    return Array.from(parent.childNodes).map(node => node.textContent);
  }

  function range(start, end) {
    const result = [];
    for (let i = start; i < end; i++) {
      result.push(i);
    }
    return result;
  }

  it('inserts a run of siblings into an empty parent', async () => {
    function List({ids}) {
      return (
        <ul>
          {ids.map(id => (
            <Row key={id} id={id} />
          ))}
        </ul>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<List ids={[]} />));
    const list = container.firstChild;

    await act(() => root.render(<List ids={range(0, 50)} />));
    expect(container.firstChild).toBe(list);
    expect(texts(list)).toEqual(range(0, 50).map(String));
  });

  it('inserts a run of siblings between stable siblings', async () => {
    function List({ids}) {
      return (
        <ul>
          <li>head</li>
          {ids.map(id => (
            <Row key={id} id={id} />
          ))}
          <li>tail</li>
        </ul>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<List ids={[0, 99]} />));
    const list = container.firstChild;
    const [head, first, last, tail] = list.childNodes;

    await act(() => root.render(<List ids={range(0, 100)} />));
    expect(texts(list)).toEqual(['head', ...range(0, 100).map(String), 'tail']);
    expect(list.firstChild).toBe(head);
    expect(list.childNodes[1]).toBe(first);
    expect(list.childNodes[100]).toBe(last);
    expect(list.lastChild).toBe(tail);
  });

  it('inserts a run of text nodes and fragments', async () => {
    function App({show}) {
      return (
        <div>
          <span>a</span>
          {show ? ['x', 'y', 'z'] : null}
          {show ? (
            <>
              <i>1</i>
              <i>2</i>
            </>
          ) : null}
          {show ? 'w' : null}
          <span>b</span>
        </div>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App show={false} />));
    const div = container.firstChild;
    const [a, b] = div.childNodes;

    await act(() => root.render(<App show={true} />));
    expect(texts(div)).toEqual(['a', 'x', 'y', 'z', '1', '2', 'w', 'b']);
    expect(div.firstChild).toBe(a);
    expect(div.lastChild).toBe(b);
  });

  it('finds a host sibling after components that render nothing', async () => {
    function Nothing() {
      return null;
    }
    function Deep({children}) {
      return (
        <>
          <Nothing />
          <>
            <Nothing />
            {children}
          </>
        </>
      );
    }
    function App({ids}) {
      return (
        <ul>
          {ids.map(id => (
            <Row key={id} id={id} />
          ))}
          <Nothing />
          <Deep>
            <li>tail</li>
          </Deep>
        </ul>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App ids={[]} />));
    const list = container.firstChild;
    const tail = list.firstChild;

    await act(() => root.render(<App ids={range(0, 20)} />));
    expect(texts(list)).toEqual([...range(0, 20).map(String), 'tail']);
    expect(list.lastChild).toBe(tail);
  });

  it('inserts runs nested inside a stable fragment between placed siblings', async () => {
    function App({show}) {
      return (
        <ul>
          <li>head</li>
          {show ? <Row key="p1" id="p1" /> : null}
          {show ? <Row key="p2" id="p2" /> : null}
          <>
            {show ? <Row key="q1" id="q1" /> : null}
            {show ? <Row key="q2" id="q2" /> : null}
            {show ? <Row key="q3" id="q3" /> : null}
          </>
          {show ? <Row key="p3" id="p3" /> : null}
          {show ? <Row key="p4" id="p4" /> : null}
          <li>tail</li>
        </ul>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App show={false} />));
    const list = container.firstChild;
    const [head, tail] = list.childNodes;

    await act(() => root.render(<App show={true} />));
    expect(texts(list)).toEqual([
      'head',
      'p1',
      'p2',
      'q1',
      'q2',
      'q3',
      'p3',
      'p4',
      'tail',
    ]);
    expect(list.firstChild).toBe(head);
    expect(list.lastChild).toBe(tail);
  });

  it('does not use portal children as the host sibling of a run', async () => {
    const portalContainer = document.createElement('div');
    function App({ids}) {
      return (
        <ul>
          {ids.map(id => (
            <Row key={id} id={id} />
          ))}
          {ReactDOM.createPortal(<li>portal</li>, portalContainer)}
          <li>tail</li>
        </ul>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App ids={[]} />));
    const list = container.firstChild;
    const tail = list.firstChild;

    await act(() => root.render(<App ids={range(0, 5)} />));
    expect(texts(list)).toEqual([...range(0, 5).map(String), 'tail']);
    expect(list.lastChild).toBe(tail);
    expect(texts(portalContainer)).toEqual(['portal']);
  });

  it('inserts a run that contains new portals', async () => {
    const portalContainer = document.createElement('div');
    function Item({id}) {
      if (id % 3 === 1) {
        return ReactDOM.createPortal(<li>{'p' + id}</li>, portalContainer);
      }
      return <li>{id}</li>;
    }
    function App({ids}) {
      return (
        <ul>
          {ids.map(id => (
            <Item key={id} id={id} />
          ))}
          <li>tail</li>
        </ul>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App ids={[]} />));
    const list = container.firstChild;
    const tail = list.firstChild;

    await act(() => root.render(<App ids={range(0, 9)} />));
    expect(texts(list)).toEqual(['0', '2', '3', '5', '6', '8', 'tail']);
    expect(list.lastChild).toBe(tail);
    expect(texts(portalContainer)).toEqual(['p1', 'p4', 'p7']);
  });

  it('inserts a run before the content of a hidden Activity', async () => {
    function App({ids}) {
      return (
        <ul>
          {ids.map(id => (
            <Row key={id} id={id} />
          ))}
          <Activity mode="hidden">
            <li>hidden</li>
          </Activity>
          <li>tail</li>
        </ul>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App ids={[]} />));
    const list = container.firstChild;
    const [hidden, tail] = list.childNodes;
    expect(hidden.style.display).toBe('none');

    await act(() => root.render(<App ids={range(0, 10)} />));
    expect(texts(list)).toEqual([
      ...range(0, 10).map(String),
      'hidden',
      'tail',
    ]);
    expect(list.childNodes[10]).toBe(hidden);
    expect(list.lastChild).toBe(tail);
  });

  it('inserts a run before a Suspense boundary showing its fallback', async () => {
    const never = new Promise(() => {});
    function Suspend() {
      React.use(never);
    }
    function App({ids}) {
      return (
        <ul>
          {ids.map(id => (
            <Row key={id} id={id} />
          ))}
          <Suspense fallback={<li>fallback</li>}>
            <Suspend />
          </Suspense>
          <li>tail</li>
        </ul>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<App ids={[]} />));
    const list = container.firstChild;
    const [fallback, tail] = list.childNodes;
    expect(fallback.textContent).toBe('fallback');

    await act(() => root.render(<App ids={range(0, 10)} />));
    expect(texts(list)).toEqual([
      ...range(0, 10).map(String),
      'fallback',
      'tail',
    ]);
    expect(list.childNodes[10]).toBe(fallback);
    expect(list.lastChild).toBe(tail);
  });

  it('keeps node identity when keyed rows are reversed or moved', async () => {
    function List({ids}) {
      return (
        <ul>
          {ids.map(id => (
            <Row key={id} id={id} />
          ))}
        </ul>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    const ids = range(0, 30);
    await act(() => root.render(<List ids={ids} />));
    const list = container.firstChild;
    const nodes = new Map(
      Array.from(list.childNodes).map(node => [node.textContent, node]),
    );

    const reversed = ids.slice().reverse();
    await act(() => root.render(<List ids={reversed} />));
    expect(texts(list)).toEqual(reversed.map(String));

    const movedToFront = [...range(20, 30), ...range(0, 20)];
    await act(() => root.render(<List ids={movedToFront} />));
    expect(texts(list)).toEqual(movedToFront.map(String));

    Array.from(list.childNodes).forEach(node => {
      expect(node).toBe(nodes.get(node.textContent));
    });
  });

  it('matches a fresh render after random inserts, moves and deletes', async () => {
    let seed = 1;
    function random() {
      // Deterministic xorshift so failures are reproducible.
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    }

    const portalContainer = document.createElement('div');
    function Nothing() {
      return null;
    }
    // The kind of an item depends only on its key, so a kept key keeps its
    // fiber and its host nodes.
    function Item({id}) {
      switch (id % 6) {
        case 0:
          return <li>{'h' + id}</li>;
        case 1:
          return 't' + id;
        case 2:
          return (
            <>
              <li>{'a' + id}</li>
              <li>{'b' + id}</li>
            </>
          );
        case 3:
          return <Nothing />;
        case 4:
          return (
            <>
              <Nothing />
              <li>{'n' + id}</li>
            </>
          );
        default:
          return ReactDOM.createPortal(<li>{'p' + id}</li>, portalContainer);
      }
    }
    function App({groups}) {
      return (
        <div>
          <span>head</span>
          {groups.map((ids, i) => (
            <React.Fragment key={i}>
              {ids.map(id => (
                <Item key={id} id={id} />
              ))}
            </React.Fragment>
          ))}
          <span>tail</span>
        </div>
      );
    }

    function nextGroups(groups) {
      return groups.map(ids => {
        let next = ids.filter(() => random() > 0.2);
        for (let i = next.length - 1; i > 0; i--) {
          if (random() < 0.3) {
            const j = Math.floor(random() * (i + 1));
            const tmp = next[i];
            next[i] = next[j];
            next[j] = tmp;
          }
        }
        const insertAt = Math.floor(random() * (next.length + 1));
        const inserted = [];
        const count = Math.floor(random() * 8);
        for (let i = 0; i < count; i++) {
          inserted.push(nextId++);
        }
        next = [
          ...next.slice(0, insertAt),
          ...inserted,
          ...next.slice(insertAt),
        ];
        return next;
      });
    }

    let nextId = 0;
    for (let run = 0; run < 6; run++) {
      seed = run + 1;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      let groups = [[], [], []];
      await act(() => root.render(<App groups={groups} />));

      for (let step = 0; step < 12; step++) {
        const before = new Map(
          Array.from(container.firstChild.childNodes).map(node => [
            node.textContent,
            node,
          ]),
        );
        groups = nextGroups(groups);
        await act(() => root.render(<App groups={groups} />));

        const fresh = document.createElement('div');
        const freshRoot = ReactDOMClient.createRoot(fresh);
        await act(() => freshRoot.render(<App groups={groups} />));
        expect(container.innerHTML).toBe(fresh.innerHTML);
        await act(() => freshRoot.unmount());

        Array.from(container.firstChild.childNodes).forEach(node => {
          const previous = before.get(node.textContent);
          if (previous !== undefined) {
            expect(node).toBe(previous);
          }
        });
      }
      await act(() => root.unmount());
      expect(portalContainer.childNodes.length).toBe(0);
    }
  });
});
