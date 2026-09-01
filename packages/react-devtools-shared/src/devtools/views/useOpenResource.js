/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactFunctionLocation, ReactCallSite} from 'shared/ReactTypes';

import {useCallback, useContext, useSyncExternalStore} from 'react';

import ViewElementSourceContext from './Components/ViewElementSourceContext';

import {getAlwaysOpenInEditor} from '../../utils';
import useEditorURL from './useEditorURL';
import {LOCAL_STORAGE_ALWAYS_OPEN_IN_EDITOR} from '../../constants';

import {checkConditions} from './Editor/utils';

const useOpenResource = (
  source: null | ReactFunctionLocation | ReactCallSite,
  symbolicatedSource: null | ReactFunctionLocation | ReactCallSite,
): [
  boolean, // isEnabled
  () => void, // Open Resource
] => {
  const {canViewElementSourceFunction, viewElementSourceFunction} = useContext(
    ViewElementSourceContext,
  );

  const editorURL = useEditorURL();

  const alwaysOpenInEditor = useSyncExternalStore(
    useCallback(function subscribe(callback) {
      window.addEventListener(LOCAL_STORAGE_ALWAYS_OPEN_IN_EDITOR, callback);
      return function unsubscribe() {
        window.removeEventListener(
          LOCAL_STORAGE_ALWAYS_OPEN_IN_EDITOR,
          callback,
        );
      };
    }, []),
    getAlwaysOpenInEditor,
  );

  // First check if this link is eligible for being open directly in the configured editor.
  const openInEditor =
    alwaysOpenInEditor && source !== null
      ? checkConditions(editorURL, symbolicatedSource || source)
      : null;
  // In some cases (e.g. FB internal usage) the standalone shell might not be able to view the source.
  // To detect this case, we defer to an injected helper function (if present).
  const linkIsEnabled =
    (openInEditor !== null && !openInEditor.shouldDisableButton) ||
    (viewElementSourceFunction != null &&
      source != null &&
      (canViewElementSourceFunction == null ||
        canViewElementSourceFunction(source, symbolicatedSource)));

  const viewSource = useCallback(() => {
    if (openInEditor !== null && !openInEditor.shouldDisableButton) {
      // If we have configured to always open in the code editor, we do so if we can.
      // Otherwise, we fallback to open in the local editor if possible (e.g. non-file urls).
      window.open(openInEditor.url);
    } else if (viewElementSourceFunction != null && source != null) {
      viewElementSourceFunction(source, symbolicatedSource);
    }
  }, [openInEditor, source, symbolicatedSource]);

  return [linkIsEnabled, viewSource];
};

export default useOpenResource;
