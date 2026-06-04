import React, {
  ViewTransition,
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
          }}>
          <div className="feed-item-title">{item.title}</div>
        </ViewTransition>
        <p>{item.body}</p>
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
    setNav({selected: item, activeIndex: index});
    startTransition(() => {
      addTransitionType('nav-forward');
    });
  }

  function goBack() {
    const current = selected;
    if (current == null) {
      return;
    }
    const backIndex = items.findIndex(i => i.id === current.id);
    setNav({selected: null, activeIndex: backIndex});
    startTransition(() => {
      addTransitionType('nav-back');
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
                <>
                  {items.map((item, index) => (
                    <FeedItem
                      key={item.id}
                      item={item}
                      index={index}
                      activeIndex={activeIndex}
                      onSelect={goToDetail}
                    />
                  ))}
                </>
              )}
            </div>
          </ViewTransition>
        </SwipeRecognizer>
      </div>
    </div>
  );
}
