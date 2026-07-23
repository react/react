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
let act;
let useThrottledCallback;

describe('useThrottledCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    React = require('react');
    ReactDOM = require('react-dom');
    act = require('internal-test-utils').act;
    useThrottledCallback =
      require('../hooks/useThrottledCallback').default;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function TestComponent({callback, delay, options}) {
    const throttled = useThrottledCallback(callback, delay, options);
    return (
      <div>
        <button
          data-testid="invoke"
          onClick={() => throttled.callback('click')}
        />
        <button data-testid="cancel" onClick={() => throttled.cancel()} />
        <button data-testid="flush" onClick={() => throttled.flush()} />
        <span data-testid="pending">
          {throttled.isPending ? 'true' : 'false'}
        </span>
      </div>
    );
  }

  it('should invoke callback immediately on first call (leading edge)', async () => {
    const spy = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(() => {
      ReactDOM.render(
        <TestComponent callback={spy} delay={100} />,
        container,
      );
    });

    const btn = container.querySelector('[data-testid="invoke"]');
    await act(() => {
      btn.click();
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('click');

    document.body.removeChild(container);
  });

  it('should throttle subsequent calls within delay window', async () => {
    const spy = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(() => {
      ReactDOM.render(
        <TestComponent callback={spy} delay={200} />,
        container,
      );
    });

    const btn = container.querySelector('[data-testid="invoke"]');

    // First call fires immediately (leading)
    await act(() => {
      btn.click();
    });
    expect(spy).toHaveBeenCalledTimes(1);

    // Second call within delay window should be throttled
    await act(() => {
      btn.click();
    });
    // Still 1 because second call is deferred
    expect(spy).toHaveBeenCalledTimes(1);

    // After delay, trailing invocation fires
    await act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(spy).toHaveBeenCalledTimes(2);

    document.body.removeChild(container);
  });

  it('should support leading-only mode', async () => {
    const spy = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(() => {
      ReactDOM.render(
        <TestComponent
          callback={spy}
          delay={200}
          options={{leading: true, trailing: false}}
        />,
        container,
      );
    });

    const btn = container.querySelector('[data-testid="invoke"]');

    await act(() => {
      btn.click();
    });
    expect(spy).toHaveBeenCalledTimes(1);

    await act(() => {
      btn.click();
    });
    expect(spy).toHaveBeenCalledTimes(1);

    // After delay, no trailing fire
    await act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(spy).toHaveBeenCalledTimes(1);

    document.body.removeChild(container);
  });

  it('should support trailing-only mode', async () => {
    const spy = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(() => {
      ReactDOM.render(
        <TestComponent
          callback={spy}
          delay={200}
          options={{leading: false, trailing: true}}
        />,
        container,
      );
    });

    const btn = container.querySelector('[data-testid="invoke"]');

    // First call should NOT fire immediately
    await act(() => {
      btn.click();
    });
    expect(spy).toHaveBeenCalledTimes(0);

    // After delay, trailing fires
    await act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(spy).toHaveBeenCalledTimes(1);

    document.body.removeChild(container);
  });

  it('should cancel pending invocations', async () => {
    const spy = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(() => {
      ReactDOM.render(
        <TestComponent callback={spy} delay={200} />,
        container,
      );
    });

    const invokeBtn = container.querySelector('[data-testid="invoke"]');
    const cancelBtn = container.querySelector('[data-testid="cancel"]');

    // First call fires immediately
    await act(() => {
      invokeBtn.click();
    });
    expect(spy).toHaveBeenCalledTimes(1);

    // Second call is deferred
    await act(() => {
      invokeBtn.click();
    });

    // Cancel before trailing fires
    await act(() => {
      cancelBtn.click();
    });

    await act(() => {
      jest.advanceTimersByTime(200);
    });
    // Should still be 1 because we cancelled
    expect(spy).toHaveBeenCalledTimes(1);

    document.body.removeChild(container);
  });

  it('should flush pending invocations immediately', async () => {
    const spy = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(() => {
      ReactDOM.render(
        <TestComponent callback={spy} delay={500} />,
        container,
      );
    });

    const invokeBtn = container.querySelector('[data-testid="invoke"]');
    const flushBtn = container.querySelector('[data-testid="flush"]');

    await act(() => {
      invokeBtn.click();
    });
    expect(spy).toHaveBeenCalledTimes(1);

    // Queue another call
    await act(() => {
      invokeBtn.click();
    });

    // Flush should invoke immediately without waiting
    await act(() => {
      flushBtn.click();
    });
    expect(spy).toHaveBeenCalledTimes(2);

    document.body.removeChild(container);
  });

  it('should use latest callback without re-creating throttled fn', async () => {
    let callbackValue = 'first';
    const spy = jest.fn(() => callbackValue);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(() => {
      ReactDOM.render(
        <TestComponent callback={spy} delay={100} />,
        container,
      );
    });

    const btn = container.querySelector('[data-testid="invoke"]');

    await act(() => {
      btn.click();
    });
    expect(spy).toHaveBeenCalledTimes(1);

    // Update callback via re-render
    callbackValue = 'second';
    const spy2 = jest.fn(() => callbackValue);
    await act(() => {
      ReactDOM.render(
        <TestComponent callback={spy2} delay={100} />,
        container,
      );
    });

    // Wait for throttle to expire then invoke again
    await act(() => {
      jest.advanceTimersByTime(100);
    });

    await act(() => {
      btn.click();
    });
    expect(spy2).toHaveBeenCalledTimes(1);

    document.body.removeChild(container);
  });

  it('should cleanup timers on unmount', async () => {
    const spy = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(() => {
      ReactDOM.render(
        <TestComponent callback={spy} delay={200} />,
        container,
      );
    });

    const btn = container.querySelector('[data-testid="invoke"]');

    await act(() => {
      btn.click();
    });
    expect(spy).toHaveBeenCalledTimes(1);

    // Queue trailing call
    await act(() => {
      btn.click();
    });

    // Unmount before trailing fires
    await act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });

    // Timer fires but component is unmounted - should not throw
    await act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(spy).toHaveBeenCalledTimes(1);

    document.body.removeChild(container);
  });
});
