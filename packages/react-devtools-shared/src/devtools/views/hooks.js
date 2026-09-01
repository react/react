/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useState,
  useSyncExternalStore,
  useContext,
} from 'react';
import {
  localStorageGetItem,
  localStorageSetItem,
} from 'react-devtools-shared/src/storage';
import {StoreContext, BridgeContext} from './context';
import {sanitizeForParse, smartParse, smartStringify} from '../utils';

type ACTION_RESET = {
  type: 'RESET',
  externalValue: any,
};
type ACTION_UPDATE = {
  type: 'UPDATE',
  editableValue: any,
  externalValue: any,
};

type UseEditableValueAction = ACTION_RESET | ACTION_UPDATE;
type UseEditableValueDispatch = (action: UseEditableValueAction) => void;
type UseEditableValueState = {
  editableValue: any,
  externalValue: any,
  hasPendingChanges: boolean,
  isValid: boolean,
  parsedValue: any,
};

function useEditableValueReducer(
  state: UseEditableValueState,
  action: UseEditableValueAction,
) {
  switch (action.type) {
    case 'RESET':
      return {
        ...state,
        editableValue: smartStringify(action.externalValue),
        externalValue: action.externalValue,
        hasPendingChanges: false,
        isValid: true,
        parsedValue: action.externalValue,
      };
    case 'UPDATE':
      let isNewValueValid = false;
      let newParsedValue;
      try {
        newParsedValue = smartParse(action.editableValue);
        isNewValueValid = true;
      } catch (error) {}
      return {
        ...state,
        editableValue: sanitizeForParse(action.editableValue),
        externalValue: action.externalValue,
        hasPendingChanges:
          smartStringify(action.externalValue) !== action.editableValue,
        isValid: isNewValueValid,
        parsedValue: isNewValueValid ? newParsedValue : state.parsedValue,
      };
    default:
      throw new Error(`Invalid action "${action.type}"`);
  }
}

// Convenience hook for working with an editable value that is validated via JSON.parse.
export function useEditableValue(
  externalValue: any,
): [UseEditableValueState, UseEditableValueDispatch] {
  const [state, dispatch] = useReducer<
    UseEditableValueState,
    UseEditableValueState,
    UseEditableValueAction,
  >(useEditableValueReducer, {
    editableValue: smartStringify(externalValue),
    externalValue,
    hasPendingChanges: false,
    isValid: true,
    parsedValue: externalValue,
  });
  if (!Object.is(state.externalValue, externalValue)) {
    if (!state.hasPendingChanges) {
      dispatch({
        type: 'RESET',
        externalValue,
      });
    } else {
      dispatch({
        type: 'UPDATE',
        editableValue: state.editableValue,
        externalValue,
      });
    }
  }

  return [state, dispatch];
}

export function useIsOverflowing(
  containerRef: {current: HTMLDivElement | null},
  totalChildWidth: number,
): boolean {
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);

  // It's important to use a layout effect, so that we avoid showing a flash of overflowed content.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    // ResizeObserver on the global did not fire for the extension.
    // We need to grab the ResizeObserver from the container's window.
    const ResizeObserver = container.ownerDocument.defaultView.ResizeObserver;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      const contentWidth = entry.contentRect.width;
      setIsOverflowing(
        contentWidth <=
          // We need to treat the box as overflowing when you're just
          // about to overflow.
          // Otherwise you won't be able to resize panes with custom resize handles.
          // Previously we were relying on clientWidth which is already rounded.
          // We don't want to read that again since that would trigger another layout.
          totalChildWidth + 1,
      );
    });

    observer.observe(container);

    return observer.disconnect.bind(observer);
  }, [containerRef, totalChildWidth]);

  return isOverflowing;
}

// Forked from https://usehooks.com/useLocalStorage/
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  onValueSet?: (any, string) => void,
): [T, (value: T | (() => T)) => void] {
  const getValueFromLocalStorage = useCallback(() => {
    try {
      const item = localStorageGetItem(key);
      if (item != null) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.log(error);
    }
    if (typeof initialValue === 'function') {
      return (initialValue as any as () => T)();
    } else {
      return initialValue;
    }
  }, [initialValue, key]);

  const storedValue = useSyncExternalStore(
    useCallback(
      function subscribe(callback) {
        window.addEventListener(key, callback);
        return function unsubscribe() {
          window.removeEventListener(key, callback);
        };
      },
      [key],
    ),
    getValueFromLocalStorage,
  );

  const setValue = useCallback(
    (value: $FlowFixMe) => {
      try {
        const valueToStore =
          value instanceof Function ? (value as any)(storedValue) : value;
        localStorageSetItem(key, JSON.stringify(valueToStore));

        // Notify listeners that this setting has changed.
        window.dispatchEvent(new Event(key));

        if (onValueSet != null) {
          onValueSet(valueToStore, key);
        }
      } catch (error) {
        console.log(error);
      }
    },
    [key, storedValue],
  );

  // Listen for changes to this local storage value made from other windows.
  // This enables the e.g. "⚛ Elements" tab to update in response to changes from "⚛ Settings".
  useLayoutEffect(() => {
    // $FlowFixMe[missing-local-annot]
    const onStorage = event => {
      const newValue = getValueFromLocalStorage();
      if (key === event.key && storedValue !== newValue) {
        setValue(newValue);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [getValueFromLocalStorage, key, storedValue, setValue]);

  return [storedValue, setValue];
}

export function useModalDismissSignal(
  modalRef: {current: HTMLDivElement | null, ...},
  dismissCallback: () => void,
  dismissOnClickOutside?: boolean = true,
): void {
  useEffect(() => {
    if (modalRef.current === null) {
      return () => {};
    }

    const handleRootNodeKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissCallback();
      }
    };

    const handleRootNodeClick: MouseEventHandler = event => {
      if (
        modalRef.current !== null &&
        /* $FlowExpectedError[incompatible-type] Instead of dealing with possibly multiple realms
         and multiple Node references to comply with Flow (e.g. checking with `event.target instanceof Node`)
         just delegate it to contains call */
        !modalRef.current.contains(event.target)
      ) {
        event.stopPropagation();
        event.preventDefault();

        dismissCallback();
      }
    };

    let modalRootNode = null;

    // Delay until after the current call stack is empty,
    // in case this effect is being run while an event is currently bubbling.
    // In that case, we don't want to listen to the pre-existing event.
    let timeoutID: null | TimeoutID = setTimeout(() => {
      timeoutID = null;

      // It's important to listen to the ownerDocument to support the browser extension.
      // Here we use portals to render individual tabs (e.g. Profiler),
      // and the root document might belong to a different window.
      const modalDOMElement = modalRef.current;
      if (modalDOMElement != null) {
        modalRootNode = modalDOMElement.getRootNode();
        modalRootNode.addEventListener('keydown', handleRootNodeKeyDown);
        if (dismissOnClickOutside) {
          modalRootNode.addEventListener('click', handleRootNodeClick, true);
        }
      }
    }, 0);

    return () => {
      if (timeoutID !== null) {
        clearTimeout(timeoutID);
      }

      if (modalRootNode !== null) {
        modalRootNode.removeEventListener('keydown', handleRootNodeKeyDown);
        modalRootNode.removeEventListener('click', handleRootNodeClick, true);
      }
    };
  }, [modalRef, dismissCallback, dismissOnClickOutside]);
}

// Copied from https://github.com/facebook/react/pull/15022
export function useSubscription<Value>({
  getCurrentValue,
  subscribe,
}: {
  getCurrentValue: () => Value,
  subscribe: (callback: Function) => () => void,
}): Value {
  const [state, setState] = useState(() => ({
    getCurrentValue,
    subscribe,
    value: getCurrentValue(),
  }));

  if (
    state.getCurrentValue !== getCurrentValue ||
    state.subscribe !== subscribe
  ) {
    setState({
      getCurrentValue,
      subscribe,
      value: getCurrentValue(),
    });
  }

  useEffect(() => {
    let didUnsubscribe = false;

    const checkForUpdates = () => {
      if (didUnsubscribe) {
        return;
      }

      setState(prevState => {
        if (
          prevState.getCurrentValue !== getCurrentValue ||
          prevState.subscribe !== subscribe
        ) {
          return prevState;
        }

        const value = getCurrentValue();
        if (prevState.value === value) {
          return prevState;
        }

        return {...prevState, value};
      });
    };
    const unsubscribe = subscribe(checkForUpdates);

    checkForUpdates();

    return () => {
      didUnsubscribe = true;
      unsubscribe();
    };
  }, [getCurrentValue, subscribe]);

  return state.value;
}

export function useHighlightHostInstance(): {
  clearHighlightHostInstance: () => void,
  highlightHostInstance: (id: number, scrollIntoView?: boolean) => void,
} {
  const bridge = useContext(BridgeContext);
  const store = useContext(StoreContext);

  const highlightHostInstance = useCallback(
    (id: number, scrollIntoView?: boolean = false) => {
      const element = store.getElementByID(id);
      if (element !== null) {
        const isRoot = element.parentID === 0;
        let displayName = element.displayName;
        if (displayName !== null && element.nameProp !== null) {
          displayName += ` name="${element.nameProp}"`;
        }
        if (isRoot) {
          // Inspect screen
          const elements: Array<{rendererID: number, id: number}> = [];

          for (let i = 0; i < store.roots.length; i++) {
            const rootID = store.roots[i];
            const rendererID = store.getRendererIDForElement(rootID);
            if (rendererID === null) {
              continue;
            }
            elements.push({rendererID, id: rootID});
          }

          bridge.send('highlightHostInstances', {
            displayName,
            hideAfterTimeout: false,
            elements,
            scrollIntoView: scrollIntoView,
          });
        } else {
          const rendererID = store.getRendererIDForElement(id);
          if (rendererID !== null) {
            bridge.send('highlightHostInstance', {
              displayName,
              hideAfterTimeout: false,
              id,
              openBuiltinElementsPanel: false,
              rendererID,
              scrollIntoView: scrollIntoView,
            });
          }
        }
      }
    },
    [store, bridge],
  );

  const clearHighlightHostInstance = useCallback(() => {
    bridge.send('clearHostInstanceHighlight');
  }, [bridge]);

  return {
    highlightHostInstance,
    clearHighlightHostInstance,
  };
}

export function useScrollToHostInstance(): (id: number) => void {
  const bridge = useContext(BridgeContext);
  const store = useContext(StoreContext);

  const scrollToHostInstance = useCallback(
    (id: number) => {
      const element = store.getElementByID(id);
      const rendererID = store.getRendererIDForElement(id);
      if (element !== null && rendererID !== null) {
        bridge.send('scrollToHostInstance', {
          id,
          rendererID,
        });
      }
    },
    [store, bridge],
  );

  return scrollToHostInstance;
}
