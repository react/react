let React;
let ReactDOM;
let ReactDOMClient;
let Scheduler;
let act;
let assertLog;

let overrideQueueMicrotask;
let flushFakeMicrotasks;

// TODO: Migrate tests to React DOM instead of React Noop

describe('ReactFlushSync (AggregateError not available)', () => {
  beforeEach(() => {
    jest.resetModules();

    global.AggregateError = undefined;

    // When AggregateError is not available, the errors are rethrown in a
    // microtask. This is an implementation detail but we want to test it here
    // so override the global one.
    const originalQueueMicrotask = queueMicrotask;
    overrideQueueMicrotask = false;
    const fakeMicrotaskQueue = [];
    global.queueMicrotask = cb => {
      if (overrideQueueMicrotask) {
        fakeMicrotaskQueue.push(cb);
      } else {
        originalQueueMicrotask(cb);
      }
    };
    flushFakeMicrotasks = () => {
      while (fakeMicrotaskQueue.length > 0) {
        const cb = fakeMicrotaskQueue.shift();
        cb();
      }
    };

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
  });

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  function getVisibleChildren(element: Element): React$Node {
    const children = [];
    let node: any = element.firstChild;
    while (node) {
      if (node.nodeType === 1) {
        if (
          ((node.tagName !== 'SCRIPT' && node.tagName !== 'script') ||
            node.hasAttribute('data-meaningful')) &&
          node.tagName !== 'TEMPLATE' &&
          node.tagName !== 'template' &&
          !node.hasAttribute('hidden') &&
          !node.hasAttribute('aria-hidden')
        ) {
          const props: any = {};
          const attributes = node.attributes;
          for (let i = 0; i < attributes.length; i++) {
            if (
              attributes[i].name === 'id' &&
              attributes[i].value.includes(':')
            ) {
              // We assume this is a React added ID that's a non-visual implementation detail.
              continue;
            }
            props[attributes[i].name] = attributes[i].value;
          }
          props.children = getVisibleChildren(node);
          children.push(
            require('react').createElement(node.tagName.toLowerCase(), props),
          );
        }
      } else if (node.nodeType === 3) {
        children.push(node.data);
      }
      node = node.nextSibling;
    }
    return children.length === 0
      ? undefined
      : children.length === 1
        ? children[0]
        : children;
  }

  it('completely exhausts synchronous work queue even if something throws', async () => {
    function Throws({error}) {
      throw error;
    }

    const container1 = document.createElement('div');
    const root1 = ReactDOMClient.createRoot(container1);
    const container2 = document.createElement('div');
    const root2 = ReactDOMClient.createRoot(container2);
    const container3 = document.createElement('div');
    const root3 = ReactDOMClient.createRoot(container3);

    await act(async () => {
      root1.render(<Text text="Hi" />);
      root2.render(<Text text="Andrew" />);
      root3.render(<Text text="!" />);
    });
    assertLog(['Hi', 'Andrew', '!']);

    const aahh = new Error('AAHH!');
    const nooo = new Error('Noooooooooo!');

    // Override the global queueMicrotask so we can test the behavior.
    overrideQueueMicrotask = true;
    let error;
    try {
      await act(() => {
        ReactDOM.flushSync(() => {
          root1.render(<Throws error={aahh} />);
          root2.render(<Throws error={nooo} />);
          root3.render(<Text text="aww" />);
        });
      });
    } catch (e) {
      error = e;
    }

    // The update to root 3 should have finished synchronously, even though the
    // earlier updates errored.
    assertLog(['aww']);
    // Roots 1 and 2 were unmounted.
    expect(getVisibleChildren(container1)).toEqual(undefined);
    expect(getVisibleChildren(container2)).toEqual(undefined);
    expect(getVisibleChildren(container3)).toEqual('aww');

    // In modern environments, React would throw an AggregateError. Because
    // AggregateError is not available, React throws the first error, then
    // throws the remaining errors in separate tasks.
    expect(error).toBe(aahh);
    await flushFakeMicrotasks();
  });
});
