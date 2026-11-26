/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {checkFormFieldValueStringCoercion} from 'shared/CheckStringCoercion';

type ValueTracker = {
  getValue(): string,
  setValue(value: string): void,
  getBadInput(): boolean,
  stopTracking(): void,
};
interface ElementWithValueTracker extends HTMLInputElement {
  _valueTracker?: ?ValueTracker;
}

function isCheckable(elem: HTMLInputElement) {
  const type = elem.type;
  const nodeName = elem.nodeName;
  return (
    nodeName &&
    nodeName.toLowerCase() === 'input' &&
    (type === 'checkbox' || type === 'radio')
  );
}

function getTracker(node: ElementWithValueTracker) {
  return node._valueTracker;
}

function detachTracker(node: ElementWithValueTracker) {
  node._valueTracker = null;
}

function getValueFromNode(node: HTMLInputElement): string {
  let value = '';
  if (!node) {
    return value;
  }

  if (isCheckable(node)) {
    value = node.checked ? 'true' : 'false';
  } else {
    value = node.value;
  }

  return value;
}

function getBadInputFromNode(node: HTMLInputElement): boolean {
  if (!node) {
    return false;
  }

  if (isCheckable(node)) {
    return false;
  }

  // validity may be undefined in some environments (e.g. JSDOM versions
  // without full validity support, or non-input elements) or for
  // textareas where badInput is always false.
  try {
    const validity = (node: any).validity;
    return !!(validity && validity.badInput);
  } catch (e) {
    return false;
  }
}

function trackValueOnNode(
  node: any,
  valueField: 'checked' | 'value',
  currentValue: string,
  currentBadInput?: boolean,
): ?ValueTracker {
  const descriptor = Object.getOwnPropertyDescriptor(
    node.constructor.prototype,
    valueField,
  );

  // if someone has already defined a value or Safari, then bail
  // and don't track value will cause over reporting of changes,
  // but it's better then a hard failure
  // (needed for certain tests that spyOn input values and Safari)
  if (
    node.hasOwnProperty(valueField) ||
    typeof descriptor === 'undefined' ||
    typeof descriptor.get !== 'function' ||
    typeof descriptor.set !== 'function'
  ) {
    return;
  }

  // Track validity.badInput alongside value to detect transitions
  // between an empty number input and an invalid intermediate state
  // (e.g. typing "e", "E", "-" or "." into a <input type="number">).
  // In those cases the browser sanitizes node.value to "" but sets
  // validity.badInput to true; without this the value tracker would
  // consider the input unchanged and drop the onChange event.
  // See https://github.com/facebook/react/issues/13499
  let trackedBadInput =
    currentBadInput != null
      ? currentBadInput
      : valueField === 'value'
        ? getBadInputFromNode(node)
        : false;

  const {get, set} = descriptor;
  Object.defineProperty(node, valueField, {
    configurable: true,
    // $FlowFixMe[missing-this-annot]
    get: function () {
      return get.call(this);
    },
    // $FlowFixMe[missing-local-annot]
    // $FlowFixMe[missing-this-annot]
    set: function (value) {
      if (__DEV__) {
        checkFormFieldValueStringCoercion(value);
      }
      currentValue = '' + value;
      set.call(this, value);
      trackedBadInput =
        valueField === 'value' ? getBadInputFromNode(node) : false;
    },
  });
  // We could've passed this the first time
  // but it triggers a bug in IE11 and Edge 14/15.
  // Calling defineProperty() again should be equivalent.
  // https://github.com/react/react/issues/11768
  Object.defineProperty(node, valueField, {
    enumerable: descriptor.enumerable,
  });

  const tracker = {
    getValue() {
      return currentValue;
    },
    setValue(value: string) {
      if (__DEV__) {
        checkFormFieldValueStringCoercion(value);
      }
      currentValue = '' + value;
      trackedBadInput =
        valueField === 'value' ? getBadInputFromNode(node) : false;
    },
    getBadInput() {
      return trackedBadInput;
    },
    stopTracking() {
      detachTracker(node);
      delete node[valueField];
    },
  };
  return tracker;
}

export function track(node: ElementWithValueTracker) {
  if (getTracker(node)) {
    return;
  }

  const valueField = isCheckable(node) ? 'checked' : 'value';
  // This is read from the DOM so always safe to coerce. We really shouldn't
  // be coercing to a string at all. It's just historical.
  // eslint-disable-next-line react-internal/safe-string-coercion
  const initialValue = '' + (node[valueField] as any);
  node._valueTracker = trackValueOnNode(node, valueField, initialValue);
}

export function trackHydrated(
  node: ElementWithValueTracker,
  initialValue: string,
  initialChecked: boolean,
): boolean {
  // For hydration, the initial value is not the current value but the value
  // that we last observed which is what the initial server render was.
  if (getTracker(node)) {
    return false;
  }

  let valueField: 'checked' | 'value';
  let expectedValue;
  if (isCheckable(node)) {
    valueField = 'checked';
    // eslint-disable-next-line react-internal/safe-string-coercion
    expectedValue = '' + (initialChecked as any);
  } else {
    valueField = 'value';
    expectedValue = initialValue;
  }
  const currentValue =
    // eslint-disable-next-line react-internal/safe-string-coercion
    '' + // $FlowFixMe[prop-missing]
    (node[valueField] as any);
  const currentBadInput =
    valueField === 'value' ? getBadInputFromNode(node) : false;
  // The server render was not user input, so its badInput is always false.
  const expectedBadInput = false;
  node._valueTracker = trackValueOnNode(
    node,
    valueField,
    expectedValue,
    expectedBadInput,
  );
  return currentValue !== expectedValue || currentBadInput !== expectedBadInput;
}

export function updateValueIfChanged(node: ElementWithValueTracker): boolean {
  if (!node) {
    return false;
  }

  const tracker = getTracker(node);
  // if there is no tracker at this point it's unlikely
  // that trying again will succeed
  if (!tracker) {
    return true;
  }

  const lastValue = tracker.getValue();
  const nextValue = getValueFromNode(node);
  // For <input type="number">, an empty value can arise from either an
  // empty input or an invalid intermediate input with validity.badInput
  // set (e.g. "e", "E", "-", "."). Those are distinct states that
  // consumers (e.g. floating labels) need to observe via onChange.
  const lastBadInput =
    typeof tracker.getBadInput === 'function' ? tracker.getBadInput() : false;
  const nextBadInput = getBadInputFromNode(node);
  if (nextValue !== lastValue || nextBadInput !== lastBadInput) {
    tracker.setValue(nextValue);
    return true;
  }
  return false;
}

export function stopTracking(node: ElementWithValueTracker) {
  const tracker = getTracker(node);
  if (tracker) {
    tracker.stopTracking();
  }
}
