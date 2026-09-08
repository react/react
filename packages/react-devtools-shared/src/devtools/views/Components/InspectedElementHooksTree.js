/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {copy} from 'clipboard-js';
import * as React from 'react';
import {useCallback, useContext, useState} from 'react';
import {BridgeContext, StoreContext} from '../context';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import Toggle from '../Toggle';
import ExpandCollapseToggle from './ExpandCollapseToggle';
import KeyValue from './KeyValue';
import {getMetaValueLabel, serializeHooksForCopy} from '../utils';
import Store from '../../store';
import styles from './InspectedElementHooksTree.css';
import {meta} from '../../../hydration';
import {getHookSourceLocationKey} from 'react-devtools-shared/src/hookSourceLocation';
import HookNamesModuleLoaderContext from 'react-devtools-shared/src/devtools/views/Components/HookNamesModuleLoaderContext';
import isArray from 'react-devtools-shared/src/isArray';

import type {InspectedElement} from 'react-devtools-shared/src/frontend/types';
import type {HooksNode, HooksTree} from 'react-debug-tools/src/ReactDebugHooks';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type {HookNames} from 'react-devtools-shared/src/frontend/types';
import type {Element} from 'react-devtools-shared/src/frontend/types';
import type {ToggleParseHookNames} from './InspectedElementContext';

type HooksTreeViewProps = {
  bridge: FrontendBridge,
  element: Element,
  hookNames: HookNames | null,
  inspectedElement: InspectedElement,
  parseHookNames: boolean,
  store: Store,
  toggleParseHookNames: ToggleParseHookNames,
};

export function InspectedElementHooksTree({
  bridge,
  element,
  hookNames,
  inspectedElement,
  parseHookNames,
  store,
  toggleParseHookNames,
}: HooksTreeViewProps): React.Node {
  const {hooks, id} = inspectedElement;

  // Changing parseHookNames is done in a transition, because it suspends.
  // This value is done outside of the transition, so the UI toggle feels responsive.
  const [parseHookNamesOptimistic, setParseHookNamesOptimistic] =
    useState(parseHookNames);
  const handleChange = () => {
    setParseHookNamesOptimistic(!parseHookNames);
    toggleParseHookNames();
  };

  const hookNamesModuleLoader = useContext(HookNamesModuleLoaderContext);

  const hookParsingFailed = parseHookNames && hookNames === null;

  let toggleTitle;
  if (hookParsingFailed) {
    toggleTitle = 'Hook parsing failed';
  } else if (parseHookNames) {
    toggleTitle = 'Parsing hook names ...';
  } else {
    toggleTitle = 'Parse hook names (may be slow)';
  }

  const handleCopy = () => copy(serializeHooksForCopy(hooks));

  if (hooks === null) {
    return null;
  } else {
    return (
      <div data-testname="InspectedElementHooksTree">
        <div className={styles.HeaderRow}>
          <div className={styles.Header}>hooks</div>
          {typeof hookNamesModuleLoader === 'function' &&
            (!parseHookNames || hookParsingFailed) && (
              <Toggle
                className={hookParsingFailed ? styles.ToggleError : null}
                isChecked={parseHookNamesOptimistic}
                isDisabled={parseHookNamesOptimistic || hookParsingFailed}
                onChange={handleChange}
                testName="LoadHookNamesButton"
                title={toggleTitle}>
                <ButtonIcon type="parse-hook-names" />
              </Toggle>
            )}
          <Button onClick={handleCopy} title="Copy to clipboard">
            <ButtonIcon type="copy" />
          </Button>
        </div>
        <InnerHooksTreeView
          hookNames={hookNames}
          hooks={hooks}
          id={id}
          element={element}
          inspectedElement={inspectedElement}
          path={[]}
        />
      </div>
    );
  }
}

type InnerHooksTreeViewProps = {
  element: Element,
  hookNames: HookNames | null,
  hooks: HooksTree,
  id: number,
  inspectedElement: InspectedElement,
  path: Array<string | number>,
};

export function InnerHooksTreeView({
  element,
  hookNames,
  hooks,
  id,
  inspectedElement,
  path,
}: InnerHooksTreeViewProps): React.Node {
  return hooks.map((hook, index) => (
    <HookView
      key={index}
      element={element}
      hook={hooks[index]}
      hookNames={hookNames}
      id={id}
      inspectedElement={inspectedElement}
      path={path.concat([index])}
    />
  ));
}

type HookViewProps = {
  element: Element,
  hook: HooksNode,
  hookNames: HookNames | null,
  id: number,
  inspectedElement: InspectedElement,
  path: Array<string | number>,
};

function HookView({
  element,
  hook,
  hookNames,
  id,
  inspectedElement,
  path,
}: HookViewProps) {
  const {canEditHooks, canEditHooksAndDeletePaths, canEditHooksAndRenamePaths} =
    inspectedElement;
  const {id: hookID, isStateEditable, subHooks, value} = hook;

  const isReadOnly = hookID == null || !isStateEditable;

  const canDeletePaths = !isReadOnly && canEditHooksAndDeletePaths;
  const canEditValues = !isReadOnly && canEditHooks;
  const canRenamePaths = !isReadOnly && canEditHooksAndRenamePaths;

  const bridge = useContext(BridgeContext);
  const store = useContext(StoreContext);

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleIsOpen = useCallback(
    () => setIsOpen(prevIsOpen => !prevIsOpen),
    [],
  );

  if (hook.hasOwnProperty(meta.inspected)) {
    // This Hook is too deep and hasn't been hydrated.
    if (__DEV__) {
      console.warn('Unexpected dehydrated hook; this is a DevTools error.');
    }
    return (
      <div className={styles.Hook}>
        <div className={styles.NameValueRow}>
          <span className={styles.TruncationIndicator}>...</span>
        </div>
      </div>
    );
  }

  // Certain hooks are not editable at all (as identified by react-debug-tools).
  // Primitive hook names (e.g. the "State" name for useState) are also never editable.
  // $FlowFixMe[missing-local-annot]
  const canRenamePathsAtDepth = depth => isStateEditable && depth > 1;

  const isCustomHook = subHooks.length > 0;

  let name = hook.name;
  if (hookID !== null) {
    name = (
      <>
        <span className={styles.PrimitiveHookNumber}>{hookID + 1}</span>
        {name}
      </>
    );
  }

  const type = typeof value;

  let displayValue;
  let isComplexDisplayValue = false;

  const hookSource = hook.hookSource;
  const hookName =
    hookNames != null && hookSource != null
      ? hookNames.get(getHookSourceLocationKey(hookSource))
      : null;
  const hookDisplayName = hookName ? (
    <>
      {name}
      {
        // $FlowFixMe[constant-condition]
        !!hookName && <span className={styles.HookName}>({hookName})</span>
      }
    </>
  ) : (
    name
  );

  // Format data for display to mimic the props/state/context for now.
  if (type === 'string') {
    displayValue = `"${value as any as string}"`;
  } else if (type === 'boolean') {
    displayValue = value ? 'true' : 'false';
  } else if (type === 'number') {
    displayValue = value;
  } else if (value === null) {
    displayValue = 'null';
  } else if (value === undefined) {
    displayValue = null;
  } else if (isArray(value)) {
    isComplexDisplayValue = true;
    displayValue = 'Array';
  } else if (type === 'object') {
    isComplexDisplayValue = true;
    displayValue = 'Object';
  }

  if (isCustomHook) {
    const subHooksView = isArray(subHooks) ? (
      <InnerHooksTreeView
        element={element}
        hooks={subHooks}
        hookNames={hookNames}
        id={id}
        inspectedElement={inspectedElement}
        path={path.concat(['subHooks'])}
      />
    ) : (
      <KeyValue
        alphaSort={false}
        bridge={bridge}
        canDeletePaths={canDeletePaths}
        canEditValues={canEditValues}
        canRenamePaths={canRenamePaths}
        canRenamePathsAtDepth={canRenamePathsAtDepth}
        depth={1}
        element={element}
        hookID={hookID}
        hookName={hookName}
        inspectedElement={inspectedElement}
        name="subHooks"
        path={path.concat(['subHooks'])}
        store={store}
        type="hooks"
        value={subHooks}
      />
    );

    if (isComplexDisplayValue) {
      return (
        <div className={styles.Hook}>
          <div className={styles.NameValueRow}>
            <ExpandCollapseToggle isOpen={isOpen} setIsOpen={setIsOpen} />
            <span
              onClick={toggleIsOpen}
              className={name !== '' ? styles.Name : styles.NameAnonymous}>
              {hookDisplayName || 'Anonymous'}
            </span>
            <span className={styles.Value} onClick={toggleIsOpen}>
              {isOpen || getMetaValueLabel(value)}
            </span>
          </div>
          <div className={styles.Children} hidden={!isOpen}>
            <KeyValue
              alphaSort={false}
              bridge={bridge}
              canDeletePaths={canDeletePaths}
              canEditValues={canEditValues}
              canRenamePaths={canRenamePaths}
              canRenamePathsAtDepth={canRenamePathsAtDepth}
              depth={1}
              element={element}
              hookID={hookID}
              hookName={hookName}
              inspectedElement={inspectedElement}
              name="DebugValue"
              path={path.concat(['value'])}
              pathRoot="hooks"
              store={store}
              value={value}
            />
            {subHooksView}
          </div>
        </div>
      );
    } else {
      return (
        <div className={styles.Hook}>
          <div className={styles.NameValueRow}>
            <ExpandCollapseToggle isOpen={isOpen} setIsOpen={setIsOpen} />
            <span
              onClick={toggleIsOpen}
              className={name !== '' ? styles.Name : styles.NameAnonymous}>
              {hookDisplayName || 'Anonymous'}
            </span>{' '}
            <span className={styles.Value} onClick={toggleIsOpen}>
              {displayValue}
            </span>
          </div>
          <div className={styles.Children} hidden={!isOpen}>
            {subHooksView}
          </div>
        </div>
      );
    }
  } else {
    if (isComplexDisplayValue) {
      return (
        <div className={styles.Hook}>
          <KeyValue
            alphaSort={false}
            bridge={bridge}
            canDeletePaths={canDeletePaths}
            canEditValues={canEditValues}
            canRenamePaths={canRenamePaths}
            canRenamePathsAtDepth={canRenamePathsAtDepth}
            depth={1}
            element={element}
            hookID={hookID}
            hookName={hookName}
            inspectedElement={inspectedElement}
            name={name}
            path={path.concat(['value'])}
            pathRoot="hooks"
            store={store}
            value={value}
          />
        </div>
      );
    } else {
      return (
        <div className={styles.Hook}>
          <KeyValue
            alphaSort={false}
            bridge={bridge}
            canDeletePaths={false}
            canEditValues={canEditValues}
            canRenamePaths={false}
            depth={1}
            element={element}
            hookID={hookID}
            hookName={hookName}
            inspectedElement={inspectedElement}
            name={name}
            path={path.concat(['value'])}
            pathRoot="hooks"
            store={store}
            value={value}
          />
        </div>
      );
    }
  }
}

export default React.memo(InspectedElementHooksTree) as component(
  ...props: HookViewProps
);
