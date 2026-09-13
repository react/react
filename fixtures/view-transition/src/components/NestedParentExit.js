import React, {
  ViewTransition,
  Suspense,
  use,
  useState,
  useOptimistic,
  startTransition,
  addTransitionType,
} from 'react';
import SwipeRecognizer from './SwipeRecognizer.js';
import './NestedParentExit.css';

const items = [
  {id: 1, title: 'First Post', body: 'Hello from the first post.'},
  {id: 2, title: 'Second Post', body: 'Hello from the second post.'},
  {id: 3, title: 'Third Post', body: 'Hello from the third post.'},
];

let feedRevealPromise = null;

export function resetFeedReveal() {
  feedRevealPromise = null;
}

function FeedReveal() {
  if (feedRevealPromise === null) {
    feedRevealPromise = new Promise(resolve => setTimeout(resolve, 1000));
  }
  use(feedRevealPromise);
  return null;
}

function FeedSkeleton() {
  return (
    <ViewTransition exit="nested-feed-exit">
      <div className="nested-feed">
        {items.map(item => (
          // Mirrors FeedItem: each skeleton row relays the exit (level 1), and
          // its title/body placeholders relay again (level 2) so they animate
          // out separately from the row — up and to the right. This exercises
          // the nested parentExit relay through the SSR streaming reveal.
          <ViewTransition key={item.id} parentExit="nested-exit-left">
            <div className="feed-item feed-item-skeleton">
              <ViewTransition parentExit="nested-title-exit-up">
                <div className="feed-item-title skeleton-line skeleton-title" />
              </ViewTransition>
              <ViewTransition parentExit="nested-body-exit-right">
                <div className="skeleton-line skeleton-body" />
              </ViewTransition>
            </div>
          </ViewTransition>
        ))}
      </div>
    </ViewTransition>
  );
}

function logGestureParent(kind, title, _timeline, _options, _instance, types) {
  // eslint-disable-next-line no-console
  console.log(`[NestedParentExit] onGestureParent${kind}`, title, types);
}

function FeedItem({item, index, activeIndex, onSelect}) {
  const isActive = activeIndex === index;

  return (
    <ViewTransition
      name={'nested-post-' + item.id}
      share={{
        'nav-forward': 'nested-shared-post-forward',
        'nav-back': 'nested-shared-post-back',
      }}
      parentExit={isActive ? undefined : 'nested-exit-left'}
      parentEnter={isActive ? undefined : 'nested-enter-from-left'}
      onGestureParentExit={(...args) =>
        logGestureParent('Exit', item.title, ...args)
      }
      onGestureParentEnter={(...args) =>
        logGestureParent('Enter', item.title, ...args)
      }>
      <div className="feed-item" onClick={() => onSelect(item, index)}>
        <ViewTransition
          name={'nested-title-' + item.id}
          share={{
            'nav-forward': 'nested-shared-inner-forward',
            'nav-back': 'nested-shared-inner-back',
          }}
          parentExit={isActive ? undefined : 'nested-title-exit-up'}
          parentEnter={isActive ? undefined : 'nested-title-enter-from-up'}>
          <div className="feed-item-title">{item.title}</div>
        </ViewTransition>
        <ViewTransition
          parentExit={isActive ? undefined : 'nested-body-exit-right'}
          parentEnter={isActive ? undefined : 'nested-body-enter-from-right'}>
          <p>{item.body}</p>
        </ViewTransition>
      </div>
    </ViewTransition>
  );
}

function Detail({item, onBack}) {
  return (
    <ViewTransition
      name={'nested-post-' + item.id}
      share={{
        'nav-forward': 'nested-shared-post-forward',
        'nav-back': 'nested-shared-post-back',
      }}>
      <div className="detail-view">
        <ViewTransition
          enter="nested-back-btn-enter"
          exit="nested-back-btn-exit">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        </ViewTransition>
        <ViewTransition
          name={'nested-title-' + item.id}
          share={{
            'nav-forward': 'nested-shared-inner-forward',
            'nav-back': 'nested-shared-inner-back',
          }}>
          <div className="feed-item-title">{item.title}</div>
        </ViewTransition>
        <p>{item.body}</p>
      </div>
    </ViewTransition>
  );
}

const initialNav = {selected: null, activeIndex: null};

export default function NestedParentExit() {
  const [nav, setNav] = useState(initialNav);
  const [optimisticNav, navigateByGesture] = useOptimistic(
    nav,
    (state, direction) => {
      if (direction === 'left' && state.selected === null) {
        return {selected: items[0], activeIndex: 0};
      }
      if (direction === 'right' && state.selected !== null) {
        return {
          selected: null,
          activeIndex:
            state.activeIndex ??
            items.findIndex(i => i.id === state.selected.id),
        };
      }
      return state;
    }
  );

  const {selected, activeIndex} = optimisticNav;

  function goToDetail(item, index) {
    startTransition(() => {
      addTransitionType('nav-forward');
      setNav({selected: item, activeIndex: index});
    });
  }

  function goBack() {
    const current = selected;
    if (current == null) {
      return;
    }
    const backIndex = items.findIndex(i => i.id === current.id);
    startTransition(() => {
      addTransitionType('nav-back');
      setNav({selected: null, activeIndex: backIndex});
    });
  }

  function swipeAction() {
    if (nav.selected === null) {
      goToDetail(items[0], 0);
    } else {
      goBack();
    }
  }

  return (
    <div className="nested-parent-exit">
      <p className="nested-parent-exit-label">
        Parent Exit/Enter — click a post or swipe (scroll the strip below)
      </p>
      <div className="nested-parent-exit-swipe swipe-recognizer">
        <SwipeRecognizer
          action={swipeAction}
          gesture={direction => {
            addTransitionType(
              direction === 'left' ? 'nav-forward' : 'nav-back'
            );
            navigateByGesture(direction);
          }}
          direction={selected ? 'right' : 'left'}>
          <ViewTransition key={selected ? 'detail' : 'feed'} update="none">
            <div className="nested-parent-exit-panel">
              {selected ? (
                <Detail item={selected} onBack={goBack} />
              ) : (
                <Suspense fallback={<FeedSkeleton />}>
                  {/* The entering ViewTransition is the direct child of the
                      Suspense content, so it activates an enter scope and the
                      feed items below relay parentEnter (emitting
                      vt-parent-enter annotations in Fizz). */}
                  <ViewTransition enter="nested-feed-enter">
                    <div className="nested-feed">
                      {items.map((item, index) => (
                        <FeedItem
                          key={item.id}
                          item={item}
                          index={index}
                          activeIndex={activeIndex}
                          onSelect={goToDetail}
                        />
                      ))}
                      <FeedReveal />
                    </div>
                  </ViewTransition>
                </Suspense>
              )}
            </div>
          </ViewTransition>
        </SwipeRecognizer>
      </div>
    </div>
  );
}
