/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, useContext, useEffect, useState} from 'react';
import {ModalDialogContext} from './ModalDialog';
import {StoreContext} from './context';
import {UNSUPPORTED_VERSION_URL} from '../constants';

import styles from './UnsupportedVersionDialog.css';

type DAILOG_STATE = 'dialog-not-shown' | 'show-dialog' | 'dialog-shown';

export default function UnsupportedVersionDialog(_: {}): null {
  const {dispatch} = useContext(ModalDialogContext);
  const store = useContext(StoreContext);
  const [state, setState] = useState<DAILOG_STATE>('dialog-not-shown');

  useEffect(() => {
    if (state === 'dialog-not-shown') {
      const showDialog = () => {
        setState('show-dialog');
        dispatch({
          canBeDismissed: true,
          id: 'UnsupportedVersionDialog',
          type: 'SHOW',
          content: <DialogContent />,
        });
      };

      if (store.unsupportedRendererVersionDetected) {
        showDialog();
      } else {
        store.addListener('unsupportedRendererVersionDetected', showDialog);
        return () => {
          store.removeListener(
            'unsupportedRendererVersionDetected',
            showDialog,
          );
        };
      }
    }
  }, [state, store]);

  return null;
}

function DialogContent(_: {}) {
  return (
    <Fragment>
      <div className={styles.Row}>
        <div>
          <div className={styles.Title}>Unsupported React version detected</div>
          <p>
            This version of React DevTools supports React DOM v15+ and React
            Native v61+.
          </p>
          <p>
            In order to use DevTools with an older version of React, you'll need
            to{' '}
            <a
              className={styles.ReleaseNotesLink}
              target="_blank"
              rel="noopener noreferrer"
              href={UNSUPPORTED_VERSION_URL}>
              install an older version of the extension
            </a>
            .
          </p>
        </div>
      </div>
    </Fragment>
  );
}
