/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';
import * as React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import Button from './Button';
import {useModalDismissSignal} from './hooks';

import styles from './ModalDialog.css';

type ID = any;

type DIALOG_ACTION_HIDE = {
  type: 'HIDE',
  id: ID,
};
type DIALOG_ACTION_SHOW = {
  type: 'SHOW',
  canBeDismissed?: boolean,
  content: React$Node,
  id: ID,
  title?: React$Node | null,
};

type Action = DIALOG_ACTION_HIDE | DIALOG_ACTION_SHOW;

type Dispatch = (action: Action) => void;

type Dialog = {
  canBeDismissed: boolean,
  content: React$Node | null,
  id: ID,
  title: React$Node | null,
};

type State = {
  dialogs: Array<Dialog>,
};

type ModalDialogContextType = {
  ...State,
  dispatch: Dispatch,
};

const ModalDialogContext: ReactContext<ModalDialogContextType> =
  createContext<ModalDialogContextType>(null as any as ModalDialogContextType);
ModalDialogContext.displayName = 'ModalDialogContext';

function dialogReducer(state: State, action: Action) {
  switch (action.type) {
    case 'HIDE':
      return {
        dialogs: state.dialogs.filter(dialog => dialog.id !== action.id),
      };
    case 'SHOW':
      return {
        dialogs: [
          ...state.dialogs,
          {
            canBeDismissed: action.canBeDismissed !== false,
            content: action.content,
            id: action.id,
            title: action.title || null,
          } as Dialog,
        ],
      };
    default:
      throw new Error(`Invalid action "${action.type}"`);
  }
}

type Props = {
  children: React$Node,
};

function ModalDialogContextController({children}: Props): React.Node {
  const [state, dispatch] = useReducer<State, State, Action>(dialogReducer, {
    dialogs: [],
  });

  const value = useMemo<ModalDialogContextType>(
    () => ({
      dialogs: state.dialogs,
      dispatch,
    }),
    [state, dispatch],
  );

  return (
    <ModalDialogContext.Provider value={value}>
      {children}
    </ModalDialogContext.Provider>
  );
}

function ModalDialog(_: {}): React.Node {
  const {dialogs, dispatch} = useContext(ModalDialogContext);

  if (dialogs.length === 0) {
    return null;
  }

  return (
    <div className={styles.Background}>
      {dialogs.map(dialog => (
        <ModalDialogImpl
          key={dialog.id}
          canBeDismissed={dialog.canBeDismissed}
          content={dialog.content}
          dispatch={dispatch}
          id={dialog.id}
          title={dialog.title}
        />
      ))}
    </div>
  );
}

function ModalDialogImpl({
  canBeDismissed,
  content,
  dispatch,
  id,
  title,
}: {
  canBeDismissed: boolean,
  content: React$Node | null,
  dispatch: Dispatch,
  id: ID,
  title: React$Node | null,
}) {
  const dismissModal = useCallback(() => {
    if (canBeDismissed) {
      dispatch({type: 'HIDE', id});
    }
  }, [canBeDismissed, dispatch]);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // It's important to trap click events within the dialog,
  // so the dismiss hook will use it for click hit detection.
  // Because multiple tabs may be showing this ModalDialog,
  // the normal `dialog.contains(target)` check would fail on a background tab.
  useModalDismissSignal(dialogRef, dismissModal, false);

  // Clicks on the dialog should not bubble.
  // This way we can dismiss by listening to clicks on the background.
  const handleDialogClick = (event: any) => {
    event.stopPropagation();

    // It is important that we don't also prevent default,
    // or clicks within the dialog (e.g. on links) won't work.
  };

  return (
    <div ref={dialogRef} className={styles.Dialog} onClick={handleDialogClick}>
      {title !== null && <div className={styles.Title}>{title}</div>}
      {content}
      {canBeDismissed && (
        <div className={styles.Buttons}>
          <Button
            autoFocus={true}
            className={styles.Button}
            onClick={dismissModal}>
            Okay
          </Button>
        </div>
      )}
    </div>
  );
}

export {ModalDialog, ModalDialogContext, ModalDialogContextController};
