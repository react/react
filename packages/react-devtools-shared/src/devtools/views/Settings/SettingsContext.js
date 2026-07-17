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
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react';
import {
  LOCAL_STORAGE_BROWSER_THEME,
  LOCAL_STORAGE_PARSE_HOOK_NAMES_KEY,
  LOCAL_STORAGE_TRACE_UPDATES_ENABLED_KEY,
} from 'react-devtools-shared/src/constants';
import {
  COMFORTABLE_LINE_HEIGHT,
  COMPACT_LINE_HEIGHT,
} from 'react-devtools-shared/src/devtools/constants';
import {useLocalStorage} from '../hooks';
import {BridgeContext} from '../context';
import {logEvent} from 'react-devtools-shared/src/Logger';

import type {BrowserTheme} from 'react-devtools-shared/src/frontend/types';

export type DisplayDensity = 'comfortable' | 'compact';
export type Theme = 'auto' | 'light' | 'dark';

type Context = {
  displayDensity: DisplayDensity,
  setDisplayDensity(value: DisplayDensity): void,

  // Derived from display density.
  // Specified as a separate prop so it can trigger a re-render of FixedSizeList.
  lineHeight: number,

  parseHookNames: boolean,
  setParseHookNames: (value: boolean) => void,

  theme: Theme,
  setTheme(value: Theme): void,

  browserTheme: Theme,

  traceUpdatesEnabled: boolean,
  setTraceUpdatesEnabled: (value: boolean) => void,
};

const SettingsContext: ReactContext<Context> = createContext<Context>(
  null as any as Context,
);
SettingsContext.displayName = 'SettingsContext';

function useLocalStorageWithLog<T>(
  key: string,
  initialValue: T | (() => T),
): [T, (value: T | (() => T)) => void] {
  return useLocalStorage<T>(key, initialValue, (v, k) => {
    logEvent({
      event_name: 'settings-changed',
      metadata: {
        source: 'localStorage setter',
        key: k,
        value: v,
      },
    });
  });
}

type DocumentElements = Array<HTMLElement>;

type Props = {
  browserTheme: BrowserTheme,
  children: React$Node,
  componentsPortalContainer?: Element,
  profilerPortalContainer?: Element,
  suspensePortalContainer?: Element,
};

function SettingsContextController({
  browserTheme,
  children,
  componentsPortalContainer,
  profilerPortalContainer,
  suspensePortalContainer,
}: Props): React.Node {
  const bridge = useContext(BridgeContext);

  const [displayDensity, setDisplayDensity] =
    useLocalStorageWithLog<DisplayDensity>(
      'React::DevTools::displayDensity',
      'compact',
    );
  const [theme, setTheme] = useLocalStorageWithLog<Theme>(
    LOCAL_STORAGE_BROWSER_THEME,
    'auto',
  );
  const [parseHookNames, setParseHookNames] = useLocalStorageWithLog<boolean>(
    LOCAL_STORAGE_PARSE_HOOK_NAMES_KEY,
    false,
  );
  const [traceUpdatesEnabled, setTraceUpdatesEnabled] =
    useLocalStorageWithLog<boolean>(
      LOCAL_STORAGE_TRACE_UPDATES_ENABLED_KEY,
      false,
    );

  const documentElements = useMemo<DocumentElements>(() => {
    const array: Array<HTMLElement> = [
      document.documentElement as any as HTMLElement,
    ];
    if (componentsPortalContainer != null) {
      array.push(
        componentsPortalContainer.ownerDocument
          .documentElement as any as HTMLElement,
      );
    }
    if (profilerPortalContainer != null) {
      array.push(
        profilerPortalContainer.ownerDocument
          .documentElement as any as HTMLElement,
      );
    }
    if (suspensePortalContainer != null) {
      array.push(
        suspensePortalContainer.ownerDocument
          .documentElement as any as HTMLElement,
      );
    }
    return array;
  }, [
    componentsPortalContainer,
    profilerPortalContainer,
    suspensePortalContainer,
  ]);

  useLayoutEffect(() => {
    switch (displayDensity) {
      case 'comfortable':
        updateDisplayDensity('comfortable', documentElements);
        break;
      case 'compact':
        updateDisplayDensity('compact', documentElements);
        break;
      default:
        throw Error(`Unsupported displayDensity value "${displayDensity}"`);
    }
  }, [displayDensity, documentElements]);

  useLayoutEffect(() => {
    switch (theme) {
      case 'light':
        updateThemeVariables('light', documentElements);
        break;
      case 'dark':
        updateThemeVariables('dark', documentElements);
        break;
      case 'auto':
        updateThemeVariables(browserTheme, documentElements);
        break;
      default:
        throw Error(`Unsupported theme value "${theme}"`);
    }
  }, [browserTheme, theme, documentElements]);

  useEffect(() => {
    bridge.send('setTraceUpdatesEnabled', traceUpdatesEnabled);
  }, [bridge, traceUpdatesEnabled]);

  const value: Context = useMemo(
    () => ({
      displayDensity,
      lineHeight:
        displayDensity === 'compact'
          ? COMPACT_LINE_HEIGHT
          : COMFORTABLE_LINE_HEIGHT,
      parseHookNames,
      setDisplayDensity,
      setParseHookNames,
      setTheme,
      setTraceUpdatesEnabled,
      theme,
      browserTheme,
      traceUpdatesEnabled,
    }),
    [
      displayDensity,
      parseHookNames,
      setDisplayDensity,
      setParseHookNames,
      setTheme,
      setTraceUpdatesEnabled,
      theme,
      browserTheme,
      traceUpdatesEnabled,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function updateDisplayDensity(
  displayDensity: DisplayDensity,
  documentElements: DocumentElements,
): void {
  // Sizes and paddings/margins are all rem-based,
  // so update the root font-size as well when the display preference changes.
  const computedStyle = getComputedStyle(document.body as any);
  const fontSize = computedStyle.getPropertyValue(
    `--${displayDensity}-root-font-size`,
  );
  const root = document.querySelector(':root') as any as HTMLElement;
  root.style.fontSize = fontSize;
}

export function updateThemeVariables(
  theme: Theme,
  documentElements: DocumentElements,
): void {
  // Update scrollbar color to match theme.
  // this CSS property is currently only supported in Firefox,
  // but it makes a significant UI improvement in dark mode.
  // https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-color
  documentElements.forEach(documentElement => {
    // $FlowFixMe[prop-missing] scrollbarColor is missing in CSSStyleDeclaration
    documentElement.style.scrollbarColor = `var(${`--${theme}-color-scroll-thumb`}) var(${`--${theme}-color-scroll-track`})`;
  });
}

export {SettingsContext, SettingsContextController};
