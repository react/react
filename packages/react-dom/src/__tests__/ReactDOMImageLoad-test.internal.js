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
let Scheduler;
// let ReactCache;
let ReactDOM;
let ReactDOMClient;
// let Suspense;
let originalCreateElement;
// let TextResource;
// let textResourceShouldFail;
let originalHTMLImageElementSrcDescriptor;

let images = [];
let onLoadSpy = null;
let actualLoadSpy = null;

let waitForAll;
let waitFor;
let assertLog;

function PhaseMarkers({children}) {
  Scheduler.log('render start');
  React.useLayoutEffect(() => {
    Scheduler.log('last layout');
  });
  React.useEffect(() => {
    Scheduler.log('last passive');
  });
  return children;
}

function last(arr) {
  if (Array.isArray(arr)) {
    if (arr.length) {
      return arr[arr.length - 1];
    }
    return undefined;
  }
  throw new Error('last was passed something that was not an array');
}

function Text(props) {
  Scheduler.log(props.text);
  return props.text;
}

// function AsyncText(props) {
//   const text = props.text;
//   try {
//     TextResource.read([props.text, props.ms]);
//     Scheduler.log(text);
//     return text;
//   } catch (promise) {
//     if (typeof promise.then === 'function') {
//       Scheduler.log(`Suspend! [${text}]`);
//     } else {
//       Scheduler.log(`Error! [${text}]`);
//     }
//     throw promise;
//   }
// }

function Img({src: maybeSrc, onLoad, useImageLoader, ref}) {
  const src = maybeSrc || 'default';
  Scheduler.log('Img ' + src);
  return <img src={src} onLoad={onLoad} />;
}

function Yield() {
  Scheduler.log('Yield');
  Scheduler.unstable_requestPaint();
  return null;
}

function loadImage(element) {
  const event = new Event('load');
  element.__needsDispatch = false;
  element.dispatchEvent(event);
}

describe('ReactDOMImageLoad', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    Scheduler = require('scheduler');
    // ReactCache = require('react-cache');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    // Suspense = React.Suspense;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    assertLog = InternalTestUtils.assertLog;

    onLoadSpy = jest.fn(reactEvent => {
      const src = reactEvent.target.getAttribute('src');
      Scheduler.log('onLoadSpy [' + src + ']');
    });

    actualLoadSpy = jest.fn(nativeEvent => {
      const src = nativeEvent.target.getAttribute('src');
      Scheduler.log('actualLoadSpy [' + src + ']');
      nativeEvent.__originalDispatch = false;
    });

    // TextResource = ReactCache.unstable_createResource(
    //   ([text, ms = 0]) => {
    //     let listeners = null;
    //     let status = 'pending';
    //     let value = null;
    //     return {
    //       then(resolve, reject) {
    //         switch (status) {
    //           case 'pending': {
    //             if (listeners === null) {
    //               listeners = [{resolve, reject}];
    //               setTimeout(() => {
    //                 if (textResourceShouldFail) {
    //                   Scheduler.log(
    //                     `Promise rejected [${text}]`,
    //                   );
    //                   status = 'rejected';
    //                   value = new Error('Failed to load: ' + text);
    //                   listeners.forEach(listener => listener.reject(value));
    //                 } else {
    //                   Scheduler.log(
    //                     `Promise resolved [${text}]`,
    //                   );
    //                   status = 'resolved';
    //                   value = text;
    //                   listeners.forEach(listener => listener.resolve(value));
    //                 }
    //               }, ms);
    //             } else {
    //               listeners.push({resolve, reject});
    //             }
    //             break;
    //           }
    //           case 'resolved': {
    //             resolve(value);
    //             break;
    //           }
    //           case 'rejected': {
    //             reject(value);
    //             break;
    //           }
    //         }
    //       },
    //     };
    //   },
    //   ([text, ms]) => text,
    // );
    // textResourceShouldFail = false;

    images = [];

    originalCreateElement = document.createElement;
    document.createElement = function createElement(tagName, options) {
      const element = originalCreateElement.call(document, tagName, options);
      if (tagName === 'img') {
        element.addEventListener('load', actualLoadSpy);
        images.push(element);
      }
      return element;
    };

    originalHTMLImageElementSrcDescriptor = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      'src',
    );

    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      get() {
        return this.getAttribute('src');
      },
      set(value) {
        Scheduler.log('load triggered');
        this.__needsDispatch = true;
        this.setAttribute('src', value);
      },
    });
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    Object.defineProperty(
      HTMLImageElement.prototype,
      'src',
      originalHTMLImageElementSrcDescriptor,
    );
  });

  it('captures the load event if it happens before commit phase and replays it between layout and passive effects', async function () {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    React.startTransition(() =>
      root.render(
        <PhaseMarkers>
          <Img onLoad={onLoadSpy} />
          <Yield />
          <Text text={'a'} />
        </PhaseMarkers>,
      ),
    );

    await waitFor(['render start', 'Img default', 'Yield']);
    const img = last(images);
    loadImage(img);
    assertLog([
      'actualLoadSpy [default]',
      // no onLoadSpy since we have not completed render
    ]);
    await waitForAll(['a', 'load triggered', 'last layout', 'last passive']);
    expect(img.__needsDispatch).toBe(true);
    loadImage(img);
    assertLog([
      'actualLoadSpy [default]', // the browser reloading of the image causes this to yield again
      'onLoadSpy [default]',
    ]);
    expect(onLoadSpy).toHaveBeenCalled();
  });

  it('captures the load event if it happens after commit phase and replays it', async function () {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    React.startTransition(() =>
      root.render(
        <PhaseMarkers>
          <Img onLoad={onLoadSpy} />
        </PhaseMarkers>,
      ),
    );

    await waitFor([
      'render start',
      'Img default',
      'load triggered',
      'last layout',
    ]);
    Scheduler.unstable_requestPaint();
    const img = last(images);
    loadImage(img);
    assertLog(['actualLoadSpy [default]', 'onLoadSpy [default]']);
    await waitForAll(['last passive']);
    expect(img.__needsDispatch).toBe(false);
    expect(onLoadSpy).toHaveBeenCalledTimes(1);
  });

  it('replays the last load event when more than one fire before the end of the layout phase completes', async function () {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function Base() {
      const [src, setSrc] = React.useState('a');
      return (
        <PhaseMarkers>
          <Img src={src} onLoad={onLoadSpy} />
          <Yield />
          <UpdateSrc setSrc={setSrc} />
        </PhaseMarkers>
      );
    }

    function UpdateSrc({setSrc}) {
      React.useLayoutEffect(() => {
        setSrc('b');
      }, [setSrc]);
      return null;
    }

    React.startTransition(() => root.render(<Base />));

    await waitFor(['render start', 'Img a', 'Yield']);
    const img = last(images);
    loadImage(img);
    assertLog(['actualLoadSpy [a]']);

    await waitFor([
      'load triggered',
      'last layout',
      // the update in layout causes a passive effects flush before a sync render
      'last passive',
      'render start',
      'Img b',
      'Yield',
      // yield is ignored becasue we are sync rendering
      'last layout',
      'last passive',
    ]);
    expect(images.length).toBe(1);
    loadImage(img);
    assertLog(['actualLoadSpy [b]', 'onLoadSpy [b]']);
    expect(onLoadSpy).toHaveBeenCalledTimes(1);
  });

  it('replays load events that happen in passive phase after the passive phase.', async function () {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    root.render(
      <PhaseMarkers>
        <Img onLoad={onLoadSpy} />
      </PhaseMarkers>,
    );

    await waitForAll([
      'render start',
      'Img default',
      'load triggered',
      'last layout',
      'last passive',
    ]);
    const img = last(images);
    loadImage(img);
    assertLog(['actualLoadSpy [default]', 'onLoadSpy [default]']);
    expect(onLoadSpy).toHaveBeenCalledTimes(1);
  });

  it('captures and suppresses the load event if it happens before passive effects and a cascading update causes the img to be removed', async function () {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function ChildSuppressing({children}) {
      const [showChildren, update] = React.useState(true);
      React.useLayoutEffect(() => {
        if (showChildren) {
          update(false);
        }
      }, [showChildren]);
      return showChildren ? children : null;
    }

    React.startTransition(() =>
      root.render(
        <PhaseMarkers>
          <ChildSuppressing>
            <Img onLoad={onLoadSpy} />
            <Yield />
            <Text text={'a'} />
          </ChildSuppressing>
        </PhaseMarkers>,
      ),
    );

    await waitFor(['render start', 'Img default', 'Yield']);
    const img = last(images);
    loadImage(img);
    assertLog(['actualLoadSpy [default]']);
    await waitForAll(['a', 'load triggered', 'last layout', 'last passive']);
    expect(img.__needsDispatch).toBe(true);
    loadImage(img);
    // we expect the browser to load the image again but since we are no longer rendering
    // the img there will be no onLoad called
    assertLog(['actualLoadSpy [default]']);
    await waitForAll([]);
    expect(onLoadSpy).not.toHaveBeenCalled();
  });

  it('captures and suppresses the load event if it happens before passive effects and a cascading update causes the img to be removed, alternate', async function () {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function Switch({children}) {
      const [shouldShow, updateShow] = React.useState(true);
      return children(shouldShow, updateShow);
    }

    function UpdateSwitchInLayout({updateShow}) {
      React.useLayoutEffect(() => {
        updateShow(false);
      }, []);
      return null;
    }

    React.startTransition(() =>
      root.render(
        <Switch>
          {(shouldShow, updateShow) => (
            <PhaseMarkers>
              <>
                {shouldShow === true ? (
                  <>
                    <Img onLoad={onLoadSpy} />
                    <Yield />
                    <Text text={'a'} />
                  </>
                ) : null}
                ,
                <UpdateSwitchInLayout updateShow={updateShow} />
              </>
            </PhaseMarkers>
          )}
        </Switch>,
      ),
    );

    await waitFor([
      // initial render
      'render start',
      'Img default',
      'Yield',
    ]);
    const img = last(images);
    loadImage(img);
    assertLog(['actualLoadSpy [default]']);
    await waitForAll([
      'a',
      'load triggered',
      // img is present at first
      'last layout',
      'last passive',
      // sync re-render where the img is suppressed
      'render start',
      'last layout',
      'last passive',
    ]);
    expect(img.__needsDispatch).toBe(true);
    loadImage(img);
    // we expect the browser to load the image again but since we are no longer rendering
    // the img there will be no onLoad called
    assertLog(['actualLoadSpy [default]']);
    await waitForAll([]);
    expect(onLoadSpy).not.toHaveBeenCalled();
  });

  // eslint-disable-next-line jest/no-commented-out-tests
  // it('captures the load event if it happens in a suspended subtree and replays it between layout and passive effects on resumption', async function() {
  //   function SuspendingWithImage() {
  //     Scheduler.log('SuspendingWithImage');
  //     return (
  //       <Suspense fallback={<Text text="Loading..." />}>
  //         <AsyncText text="A" ms={100} />
  //         <PhaseMarkers>
  //           <Img onLoad={onLoadSpy} />
  //         </PhaseMarkers>
  //       </Suspense>
  //     );
  //   }

  //   const container = document.createElement('div');
  //   const root = ReactDOMClient.createRoot(container);

  //   React.startTransition(() => root.render(<SuspendingWithImage />));

  //   expect(Scheduler).toFlushAndYield([
  //     'SuspendingWithImage',
  //     'Suspend! [A]',
  //     'render start',
  //     'Img default',
  //     'Loading...',
  //   ]);
  //   let img = last(images);
  //   loadImage(img);
  //   expect(Scheduler).toHaveYielded(['actualLoadSpy [default]']);
  //   expect(onLoadSpy).not.toHaveBeenCalled();

  //   // Flush some of the time
  //   jest.advanceTimersByTime(50);
  //   // Still nothing...
  //   expect(Scheduler).toFlushWithoutYielding();

  //   // Flush the promise completely
  //   jest.advanceTimersByTime(50);
  //   // Renders successfully
  //   expect(Scheduler).toHaveYielded(['Promise resolved [A]']);

  //   expect(Scheduler).toFlushAndYieldThrough([
  //     'A',
  //     // img was recreated on unsuspended tree causing new load event
  //     'render start',
  //     'Img default',
  //     'last layout',
  //   ]);

  //   expect(images.length).toBe(2);
  //   img = last(images);
  //   expect(img.__needsDispatch).toBe(true);
  //   loadImage(img);
  //   expect(Scheduler).toHaveYielded([
  //     'actualLoadSpy [default]',
  //     'onLoadSpy [default]',
  //   ]);

  //   expect(Scheduler).toFlushAndYield(['last passive']);

  //   expect(onLoadSpy).toHaveBeenCalledTimes(1);
  // });

  it('correctly replays the last img load even when a yield + update causes the host element to change', async function () {
    let externalSetSrc = null;
    let externalSetSrcAlt = null;

    function Base() {
      const [src, setSrc] = React.useState(null);
      const [srcAlt, setSrcAlt] = React.useState(null);
      externalSetSrc = setSrc;
      externalSetSrcAlt = setSrcAlt;
      return srcAlt || src ? <YieldingWithImage src={srcAlt || src} /> : null;
    }

    function YieldingWithImage({src}) {
      Scheduler.log('YieldingWithImage');
      React.useEffect(() => {
        Scheduler.log('Committed');
      });
      return (
        <>
          <Img src={src} onLoad={onLoadSpy} />
          <Yield />
          <Text text={src} />
        </>
      );
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    root.render(<Base />);

    await waitForAll([]);

    React.startTransition(() => externalSetSrc('a'));

    await waitFor(['YieldingWithImage', 'Img a', 'Yield']);
    let img = last(images);
    loadImage(img);
    assertLog(['actualLoadSpy [a]']);

    ReactDOM.flushSync(() => externalSetSrcAlt('b'));

    assertLog([
      'YieldingWithImage',
      'Img b',
      'Yield',
      'b',
      'load triggered',
      'Committed',
    ]);
    expect(images.length).toBe(2);
    img = last(images);
    expect(img.__needsDispatch).toBe(true);
    loadImage(img);

    assertLog(['actualLoadSpy [b]', 'onLoadSpy [b]']);
    // why is there another update here?
    await waitForAll(['YieldingWithImage', 'Img b', 'Yield', 'b', 'Committed']);
  });

  it('preserves the src property / attribute when triggering a potential new load event', async () => {
    // this test covers a regression identified in https://github.com/mui/material-ui/pull/31263
    // where the resetting of the src property caused the property to change from relative to fully qualified

    // make sure we are not using the patched src setter
    Object.defineProperty(
      HTMLImageElement.prototype,
      'src',
      originalHTMLImageElementSrcDescriptor,
    );

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    React.startTransition(() =>
      root.render(
        <PhaseMarkers>
          <Img onLoad={onLoadSpy} />
          <Yield />
          <Text text={'a'} />
        </PhaseMarkers>,
      ),
    );

    // render to yield to capture state of img src attribute and property before commit
    await waitFor(['render start', 'Img default', 'Yield']);
    const img = last(images);
    const renderSrcProperty = img.src;
    const renderSrcAttr = img.getAttribute('src');

    // finish render and commit causing the src property to be rewritten
    await waitForAll(['a', 'last layout', 'last passive']);
    const commitSrcProperty = img.src;
    const commitSrcAttr = img.getAttribute('src');

    // ensure attribute and properties agree
    expect(renderSrcProperty).toBe(commitSrcProperty);
    expect(renderSrcAttr).toBe(commitSrcAttr);
  });

  it('captures the load event for Blob sources if it happens before commit phase', async function () {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    const blob = new Blob();

    React.startTransition(() =>
      root.render(
        <PhaseMarkers>
          <Img src={blob} onLoad={onLoadSpy} />
          <Yield />
          <Text text={'a'} />
        </PhaseMarkers>,
      ),
    );

    await waitFor(['render start', 'Img [object Blob]', 'Yield']);
    const img = last(images);
    loadImage(img);
    assertLog([
      'actualLoadSpy [[object Blob]]',
      // no onLoadSpy since we have not completed render
    ]);
    await waitForAll(['a', 'load triggered', 'last layout', 'last passive']);
    expect(img.__needsDispatch).toBe(true);
    loadImage(img);
    assertLog([
      'actualLoadSpy [[object Blob]]', // the browser reloading of the image causes this to yield again
      'onLoadSpy [[object Blob]]',
    ]);
    expect(onLoadSpy).toHaveBeenCalled();
  });

  it('captures the load event for Blob sources if it happens after commit phase and replays it', async function () {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    const blob = new Blob();

    React.startTransition(() =>
      root.render(
        <PhaseMarkers>
          <Img src={blob} onLoad={onLoadSpy} />
        </PhaseMarkers>,
      ),
    );

    await waitFor([
      'render start',
      'Img [object Blob]',
      'load triggered',
      'last layout',
    ]);
    Scheduler.unstable_requestPaint();
    const img = last(images);
    loadImage(img);
    assertLog(['actualLoadSpy [[object Blob]]', 'onLoadSpy [[object Blob]]']);
    await waitForAll(['last passive']);
    expect(img.__needsDispatch).toBe(false);
    expect(onLoadSpy).toHaveBeenCalledTimes(1);
  });
});
