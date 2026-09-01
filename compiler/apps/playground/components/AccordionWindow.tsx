/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Resizable} from 're-resizable';
import React, {
  useId,
  unstable_ViewTransition as ViewTransition,
  unstable_addTransitionType as addTransitionType,
  startTransition,
} from 'react';
import {EXPAND_ACCORDION_TRANSITION} from '../lib/transitionTypes';

type TabsRecord = Map<string, React.ReactNode>;

export default function AccordionWindow(props: {
  defaultTab: string | null;
  tabs: TabsRecord;
  tabsOpen: Set<string>;
  setTabsOpen: (newTab: Set<string>) => void;
  changedPasses: Set<string>;
}): React.ReactElement {
  return (
    <div className="flex-1 min-w-[550px] sm:min-w-0">
      <div className="flex flex-row h-full">
        {Array.from(props.tabs.keys()).map(name => {
          return (
            <AccordionWindowItem
              name={name}
              key={name}
              tabs={props.tabs}
              tabsOpen={props.tabsOpen}
              setTabsOpen={props.setTabsOpen}
              hasChanged={props.changedPasses.has(name)}
            />
          );
        })}
      </div>
    </div>
  );
}

function AccordionWindowItem({
  name,
  tabs,
  tabsOpen,
  setTabsOpen,
  hasChanged,
}: {
  name: string;
  tabs: TabsRecord;
  tabsOpen: Set<string>;
  setTabsOpen: (newTab: Set<string>) => void;
  hasChanged: boolean;
  isFailure: boolean;
}): React.ReactElement {
  const id = useId();
  const isShow = tabsOpen.has(name);

  const transitionName = `accordion-window-item-${id}`;

  const toggleTabs = (): void => {
    startTransition(() => {
      addTransitionType(EXPAND_ACCORDION_TRANSITION);
      const nextState = new Set(tabsOpen);
      if (nextState.has(name)) {
        nextState.delete(name);
      } else {
        nextState.add(name);
      }
      setTabsOpen(nextState);
    });
  };

  // Replace spaces with non-breaking spaces
  const displayName = name.replace(/ /g, '\u00A0');

  return (
    <div key={name} className="flex flex-row">
      {isShow ? (
        <ViewTransition
          name={transitionName}
          update={{
            [EXPAND_ACCORDION_TRANSITION]: 'expand-accordion',
            default: 'none',
          }}>
          <Resizable className="border-r" minWidth={550} enable={{right: true}}>
            <h2
              title="Minimize tab"
              aria-label="Minimize tab"
              onClick={toggleTabs}
              className={`p-4 duration-150 ease-in border-b cursor-pointer border-grey-200 ${
                hasChanged ? 'font-bold' : 'font-light'
              } text-secondary hover:text-link`}>
              - {displayName}
            </h2>
            {tabs.get(name) ?? <div>No output for {name}</div>}
          </Resizable>
        </ViewTransition>
      ) : (
        <ViewTransition
          name={transitionName}
          update={{
            [EXPAND_ACCORDION_TRANSITION]: 'expand-accordion',
            default: 'none',
          }}>
          <div className="relative items-center h-full px-1 py-6 align-middle border-r border-grey-200">
            <button
              title={`Expand compiler tab: ${name}`}
              aria-label={`Expand compiler tab: ${name}`}
              style={{transform: 'rotate(90deg) translate(-50%)'}}
              onClick={toggleTabs}
              className={`flex-grow-0 w-5 transition-colors duration-150 ease-in ${
                hasChanged ? 'font-bold' : 'font-light'
              } text-secondary hover:text-link`}>
              {displayName}
            </button>
          </div>
        </ViewTransition>
      )}
    </div>
  );
}
