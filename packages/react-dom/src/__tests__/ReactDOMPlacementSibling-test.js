/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails reactcore
 */

'use strict';

let React;
let ReactDOMClient;
let createPortal;
let act;
let container;
let root;

// Commits that place several consecutive siblings at once. The DOM has to end
// up in the same order, with the same nodes, as a fresh render.
describe('ReactDOMPlacementSibling', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    createPortal = require('react-dom').createPortal;
    act = require('internal-test-utils').act;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    document.body.removeChild(container);
  });

  function Row({id, badge}) {
    return (
      <li data-id={id}>
        {badge ? <b>!</b> : null}
        {id}
      </li>
    );
  }

  function List({ids, badge}) {
    return (
      <ul>
        {ids.map(id => (
          <Row key={id} id={id} badge={badge ? badge(id) : false} />
        ))}
        <li key="footer">footer</li>
      </ul>
    );
  }

  function rowIds() {
    return Array.from(container.querySelectorAll('li[data-id]')).map(
      li => +li.getAttribute('data-id'),
    );
  }

  function rowNodes() {
    const nodes = new Map();
    container.querySelectorAll('li[data-id]').forEach(li => {
      nodes.set(+li.getAttribute('data-id'), li);
    });
    return nodes;
  }

  function range(from, to) {
    const ids = [];
    for (let i = from; i < to; i++) {
      ids.push(i);
    }
    return ids;
  }

  it('fills an empty parent', async () => {
    await act(() => root.render(<List ids={[]} />));
    await act(() => root.render(<List ids={range(0, 20)} />));
    expect(rowIds()).toEqual(range(0, 20));
  });

  it('inserts a run before, between and after existing rows', async () => {
    await act(() => root.render(<List ids={[100, 200]} />));
    const before = rowNodes();
    const ids = [...range(0, 5), 100, ...range(5, 10), 200, ...range(10, 15)];
    await act(() => root.render(<List ids={ids} />));
    expect(rowIds()).toEqual(ids);
    expect(rowNodes().get(100)).toBe(before.get(100));
    expect(rowNodes().get(200)).toBe(before.get(200));
  });

  it('keeps node identity when keyed rows are reversed or moved', async () => {
    await act(() => root.render(<List ids={range(0, 30)} />));
    const nodes = rowNodes();

    await act(() => root.render(<List ids={range(0, 30).reverse()} />));
    expect(rowIds()).toEqual(range(0, 30).reverse());

    const moved = [...range(20, 30), ...range(0, 20)];
    await act(() => root.render(<List ids={moved} />));
    expect(rowIds()).toEqual(moved);

    rowNodes().forEach((node, id) => {
      expect(node).toBe(nodes.get(id));
    });
  });

  it('keeps a run intact when its members also insert children', async () => {
    // Every moved row also places a child of its own in the same commit.
    // Those nested placements are committed between the placements of the
    // outer run.
    await act(() => root.render(<List ids={range(0, 30)} />));
    const nodes = rowNodes();
    await act(() =>
      root.render(<List ids={range(0, 30).reverse()} badge={() => true} />),
    );
    expect(rowIds()).toEqual(range(0, 30).reverse());
    container.querySelectorAll('li[data-id]').forEach(li => {
      expect(li.firstChild.tagName).toBe('B');
      expect(li.textContent).toBe('!' + li.getAttribute('data-id'));
    });
    expect(container.querySelector('ul').lastChild.textContent).toBe('footer');
    rowNodes().forEach((node, id) => {
      expect(node).toBe(nodes.get(id));
    });

    await act(() =>
      root.render(<List ids={range(0, 30)} badge={id => id % 3 === 0} />),
    );
    expect(rowIds()).toEqual(range(0, 30));
    expect(container.querySelectorAll('b').length).toBe(10);
  });

  it('handles text, fragments and components that render null in a run', async () => {
    function Nothing() {
      return null;
    }
    function App({items}) {
      return (
        <div>
          <span>start</span>
          {items}
          <span>end</span>
        </div>
      );
    }
    await act(() => root.render(<App items={null} />));
    await act(() =>
      root.render(
        <App
          items={[
            'a',
            <Nothing key="n1" />,
            <React.Fragment key="f">
              <i>b</i>
              {'c'}
              <Nothing />
            </React.Fragment>,
            'd',
            <Nothing key="n2" />,
          ]}
        />,
      ),
    );
    expect(container.textContent).toBe('startabcdend');
    expect(container.firstChild.lastChild.textContent).toBe('end');
  });

  it('finds a stable sibling inside a component after a run', async () => {
    function Wrapped({children}) {
      return (
        <>
          {null}
          <Empty />
          {children}
        </>
      );
    }
    function Empty() {
      return null;
    }
    function App({ids}) {
      return (
        <ul>
          {ids.map(id => (
            <li key={id}>{id}</li>
          ))}
          <Wrapped>
            <li key="last">last</li>
          </Wrapped>
        </ul>
      );
    }
    await act(() => root.render(<App ids={[]} />));
    const last = container.querySelector('li');
    await act(() => root.render(<App ids={range(0, 8)} />));
    expect(container.textContent).toBe('01234567last');
    expect(container.querySelector('ul').lastChild).toBe(last);
  });

  it('places runs that contain portals', async () => {
    const portalTarget = document.createElement('div');
    function App({ids}) {
      return (
        <ul>
          <li key="first">first</li>
          {ids.map(id =>
            id === 'p' ? (
              createPortal(<li>portal</li>, portalTarget, 'p')
            ) : (
              <li key={id}>{id}</li>
            ),
          )}
          <li key="last">last</li>
        </ul>
      );
    }
    await act(() => root.render(<App ids={[]} />));
    await act(() => root.render(<App ids={[1, 'p', 2, 3]} />));
    expect(container.textContent).toBe('first123last');
    expect(portalTarget.textContent).toBe('portal');
    await act(() => root.render(<App ids={[4, 3, 'p', 5, 2, 1]} />));
    expect(container.textContent).toBe('first43521last');
    expect(portalTarget.textContent).toBe('portal');
  });

  it('matches a fresh render after random updates', async () => {
    let seed = 7;
    function random() {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    }
    function Item({id, kind}) {
      switch (kind) {
        case 0:
          return <li data-k={id}>{id}</li>;
        case 1:
          return null;
        case 2:
          return (
            <>
              <li>{id}a</li>
              {id + 'b'}
            </>
          );
        default:
          return (
            <li data-k={id}>
              {id}
              <b>{kind}</b>
            </li>
          );
      }
    }
    function App({items}) {
      return (
        <ul>
          <li>head</li>
          {items.map(item => (
            <Item key={item.id} id={item.id} kind={item.kind} />
          ))}
          <li>tail</li>
        </ul>
      );
    }
    const freshContainer = document.createElement('div');
    const freshRoot = ReactDOMClient.createRoot(freshContainer);

    let items = [];
    let nextId = 0;
    for (let step = 0; step < 80; step++) {
      const next = items.map(item => ({...item}));
      const op = Math.floor(random() * 5);
      if (op === 0 || next.length < 4) {
        const at = Math.floor(random() * (next.length + 1));
        const count = 1 + Math.floor(random() * 12);
        for (let i = 0; i < count; i++) {
          next.splice(at + i, 0, {
            id: nextId++,
            kind: Math.floor(random() * 4),
          });
        }
      } else if (op === 1) {
        next.splice(
          Math.floor(random() * next.length),
          1 + Math.floor(random() * 5),
        );
      } else if (op === 2) {
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          const tmp = next[i];
          next[i] = next[j];
          next[j] = tmp;
        }
      } else if (op === 3) {
        next.reverse();
      } else {
        next.forEach(item => {
          if (random() < 0.4) {
            item.kind = Math.floor(random() * 4);
          }
        });
      }
      const kept = new Map();
      next.forEach(item => {
        const previous = items.find(other => other.id === item.id);
        if (previous !== undefined && previous.kind === item.kind) {
          const node = container.querySelector(`[data-k="${item.id}"]`);
          if (node !== null) {
            kept.set(item.id, node);
          }
        }
      });
      items = next;

      await act(() => root.render(<App items={items} />));
      await act(() => freshRoot.render(<App key={step} items={items} />));
      expect(container.innerHTML).toBe(freshContainer.innerHTML);
      // Items that kept their kind still own the same node.
      kept.forEach((node, id) => {
        expect(container.querySelector(`[data-k="${id}"]`)).toBe(node);
      });
    }
    freshRoot.unmount();
  });
});
