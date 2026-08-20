/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, useContext, useEffect} from 'react';
import {ModalDialogContext} from './ModalDialog';
import {StoreContext} from './context';
import {currentBridgeProtocol} from 'react-devtools-shared/src/bridge';
import Button from './Button';
import ButtonIcon from './ButtonIcon';
import {copy} from 'clipboard-js';
import styles from './UnsupportedBridgeProtocolDialog.css';
import {withPermissionsCheck} from 'react-devtools-shared/src/frontend/utils/withPermissionsCheck';

import type {BridgeProtocol} from 'react-devtools-shared/src/bridge';

const DEVTOOLS_VERSION = process.env.DEVTOOLS_VERSION;
const INSTRUCTIONS_FB_URL =
  'https://fb.me/devtools-unsupported-bridge-protocol';
const MODAL_DIALOG_ID = 'UnsupportedBridgeProtocolDialog';

export default function UnsupportedBridgeProtocolDialog(_: {}): null {
  const {dialogs, dispatch} = useContext(ModalDialogContext);
  const store = useContext(StoreContext);

  const isVisible = !!dialogs.find(dialog => dialog.id === MODAL_DIALOG_ID);

  useEffect(() => {
    const updateDialog = () => {
      if (!isVisible) {
        if (store.unsupportedBridgeProtocolDetected) {
          dispatch({
            canBeDismissed: false,
            id: MODAL_DIALOG_ID,
            type: 'SHOW',
            content: (
              <DialogContent unsupportedBridgeProtocol={store.bridgeProtocol} />
            ),
          });
        }
      } else {
        if (!store.unsupportedBridgeProtocolDetected) {
          dispatch({
            type: 'HIDE',
            id: MODAL_DIALOG_ID,
          });
        }
      }
    };

    updateDialog();

    store.addListener('unsupportedBridgeProtocolDetected', updateDialog);
    return () => {
      store.removeListener('unsupportedBridgeProtocolDetected', updateDialog);
    };
  }, [isVisible, store]);

  return null;
}

function DialogContent({
  unsupportedBridgeProtocol,
}: {
  unsupportedBridgeProtocol: BridgeProtocol,
}) {
  const {version, minNpmVersion, maxNpmVersion} = unsupportedBridgeProtocol;

  let instructions;
  if (maxNpmVersion === null) {
    const upgradeInstructions = `npm i -g react-devtools@^${minNpmVersion}`;
    instructions = (
      <>
        <p className={styles.Paragraph}>
          To fix this, upgrade the DevTools NPM package:
        </p>
        <pre className={styles.NpmCommand}>
          {upgradeInstructions}
          <Button
            onClick={withPermissionsCheck(
              {permissions: ['clipboardWrite']},
              () => copy(upgradeInstructions),
            )}
            title="Copy upgrade command to clipboard">
            <ButtonIcon type="copy" />
          </Button>
        </pre>
      </>
    );
  } else {
    const downgradeInstructions = `npm i -g react-devtools@${maxNpmVersion}`;
    instructions = (
      <>
        <p className={styles.Paragraph}>
          To fix this, downgrade the DevTools NPM package:
        </p>
        <pre className={styles.NpmCommand}>
          {downgradeInstructions}
          <Button
            onClick={withPermissionsCheck(
              {permissions: ['clipboardWrite']},
              () => copy(downgradeInstructions),
            )}
            title="Copy downgrade command to clipboard">
            <ButtonIcon type="copy" />
          </Button>
        </pre>
      </>
    );
  }

  return (
    <Fragment>
      <div className={styles.Column}>
        <div className={styles.Title}>Unsupported DevTools backend version</div>
        <p className={styles.Paragraph}>
          You are running <code>react-devtools</code> version{' '}
          <span className={styles.Version}>{DEVTOOLS_VERSION}</span>.
        </p>
        <p className={styles.Paragraph}>
          This requires bridge protocol{' '}
          <span className={styles.Version}>
            version {currentBridgeProtocol.version}
          </span>
          . However the current backend version uses bridge protocol{' '}
          <span className={styles.Version}>version {version}</span>.
        </p>
        {instructions}
        <p className={styles.Paragraph}>
          Or{' '}
          <a className={styles.Link} href={INSTRUCTIONS_FB_URL} target="_blank">
            click here
          </a>{' '}
          for more information.
        </p>
      </div>
    </Fragment>
  );
}
