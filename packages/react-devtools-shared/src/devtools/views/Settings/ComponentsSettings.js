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
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  use,
} from 'react';
import {useSubscription} from '../hooks';
import {StoreContext} from '../context';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import Toggle from '../Toggle';
import {SettingsContext} from '../Settings/SettingsContext';
import {
  ComponentFilterDisplayName,
  ComponentFilterElementType,
  ComponentFilterHOC,
  ComponentFilterLocation,
  ComponentFilterEnvironmentName,
  ComponentFilterActivitySlice,
  ElementTypeClass,
  ElementTypeContext,
  ElementTypeFunction,
  ElementTypeForwardRef,
  ElementTypeHostComponent,
  ElementTypeMemo,
  ElementTypeOtherOrUnknown,
  ElementTypeProfiler,
  ElementTypeSuspense,
  ElementTypeActivity,
  ElementTypeViewTransition,
} from 'react-devtools-shared/src/frontend/types';

import styles from './SettingsShared.css';

import type {
  BooleanComponentFilter,
  ComponentFilter,
  ComponentFilterType,
  ElementType,
  ElementTypeComponentFilter,
  RegExpComponentFilter,
  EnvironmentNameComponentFilter,
} from 'react-devtools-shared/src/frontend/types';
import {isInternalFacebookBuild} from 'react-devtools-feature-flags';

export default function ComponentsSettings({
  environmentNames,
}: {
  environmentNames: Promise<Array<string>>,
}): React.Node {
  const store = useContext(StoreContext);
  const {parseHookNames, setParseHookNames} = useContext(SettingsContext);

  const collapseNodesByDefaultSubscription = useMemo(
    () => ({
      getCurrentValue: () => store.collapseNodesByDefault,
      subscribe: (callback: Function) => {
        store.addListener('collapseNodesByDefault', callback);
        return () => store.removeListener('collapseNodesByDefault', callback);
      },
    }),
    [store],
  );
  const collapseNodesByDefault = useSubscription<boolean>(
    collapseNodesByDefaultSubscription,
  );

  const updateCollapseNodesByDefault = useCallback(
    ({currentTarget}: $FlowFixMe) => {
      store.collapseNodesByDefault = !currentTarget.checked;
    },
    [store],
  );

  const updateParseHookNames = useCallback(
    ({currentTarget}: $FlowFixMe) => {
      setParseHookNames(currentTarget.checked);
    },
    [setParseHookNames],
  );

  const [componentFilters, setComponentFilters] = useState<
    Array<ComponentFilter>,
  >(() => [...store.componentFilters]);

  const usedEnvironmentNames = use(environmentNames);

  const resolvedEnvironmentNames = useMemo(() => {
    const set = new Set(usedEnvironmentNames);
    // If there are other filters already specified but are not currently
    // on the page, we still allow them as options.
    for (let i = 0; i < componentFilters.length; i++) {
      const filter = componentFilters[i];
      if (filter.type === ComponentFilterEnvironmentName) {
        set.add(filter.value);
      }
    }
    // Client is special and is always available as a default.
    if (set.size > 0) {
      // Only show any options at all if there's any other option already
      // used by a filter or if any environments are used by the page.
      // Note that "Client" can have been added above which would mean
      // that we should show it as an option regardless if it's the only
      // option.
      set.add('Client');
    }
    return Array.from(set).sort();
  }, [usedEnvironmentNames, componentFilters]);

  const addFilter = useCallback(() => {
    setComponentFilters(prevComponentFilters => {
      return [
        ...prevComponentFilters,
        {
          type: ComponentFilterElementType,
          value: ElementTypeHostComponent,
          isEnabled: true,
        },
      ];
    });
  }, []);

  const changeFilterType = useCallback(
    (componentFilter: ComponentFilter, type: ComponentFilterType) => {
      setComponentFilters(prevComponentFilters => {
        const cloned: Array<ComponentFilter> = [...prevComponentFilters];
        const index = prevComponentFilters.indexOf(componentFilter);
        if (index >= 0) {
          if (type === ComponentFilterElementType) {
            cloned[index] = {
              type: ComponentFilterElementType,
              isEnabled: componentFilter.isEnabled,
              value: ElementTypeHostComponent,
            };
          } else if (type === ComponentFilterDisplayName) {
            cloned[index] = {
              type: ComponentFilterDisplayName,
              isEnabled: componentFilter.isEnabled,
              isValid: true,
              value: '',
            };
          } else if (type === ComponentFilterLocation) {
            cloned[index] = {
              type: ComponentFilterLocation,
              isEnabled: componentFilter.isEnabled,
              isValid: true,
              value: '',
            };
          } else if (type === ComponentFilterHOC) {
            cloned[index] = {
              type: ComponentFilterHOC,
              isEnabled: componentFilter.isEnabled,
              isValid: true,
            };
          } else if (type === ComponentFilterEnvironmentName) {
            cloned[index] = {
              type: ComponentFilterEnvironmentName,
              isEnabled: componentFilter.isEnabled,
              isValid: true,
              value: 'Client',
            };
          } else if (type === ComponentFilterActivitySlice) {
            // TODO: Allow changing type
          }
        }
        return cloned;
      });
    },
    [],
  );

  const updateFilterValueElementType = useCallback(
    (componentFilter: ComponentFilter, value: ElementType) => {
      if (componentFilter.type !== ComponentFilterElementType) {
        throw Error('Invalid value for element type filter');
      }

      setComponentFilters(prevComponentFilters => {
        const cloned: Array<ComponentFilter> = [...prevComponentFilters];
        if (componentFilter.type === ComponentFilterElementType) {
          const index = prevComponentFilters.indexOf(componentFilter);
          if (index >= 0) {
            cloned[index] = {
              ...componentFilter,
              value,
            };
          }
        }
        return cloned;
      });
    },
    [],
  );

  const updateFilterValueRegExp = useCallback(
    (componentFilter: ComponentFilter, value: string) => {
      if (componentFilter.type === ComponentFilterElementType) {
        throw Error('Invalid value for element type filter');
      }

      setComponentFilters(prevComponentFilters => {
        const cloned: Array<ComponentFilter> = [...prevComponentFilters];
        if (
          componentFilter.type === ComponentFilterDisplayName ||
          componentFilter.type === ComponentFilterLocation
        ) {
          const index = prevComponentFilters.indexOf(componentFilter);
          if (index >= 0) {
            let isValid = true;
            try {
              new RegExp(value); // eslint-disable-line no-new
            } catch (error) {
              isValid = false;
            }
            cloned[index] = {
              ...componentFilter,
              isValid,
              value,
            };
          }
        }
        return cloned;
      });
    },
    [],
  );

  const updateFilterValueEnvironmentName = useCallback(
    (componentFilter: ComponentFilter, value: string) => {
      if (componentFilter.type !== ComponentFilterEnvironmentName) {
        throw Error('Invalid value for environment name filter');
      }

      setComponentFilters(prevComponentFilters => {
        const cloned: Array<ComponentFilter> = [...prevComponentFilters];
        if (componentFilter.type === ComponentFilterEnvironmentName) {
          const index = prevComponentFilters.indexOf(componentFilter);
          if (index >= 0) {
            cloned[index] = {
              ...componentFilter,
              value,
            };
          }
        }
        return cloned;
      });
    },
    [],
  );

  const removeFilter = useCallback((index: number) => {
    setComponentFilters(prevComponentFilters => {
      const cloned: Array<ComponentFilter> = [...prevComponentFilters];
      cloned.splice(index, 1);
      return cloned;
    });
  }, []);

  const removeAllFilter = () => {
    setComponentFilters([]);
  };

  const toggleFilterIsEnabled = useCallback(
    (componentFilter: ComponentFilter, isEnabled: boolean) => {
      setComponentFilters(prevComponentFilters => {
        const cloned: Array<ComponentFilter> = [...prevComponentFilters];
        const index = prevComponentFilters.indexOf(componentFilter);
        if (index >= 0) {
          if (componentFilter.type === ComponentFilterElementType) {
            cloned[index] = {
              ...(cloned[index] as any as ElementTypeComponentFilter),
              isEnabled,
            };
          } else if (
            componentFilter.type === ComponentFilterDisplayName ||
            componentFilter.type === ComponentFilterLocation
          ) {
            cloned[index] = {
              ...(cloned[index] as any as RegExpComponentFilter),
              isEnabled,
            };
          } else if (componentFilter.type === ComponentFilterHOC) {
            cloned[index] = {
              ...(cloned[index] as any as BooleanComponentFilter),
              isEnabled,
            };
          } else if (componentFilter.type === ComponentFilterEnvironmentName) {
            cloned[index] = {
              ...(cloned[index] as any as EnvironmentNameComponentFilter),
              isEnabled,
            };
          }
        }
        return cloned;
      });
    },
    [],
  );

  // Filter updates are expensive to apply (since they impact the entire tree).
  // Only apply them on unmount.
  // The Store will avoid doing any expensive work unless they've changed.
  // We just want to batch the work in the event that they do change.
  const componentFiltersRef = useRef<Array<ComponentFilter>>(componentFilters);
  useEffect(() => {
    componentFiltersRef.current = componentFilters;
    return () => {};
  }, [componentFilters]);
  useEffect(
    () => () => {
      store.componentFilters = [...componentFiltersRef.current];
    },
    [store],
  );

  return (
    <div className={styles.SettingList}>
      <div className={styles.SettingWrapper}>
        <label className={styles.SettingRow}>
          <input
            type="checkbox"
            checked={!collapseNodesByDefault}
            onChange={updateCollapseNodesByDefault}
            className={styles.SettingRowCheckbox}
          />
          Expand component tree by default
        </label>
      </div>

      <div className={styles.SettingWrapper}>
        <label className={styles.SettingRow}>
          <input
            type="checkbox"
            checked={parseHookNames}
            onChange={updateParseHookNames}
            className={styles.SettingRowCheckbox}
          />
          Always parse hook names from source&nbsp;
          <span className={styles.Warning}>(may be slow)</span>
        </label>
      </div>

      <div className={styles.Header}>Hide components where...</div>

      <table className={styles.Table}>
        <tbody>
          {componentFilters.length === 0 && (
            <tr className={styles.TableRow}>
              <td className={styles.NoFiltersCell}>
                No filters have been added.
              </td>
            </tr>
          )}
          {componentFilters.map((componentFilter, index) => (
            <tr className={styles.TableRow} key={index}>
              <td className={styles.TableCell}>
                {componentFilter.type !== ComponentFilterActivitySlice && (
                  <Toggle
                    className={
                      componentFilter.isValid !== false
                        ? ''
                        : styles.InvalidRegExp
                    }
                    isChecked={componentFilter.isEnabled}
                    onChange={isEnabled =>
                      toggleFilterIsEnabled(componentFilter, isEnabled)
                    }
                    title={
                      componentFilter.isValid === false
                        ? 'Filter invalid'
                        : componentFilter.isEnabled
                          ? 'Filter enabled'
                          : 'Filter disabled'
                    }>
                    <ToggleIcon
                      isEnabled={componentFilter.isEnabled}
                      isValid={
                        componentFilter.isValid == null ||
                        componentFilter.isValid === true
                      }
                    />
                  </Toggle>
                )}
              </td>
              <td className={styles.TableCell}>
                <select
                  disabled={
                    componentFilter.type === ComponentFilterActivitySlice
                  }
                  value={componentFilter.type}
                  onChange={({currentTarget}) =>
                    changeFilterType(
                      componentFilter,
                      parseInt(
                        currentTarget.value,
                        10,
                      ) as any as ComponentFilterType,
                    )
                  }>
                  {/* TODO: currently disabled, need find a new way of doing this
                    <option value={ComponentFilterLocation}>location</option>
                  */}
                  <option value={ComponentFilterDisplayName}>name</option>
                  <option value={ComponentFilterElementType}>type</option>
                  <option value={ComponentFilterHOC}>hoc</option>
                  {resolvedEnvironmentNames.length > 0 && (
                    <option value={ComponentFilterEnvironmentName}>
                      environment
                    </option>
                  )}
                  {componentFilter.type === ComponentFilterActivitySlice && (
                    <option value={ComponentFilterActivitySlice}>
                      component
                    </option>
                  )}
                </select>
              </td>
              <td className={styles.TableCell}>
                {(componentFilter.type === ComponentFilterElementType ||
                  componentFilter.type === ComponentFilterEnvironmentName) &&
                  'equals'}
                {(componentFilter.type === ComponentFilterLocation ||
                  componentFilter.type === ComponentFilterDisplayName) &&
                  'matches'}
                {componentFilter.type === ComponentFilterActivitySlice &&
                  'within'}
              </td>
              <td className={styles.TableCell}>
                {componentFilter.type === ComponentFilterElementType && (
                  <select
                    value={componentFilter.value}
                    onChange={({currentTarget}) =>
                      updateFilterValueElementType(
                        componentFilter,
                        parseInt(currentTarget.value, 10) as any as ElementType,
                      )
                    }>
                    {isInternalFacebookBuild && (
                      <option value={ElementTypeActivity}>activity</option>
                    )}
                    <option value={ElementTypeClass}>class</option>
                    <option value={ElementTypeContext}>context</option>
                    <option value={ElementTypeFunction}>function</option>
                    <option value={ElementTypeForwardRef}>forward ref</option>
                    <option value={ElementTypeHostComponent}>
                      {__IS_NATIVE__
                        ? 'host components (e.g. <RCTText>)'
                        : 'dom nodes (e.g. <div>)'}
                    </option>
                    <option value={ElementTypeMemo}>memo</option>
                    <option value={ElementTypeOtherOrUnknown}>other</option>
                    <option value={ElementTypeProfiler}>profiler</option>
                    <option value={ElementTypeSuspense}>suspense</option>
                    {isInternalFacebookBuild && (
                      <option value={ElementTypeViewTransition}>
                        view transition
                      </option>
                    )}
                  </select>
                )}
                {(componentFilter.type === ComponentFilterLocation ||
                  componentFilter.type === ComponentFilterDisplayName) && (
                  <input
                    className={styles.Input}
                    type="text"
                    placeholder="Regular expression"
                    onChange={({currentTarget}) =>
                      updateFilterValueRegExp(
                        componentFilter,
                        currentTarget.value,
                      )
                    }
                    value={componentFilter.value}
                  />
                )}
                {componentFilter.type === ComponentFilterEnvironmentName && (
                  <select
                    value={componentFilter.value}
                    onChange={({currentTarget}) =>
                      updateFilterValueEnvironmentName(
                        componentFilter,
                        currentTarget.value,
                      )
                    }>
                    {resolvedEnvironmentNames.map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                )}
                {componentFilter.type === ComponentFilterActivitySlice && (
                  <span>Activity Slice</span>
                )}
              </td>
              <td className={styles.TableCell}>
                <Button
                  onClick={() => removeFilter(index)}
                  title="Delete filter">
                  <ButtonIcon type="delete" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button onClick={addFilter} title="Add filter">
        <ButtonIcon className={styles.ButtonIcon} type="add" />
        Add filter
      </Button>
      {componentFilters.length > 0 && (
        <Button onClick={removeAllFilter} title="Delete all filters">
          <ButtonIcon className={styles.ButtonIcon} type="delete" />
          Delete all filters
        </Button>
      )}
    </div>
  );
}

type ToggleIconProps = {
  isEnabled: boolean,
  isValid: boolean,
};
function ToggleIcon({isEnabled, isValid}: ToggleIconProps) {
  let className;
  if (isValid) {
    className = isEnabled ? styles.ToggleOn : styles.ToggleOff;
  } else {
    className = isEnabled ? styles.ToggleOnInvalid : styles.ToggleOffInvalid;
  }
  return (
    <div className={className}>
      <div
        className={isEnabled ? styles.ToggleInsideOn : styles.ToggleInsideOff}
      />
    </div>
  );
}
