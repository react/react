/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

let React;
let ReactDOM;
let ReactDOMClient;
let act;

beforeEach(() => {
  jest.resetModules();
  React = require('react');
  ReactDOM = require('react-dom');
  ReactDOMClient = require('react-dom/client');
  act = require('internal-test-utils').act;
});

function deferred() {
  let resolve;
  const promise = new Promise(finish => {
    resolve = finish;
  });
  return {promise, resolve};
}

it('rebases an async update across an urgent edit and a cancelled Suspense navigation', async () => {
  const preview = deferred();
  const save = deferred();
  const commits = [];
  const previewAttempts = [];
  let updateCount;

  function Counter({page}) {
    const [count, setCount] = React.useState(2);
    React.useLayoutEffect(() => {
      updateCount = setCount;
      commits.push(page + ':' + count);
    }, [page, count]);

    if (page === 'preview') {
      if (count === 2) {
        setCount(5);
      } else {
        previewAttempts.push(count);
        React.use(preview.promise);
      }
    }
    return <output>{page + ':' + count}</output>;
  }

  const container = document.createElement('div');
  const root = ReactDOMClient.createRoot(container);
  const renderPage = page =>
    root.render(
      <React.Suspense fallback="Loading">
        <Counter page={page} />
      </React.Suspense>,
    );
  await act(() => renderPage('home'));
  await act(() => React.startTransition(() => renderPage('preview')));
  expect(previewAttempts).toContain(5);
  expect(container.textContent).toBe('home:2');

  await act(() => {
    React.startTransition(async () => {
      // A no-op on the suspended 5, but a real update on the committed 2.
      updateCount(value => Math.max(value, 3));
      await save.promise;
    });
    ReactDOM.flushSync(() => {
      renderPage('home');
      updateCount(value => value * 10);
    });
  });
  const whileSaving = container.textContent;

  await act(async () => {
    save.resolve();
    await save.promise;
  });
  const afterSave = container.textContent;

  await act(async () => {
    preview.resolve();
    await preview.promise;
  });
  const afterPreview = container.textContent;
  await act(() => root.unmount());

  // The urgent edit is visible immediately. Once the action completes, replay
  // both updates in dispatch order using the committed input: max(2, 3) * 10.
  expect({whileSaving, afterSave, afterPreview, commits}).toEqual({
    whileSaving: 'home:20',
    afterSave: 'home:30',
    afterPreview: 'home:30',
    commits: ['home:2', 'home:20', 'home:30'],
  });
});
