import React, {
  useRef,
  useEffect,
  startTransition,
  unstable_startGestureTransition as startGestureTransition,
} from 'react';

import ScrollTimelinePolyfill from 'animation-timelines/scroll-timeline';
import TouchPanTimeline from 'animation-timelines/touch-pan-timeline';

const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
const isSafariMobile =
  ua.indexOf('Safari') !== -1 &&
  (ua.indexOf('iPhone') !== -1 ||
    ua.indexOf('iPad') !== -1 ||
    ua.indexOf('iPod') !== -1);

// Example of a Component that can recognize swipe gestures using a ScrollTimeline
// without scrolling its own content. Allowing it to be used as an inert gesture
// recognizer to drive a View Transition.
export default function SwipeRecognizer({
  action,
  children,
  direction,
  gesture,
}) {
  if (direction == null) {
    direction = 'left';
  }
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';

  const scrollRef = useRef(null);
  const activeGesture = useRef(null);
  const touchTimeline = useRef(null);

  function onTouchStart(event) {
    if (!isSafariMobile && typeof ScrollTimeline === 'function') {
      // If not Safari and native ScrollTimeline is supported, then we use that.
      return;
    }
    if (touchTimeline.current) {
      // We can catch the gesture before it settles.
      return;
    }
    const scrollElement = scrollRef.current;
    const bounds =
      axis === 'x' ? scrollElement.clientWidth : scrollElement.clientHeight;
    const range =
      direction === 'left' || direction === 'up' ? [bounds, 0] : [0, -bounds];
    const timeline = new TouchPanTimeline({
      touch: event,
      source: scrollElement,
      axis: axis,
      range: range,
      snap: range,
    });
    touchTimeline.current = timeline;
    timeline.settled.then(() => {
      if (touchTimeline.current !== timeline) {
        return;
      }
      touchTimeline.current = null;
      const changed =
        direction === 'left' || direction === 'up'
          ? timeline.currentTime < 50
          : timeline.currentTime > 50;
      onGestureEnd(changed);
    });
  }

  function onTouchEnd() {
    if (activeGesture.current === null) {
      // If we didn't start a gesture before we release, we can release our
      // timeline.
      touchTimeline.current = null;
    }
  }

  function onScroll() {
    if (activeGesture.current !== null) {
      return;
    }

    let scrollTimeline;
    if (touchTimeline.current) {
      // We're in a polyfilled touch gesture. Let's use that timeline instead.
      scrollTimeline = touchTimeline.current;
    } else if (typeof ScrollTimeline === 'function') {
      // eslint-disable-next-line no-undef
      scrollTimeline = new ScrollTimeline({
        source: scrollRef.current,
        axis: axis,
      });
    } else {
      scrollTimeline = new ScrollTimelinePolyfill({
        source: scrollRef.current,
        axis: axis,
      });
    }
    activeGesture.current = startGestureTransition(
      scrollTimeline,
      () => {
        gesture(direction);
      },
      direction === 'left' || direction === 'up'
        ? {
            rangeStart: 100,
            rangeEnd: 0,
          }
        : {
            rangeStart: 0,
            rangeEnd: 100,
          }
    );
  }
  function onGestureEnd(changed) {
    // We cancel the gesture before invoking side-effects to allow the gesture lane to fully commit
    // before scheduling new updates.
    if (activeGesture.current !== null) {
      const cancelGesture = activeGesture.current;
      activeGesture.current = null;
      cancelGesture();
    }
    if (changed) {
      // Trigger side-effects
      startTransition(action);
    }
  }
  function onScrollEnd() {
    if (touchTimeline.current) {
      // We have a touch gesture controlling the swipe.
      return;
    }
    let changed;
    const scrollElement = scrollRef.current;
    if (axis === 'x') {
      const halfway =
        (scrollElement.scrollWidth - scrollElement.clientWidth) / 2;
      changed =
        direction === 'left'
          ? scrollElement.scrollLeft < halfway
          : scrollElement.scrollLeft > halfway;
    } else {
      const halfway =
        (scrollElement.scrollHeight - scrollElement.clientHeight) / 2;
      changed =
        direction === 'up'
          ? scrollElement.scrollTop < halfway
          : scrollElement.scrollTop > halfway;
    }
    onGestureEnd(changed);
  }

  useEffect(() => {
    const scrollElement = scrollRef.current;
    switch (direction) {
      case 'left':
        scrollElement.scrollLeft =
          scrollElement.scrollWidth - scrollElement.clientWidth;
        break;
      case 'right':
        scrollElement.scrollLeft = 0;
        break;
      case 'up':
        scrollElement.scrollTop =
          scrollElement.scrollHeight - scrollElement.clientHeight;
        break;
      case 'down':
        scrollElement.scrollTop = 0;
        break;
      default:
        break;
    }
  }, [direction]);

  const scrollStyle = {
    position: 'relative',
    padding: '0px',
    margin: '0px',
    border: '0px',
    width: axis === 'x' ? '100%' : null,
    height: axis === 'y' ? '100%' : null,
    overflow: 'scroll hidden',
    // Disable overscroll on Safari which moves the sticky content.
    // Unfortunately, this also means that we disable chaining. We should only disable
    // it if the parent is not scrollable in this axis.
    overscrollBehaviorX: axis === 'x' ? 'none' : 'auto',
    overscrollBehaviorY: axis === 'y' ? 'none' : 'auto',
    scrollSnapType: axis + ' mandatory',
    scrollbarWidth: 'none',
  };

  const overScrollStyle = {
    position: 'relative',
    padding: '0px',
    margin: '0px',
    border: '0px',
    width: axis === 'x' ? '200%' : null,
    height: axis === 'y' ? '200%' : null,
  };

  const snapStartStyle = {
    position: 'absolute',
    padding: '0px',
    margin: '0px',
    border: '0px',
    width: axis === 'x' ? '50%' : '100%',
    height: axis === 'y' ? '50%' : '100%',
    left: '0px',
    top: '0px',
    scrollSnapAlign: 'center',
  };

  const snapEndStyle = {
    position: 'absolute',
    padding: '0px',
    margin: '0px',
    border: '0px',
    width: axis === 'x' ? '50%' : '100%',
    height: axis === 'y' ? '50%' : '100%',
    right: '0px',
    bottom: '0px',
    scrollSnapAlign: 'center',
  };

  // By placing the content in a sticky box we ensure that it doesn't move when
  // we scroll. Unless done so by the View Transition.
  const stickyStyle = {
    position: 'sticky',
    padding: '0px',
    margin: '0px',
    border: '0px',
    left: '0px',
    top: '0px',
    width: axis === 'x' ? '50%' : null,
    height: axis === 'y' ? '50%' : null,
    overflow: 'hidden',
  };

  return (
    <div
      style={scrollStyle}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onScroll={onScroll}
      onScrollEnd={onScrollEnd}
      ref={scrollRef}>
      <div style={overScrollStyle}>
        <div style={snapStartStyle} />
        <div style={snapEndStyle} />
        <div style={stickyStyle}>{children}</div>
      </div>
    </div>
  );
}
