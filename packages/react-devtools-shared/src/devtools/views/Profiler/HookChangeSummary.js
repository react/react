/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {
  useContext,
  useMemo,
  useCallback,
  memo,
  useState,
  useEffect,
} from 'react';
import styles from './HookChangeSummary.css';
import ButtonIcon from '../ButtonIcon';
import {InspectedElementContext} from '../Components/InspectedElementContext';
import {StoreContext} from '../context';

import {getAlreadyLoadedHookNames} from 'react-devtools-shared/src/hookNamesCache';
import {getHookSourceLocationKey} from 'react-devtools-shared/src/hookSourceLocation';
import Toggle from '../Toggle';
import type {HooksNode} from 'react-debug-tools/src/ReactDebugHooks';
import type {ChangeDescription} from './types';

// $FlowFixMe[cannot-resolve-name]: Flow doesn't know about Intl.ListFormat
const hookListFormatter = new Intl.ListFormat('en', {
  style: 'long',
  type: 'conjunction',
});

type HookProps = {
  hook: HooksNode,
  hookNames: Map<string, string> | null,
};

const Hook: component(...props: HookProps) = memo(
  ({hook, hookNames}: HookProps) => {
    const hookSource = hook.hookSource;
    const hookName = useMemo(() => {
      if (!hookSource || !hookNames) return null;
      const key = getHookSourceLocationKey(hookSource);
      return hookNames.get(key) || null;
    }, [hookSource, hookNames]);

    return (
      <ul className={styles.Hook}>
        <li>
          {hook.id !== null && (
            <span className={styles.PrimitiveHookNumber}>
              {String(hook.id + 1)}
            </span>
          )}
          <span
            className={
              hook.id !== null ? styles.PrimitiveHookName : styles.Name
            }>
            {hook.name}
            {hookName && <span className={styles.HookName}>({hookName})</span>}
          </span>
          {hook.subHooks?.map((subHook, index) => (
            <Hook key={hook.id} hook={subHook} hookNames={hookNames} />
          ))}
        </li>
      </ul>
    );
  },
);

const shouldKeepHook = (
  hook: HooksNode,
  hooksArray: Array<number>,
): boolean => {
  if (hook.id !== null && hooksArray.includes(hook.id)) {
    return true;
  }
  const subHooks = hook.subHooks;
  if (subHooks == null) {
    return false;
  }

  return subHooks.some(subHook => shouldKeepHook(subHook, hooksArray));
};

const filterHooks = (
  hook: HooksNode,
  hooksArray: Array<number>,
): HooksNode | null => {
  if (!shouldKeepHook(hook, hooksArray)) {
    return null;
  }

  const subHooks = hook.subHooks;
  if (subHooks == null) {
    return hook;
  }

  const filteredSubHooks = subHooks
    .map(subHook => filterHooks(subHook, hooksArray))
    .filter(Boolean);
  return filteredSubHooks.length > 0
    ? {...hook, subHooks: filteredSubHooks}
    : hook;
};

type Props = {|
  fiberID: number,
  hooks: ChangeDescription['hooks'],
  state: ChangeDescription['state'],
  displayMode?: 'detailed' | 'compact',
|};

const HookChangeSummary: component(...props: Props) = memo(
  ({hooks, fiberID, state, displayMode = 'detailed'}: Props) => {
    const {parseHookNames, toggleParseHookNames, inspectedElement} = useContext(
      InspectedElementContext,
    );
    const store = useContext(StoreContext);

    const [parseHookNamesOptimistic, setParseHookNamesOptimistic] =
      useState<boolean>(parseHookNames);

    useEffect(() => {
      setParseHookNamesOptimistic(parseHookNames);
    }, [inspectedElement?.id, parseHookNames]);

    const handleOnChange = useCallback(() => {
      setParseHookNamesOptimistic(!parseHookNames);
      toggleParseHookNames();
    }, [toggleParseHookNames, parseHookNames]);

    // $FlowFixMe[invalid-compare]
    const element = fiberID !== null ? store.getElementByID(fiberID) : null;
    const hookNames =
      element != null ? getAlreadyLoadedHookNames(element) : null;

    const filteredHooks = useMemo(() => {
      if (!hooks || !inspectedElement?.hooks) return null;
      return inspectedElement.hooks
        .map(hook => filterHooks(hook, hooks))
        .filter(Boolean);
    }, [inspectedElement?.hooks, hooks]);

    const hookParsingFailed = parseHookNames && hookNames === null;

    if (!hooks?.length) {
      return <span>No hooks changed</span>;
    }

    if (
      inspectedElement?.id !== element?.id ||
      filteredHooks?.length !== hooks.length ||
      displayMode === 'compact'
    ) {
      const hookIds = hooks.map(hookId => String(hookId + 1));
      const hookWord = hookIds.length === 1 ? '• Hook' : '• Hooks';
      return (
        <span>
          {hookWord} {hookListFormatter.format(hookIds)} changed
        </span>
      );
    }

    let toggleTitle: string;
    if (hookParsingFailed) {
      toggleTitle = 'Hook parsing failed';
    } else if (parseHookNamesOptimistic) {
      toggleTitle = 'Parsing hook names ...';
    } else {
      toggleTitle = 'Parse hook names (may be slow)';
    }

    if (filteredHooks == null) {
      return null;
    }

    return (
      <div>
        {filteredHooks.length > 1 ? '• Hooks changed:' : '• Hook changed:'}
        {(!parseHookNames || hookParsingFailed) && (
          <Toggle
            className={
              hookParsingFailed
                ? styles.ToggleError
                : styles.LoadHookNamesToggle
            }
            isChecked={parseHookNamesOptimistic}
            isDisabled={parseHookNamesOptimistic || hookParsingFailed}
            onChange={handleOnChange}
            title={toggleTitle}>
            <ButtonIcon type="parse-hook-names" />
          </Toggle>
        )}
        {filteredHooks.map(hook => (
          <Hook
            key={`${inspectedElement?.id ?? 'unknown'}-${hook.id}`}
            hook={hook}
            hookNames={hookNames}
          />
        ))}
      </div>
    );
  },
);

export default HookChangeSummary;
