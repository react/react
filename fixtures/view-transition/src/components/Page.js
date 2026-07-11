import React, {
  addTransitionType,
  ViewTransition,
  Activity,
  useLayoutEffect,
  useEffect,
  useInsertionEffect,
  useState,
  useId,
  useOptimistic,
  startTransition,
  Suspense,
} from 'react';

import {createPortal} from 'react-dom';

import SwipeRecognizer from './SwipeRecognizer.js';

import './Page.css';

import transitions from './Transitions.module.css';
import NestedReveal from './NestedReveal.js';
import NestedParentExit from './NestedParentExit.js';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const a = (
  <div key="a">
    <ViewTransition>
      <div>a</div>
    </ViewTransition>
  </div>
);

const b = (
  <div key="b">
    <ViewTransition>
      <div>b</div>
    </ViewTransition>
  </div>
);

function Component() {
  // Test inserting fonts with style tags using useInsertionEffect. This is not recommended but
  // used to test that gestures etc works with useInsertionEffect so that stylesheet based
  // libraries can be properly supported.
  useInsertionEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .roboto-font {
        font-family: "Roboto", serif;
        font-optical-sizing: auto;
        font-weight: 100;
        font-style: normal;
        font-variation-settings:
          "wdth" 100;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  return (
    <ViewTransition
      default={
        transitions['enter-slide-right'] + ' ' + transitions['exit-slide-left']
      }>
      <p className="roboto-font">Slide In from Left, Slide Out to Right</p>
      <p>
        <img
          src="https://react.dev/_next/image?url=%2Fimages%2Fteam%2Fsebmarkbage.jpg&w=3840&q=75"
          width="400"
          height="248"
        />
      </p>
    </ViewTransition>
  );
}

function Id() {
  // This is just testing that Id inside a ViewTransition can hydrate correctly.
  return <span id={useId()} />;
}

let wait;
function Suspend() {
  if (!wait) wait = sleep(500);
  return React.use(wait);
}

export default function Page({url, navigate}) {
  const [renderedUrl, optimisticNavigate] = useOptimistic(
    url,
    (state, direction) => {
      return direction === 'left' ? '/?a' : '/?b';
    }
  );
  const show = renderedUrl === '/?b';
  function onTransition(viewTransition, types) {
    const keyframes = [
      {rotate: '0deg', transformOrigin: '30px 8px'},
      {rotate: '360deg', transformOrigin: '30px 8px'},
    ];
    const animation1 = viewTransition.old.animate(keyframes, 250);
    const animation2 = viewTransition.new.animate(keyframes, 250);
    return () => {
      animation1.cancel();
      animation2.cancel();
    };
  }

  function onGestureTransition(
    timeline,
    {rangeStart, rangeEnd},
    viewTransition,
    types
  ) {
    const keyframes = [
      {rotate: '0deg', transformOrigin: '30px 8px'},
      {rotate: '360deg', transformOrigin: '30px 8px'},
    ];
    const reverse = rangeStart > rangeEnd;
    if (timeline instanceof AnimationTimeline) {
      // Native Timeline
      const options = {
        timeline: timeline,
        direction: reverse ? 'normal' : 'reverse',
        rangeStart: (reverse ? rangeEnd : rangeStart) + '%',
        rangeEnd: (reverse ? rangeStart : rangeEnd) + '%',
      };
      const animation1 = viewTransition.old.animate(keyframes, options);
      const animation2 = viewTransition.new.animate(keyframes, options);
      return () => {
        animation1.cancel();
        animation2.cancel();
      };
    } else {
      // Custom Timeline
      const options = {
        direction: reverse ? 'normal' : 'reverse',
        // We set the delay and duration to represent the span of the range.
        delay: reverse ? rangeEnd : rangeStart,
        duration: reverse ? rangeStart - rangeEnd : rangeEnd - rangeStart,
      };
      const animation1 = viewTransition.old.animate(keyframes, options);
      const animation2 = viewTransition.new.animate(keyframes, options);
      // Let the custom timeline take control of driving the animations.
      const cleanup1 = timeline.animate(animation1);
      const cleanup2 = timeline.animate(animation2);
      return () => {
        animation1.cancel();
        animation2.cancel();
        cleanup1();
        cleanup2();
      };
    }
  }

  function swipeAction() {
    navigate(show ? '/?a' : '/?b');
  }

  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCounter(c => c + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    // Calling a default update should not interrupt ViewTransitions but
    // a flushSync will.
    // Promise.resolve().then(() => {
    //   flushSync(() => {
    // setCounter(c => c + 10);
    //  });
    // });
  }, [show]);

  const [showModal, setShowModal] = useState(false);
  const portal = showModal ? (
    createPortal(
      <div className="portal">
        Portal: {!show ? 'A' : 'B'}
        <ViewTransition>
          <div>{!show ? 'A' : 'B'}</div>
        </ViewTransition>
      </div>,
      document.body
    )
  ) : (
    <button
      onClick={() =>
        startTransition(async () => {
          await sleep(2000);
          setShowModal(true);
        })
      }>
      Show Modal
    </button>
  );

  const exclamation = (
    <ViewTransition
      name="exclamation"
      onShare={onTransition}
      onGestureShare={onGestureTransition}>
      <span>
        <div>!</div>
      </span>
    </ViewTransition>
  );
  return (
    <div className="swipe-recognizer">
      <SwipeRecognizer
        action={swipeAction}
        gesture={direction => {
          addTransitionType(
            direction === 'left' ? 'navigation-forward' : 'navigation-back'
          );
          optimisticNavigate(direction);
        }}
        direction={show ? 'left' : 'right'}>
        <button
          className="button"
          onClick={() => {
            navigate(url === '/?b' ? '/?a' : '/?b');
          }}>
          {url === '/?b' ? 'Goto A' : 'Goto B'}
        </button>
        <ViewTransition default="none">
          <div>
            <ViewTransition>
              <div>
                <ViewTransition default={transitions['slide-on-nav']}>
                  <h1>{!show ? 'A' : 'B' + counter}</h1>
                </ViewTransition>
              </div>
            </ViewTransition>
            <ViewTransition
              default={{
                'navigation-back': transitions['slide-right'],
                'navigation-forward': transitions['slide-left'],
              }}>
              <h1>{!show ? 'A' + counter : 'B'}</h1>
            </ViewTransition>
            {
              // Using url instead of renderedUrl here lets us only update this on commit.
              url === '/?b' ? (
                <div>
                  {a}
                  {b}
                </div>
              ) : (
                <div>
                  {b}
                  {a}
                </div>
              )
            }
            <ViewTransition>
              {show ? (
                <div>hello{exclamation}</div>
              ) : (
                <section>Loading</section>
              )}
            </ViewTransition>
            <p>
              <Id />
            </p>
            {show ? null : (
              <ViewTransition>
                <div>world{exclamation}</div>
              </ViewTransition>
            )}
            <Activity mode={show ? 'visible' : 'hidden'}>
              <ViewTransition>
                <div>!!</div>
              </ViewTransition>
            </Activity>
            <Suspense
              fallback={
                <ViewTransition>
                  <div>
                    <ViewTransition name="shared-reveal">
                      <h2>█████</h2>
                    </ViewTransition>
                    <p>████</p>
                    <p>███████</p>
                    <p>████</p>
                    <p>██</p>
                    <p>██████</p>
                    <p>███</p>
                    <p>████</p>
                  </div>
                </ViewTransition>
              }>
              <ViewTransition>
                <div>
                  <p>these</p>
                  <p>rows</p>
                  <ViewTransition name="shared-reveal">
                    <h2>exist</h2>
                  </ViewTransition>
                  <p>to</p>
                  <p>test</p>
                  <p>scrolling</p>
                  <p>content</p>
                  <p>out</p>
                  <p>of</p>
                  {portal}
                  <p>the</p>
                  <p>viewport</p>
                  <Suspend />
                </div>
              </ViewTransition>
              {show ? <Component /> : null}
            </Suspense>
          </div>
        </ViewTransition>
      </SwipeRecognizer>
      <NestedReveal />
      <NestedParentExit />
    </div>
  );
}
