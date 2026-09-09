/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// TODO: direct imports like some-package/src/* are bad. Fix me.
import {getCurrentFiberOwnerNameInDevOrNull} from 'react-reconciler/src/ReactCurrentFiber';

import {getToStringValue, toString} from './ToStringValue';
import isArray from 'shared/isArray';
import {queueChangeEvent} from '../events/ReactDOMEventReplaying';

let didWarnValueDefaultValue;

if (__DEV__) {
  didWarnValueDefaultValue = false;
}

function getDeclarationErrorAddendum() {
  const ownerName = getCurrentFiberOwnerNameInDevOrNull();
  if (ownerName) {
    return '\n\nCheck the render method of `' + ownerName + '`.';
  }
  return '';
}

const valuePropNames = ['value', 'defaultValue'];

/**
 * Validation function for `value` and `defaultValue`.
 */
function checkSelectPropTypes(props: any) {
  if (__DEV__) {
    for (let i = 0; i < valuePropNames.length; i++) {
      const propName = valuePropNames[i];
      if (props[propName] == null) {
        continue;
      }
      const propNameIsArray = isArray(props[propName]);
      if (props.multiple && !propNameIsArray) {
        console.error(
          'The `%s` prop supplied to <select> must be an array if ' +
            '`multiple` is true.%s',
          propName,
          getDeclarationErrorAddendum(),
        );
      } else if (!props.multiple && propNameIsArray) {
        console.error(
          'The `%s` prop supplied to <select> must be a scalar ' +
            'value if `multiple` is false.%s',
          propName,
          getDeclarationErrorAddendum(),
        );
      }
    }
  }
}

function updateOptions(
  node: HTMLSelectElement,
  multiple: boolean,
  propValue: any,
  setDefaultSelected: boolean,
) {
  const options: HTMLOptionsCollection = node.options;

  if (multiple) {
    const selectedValues = propValue as Array<string>;
    const selectedValue: {[string]: boolean} = {};
    for (let i = 0; i < selectedValues.length; i++) {
      // Prefix to avoid chaos with special keys.
      selectedValue['$' + selectedValues[i]] = true;
    }
    for (let i = 0; i < options.length; i++) {
      const selected = selectedValue.hasOwnProperty('$' + options[i].value);
      if (options[i].selected !== selected) {
        options[i].selected = selected;
      }
      if (selected && setDefaultSelected) {
        options[i].defaultSelected = true;
      }
    }
  } else {
    // Do not set `select.value` as exact behavior isn't consistent across all
    // browsers for all cases.
    const selectedValue = toString(getToStringValue(propValue));
    let defaultSelected = null;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === selectedValue) {
        options[i].selected = true;
        if (setDefaultSelected) {
          options[i].defaultSelected = true;
        }
        return;
      }
      if (defaultSelected === null && !options[i].disabled) {
        defaultSelected = options[i];
      }
    }
    if (defaultSelected !== null && node.size <= 1) {
      defaultSelected.selected = true;
    }
  }
}

/**
 * Implements a <select> host component that allows optionally setting the
 * props `value` and `defaultValue`. If `multiple` is false, the prop must be a
 * stringable. If `multiple` is true, the prop must be an array of stringables.
 *
 * If `value` is not supplied (or null/undefined), user actions that change the
 * selected option will trigger updates to the rendered options.
 *
 * If it is supplied (and not null/undefined), the rendered options will not
 * update in response to user actions. Instead, the `value` prop must change in
 * order for the rendered options to update.
 *
 * If `defaultValue` is provided, any options with the supplied values will be
 * selected.
 */

export function validateSelectProps(element: Element, props: Object) {
  if (__DEV__) {
    checkSelectPropTypes(props);
    if (
      props.value !== undefined &&
      props.defaultValue !== undefined &&
      !didWarnValueDefaultValue
    ) {
      console.error(
        'Select elements must be either controlled or uncontrolled ' +
          '(specify either the value prop, or the defaultValue prop, but not ' +
          'both). Decide between using a controlled or uncontrolled select ' +
          'element and remove one of these props. More info: ' +
          'https://react.dev/link/controlled-components',
      );
      didWarnValueDefaultValue = true;
    }
  }
}

export function initSelect(
  element: Element,
  value: ?string,
  defaultValue: ?string,
  multiple: ?boolean,
) {
  const node: HTMLSelectElement = element as any;
  node.multiple = !!multiple;
  if (value != null) {
    updateOptions(node, !!multiple, value, false);
  } else if (defaultValue != null) {
    updateOptions(node, !!multiple, defaultValue, true);
  }
}

export function hydrateSelect(
  element: Element,
  value: ?string,
  defaultValue: ?string,
  multiple: ?boolean,
): void {
  const node: HTMLSelectElement = element as any;
  const options: HTMLOptionsCollection = node.options;

  const propValue: any = value != null ? value : defaultValue;

  let changed = false;

  if (multiple) {
    const selectedValues = propValue as ?Array<string>;
    const selectedValue: {[string]: boolean} = {};
    if (selectedValues != null) {
      for (let i = 0; i < selectedValues.length; i++) {
        // Prefix to avoid chaos with special keys.
        selectedValue['$' + selectedValues[i]] = true;
      }
    }
    for (let i = 0; i < options.length; i++) {
      const expectedSelected = selectedValue.hasOwnProperty(
        '$' + options[i].value,
      );
      if (options[i].selected !== expectedSelected) {
        changed = true;
        break;
      }
    }
  } else {
    let selectedValue =
      propValue == null ? null : toString(getToStringValue(propValue));
    for (let i = 0; i < options.length; i++) {
      if (selectedValue == null && !options[i].disabled) {
        // We expect the first non-disabled option to be selected if the selected is null.
        selectedValue = options[i].value;
      }
      const expectedSelected = options[i].value === selectedValue;
      if (options[i].selected !== expectedSelected) {
        changed = true;
        break;
      }
    }
  }
  if (changed) {
    // If the current selection is different than our initial that suggests that the user
    // changed it before hydration. Queue a replay of the change event.
    queueChangeEvent(node);
  }
}

export function updateSelect(
  element: Element,
  value: ?string,
  defaultValue: ?string,
  multiple: ?boolean,
  wasMultiple: ?boolean,
) {
  const node: HTMLSelectElement = element as any;

  if (value != null) {
    updateOptions(node, !!multiple, value, false);
  } else if (!!wasMultiple !== !!multiple) {
    // For simplicity, reapply `defaultValue` if `multiple` is toggled.
    if (defaultValue != null) {
      updateOptions(node, !!multiple, defaultValue, true);
    } else {
      // Revert the select back to its default unselected state.
      updateOptions(node, !!multiple, multiple ? [] : '', false);
    }
  }
}

export function restoreControlledSelectState(element: Element, props: Object) {
  const node: HTMLSelectElement = element as any;
  const value = props.value;

  if (value != null) {
    updateOptions(node, !!props.multiple, value, false);
  }
}
