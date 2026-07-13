/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {SuspenseTimelineStep} from 'react-devtools-shared/src/frontend/types';

import typeof {SyntheticEvent} from 'react-dom-bindings/src/events/SyntheticEvent';

import * as React from 'react';
import {useContext, useRef} from 'react';
import {ElementTypeRoot} from 'react-devtools-shared/src/frontend/types';

import styles from './SuspenseScrubber.css';

import {getClassNameForEnvironment} from './SuspenseEnvironmentColors.js';

import Tooltip from '../Components/reach-ui/tooltip';
import {StoreContext} from '../context';

export default function SuspenseScrubber({
  min,
  max,
  timeline,
  value,
  highlight,
  onBlur,
  onChange,
  onFocus,
  onHoverSegment,
  onHoverLeave,
}: {
  min: number,
  max: number,
  timeline: $ReadOnlyArray<SuspenseTimelineStep>,
  value: number,
  highlight: number,
  onBlur?: () => void,
  onChange: (index: number) => void,
  onFocus?: () => void,
  onHoverSegment: (index: number) => void,
  onHoverLeave: () => void,
}): React$Node {
  const store = useContext(StoreContext);
  const inputRef = useRef();
  function handleChange(event: SyntheticEvent) {
    const newValue = +event.currentTarget.value;
    onChange(newValue);
  }
  function handlePress(index: number, event: SyntheticEvent) {
    event.preventDefault();
    if (inputRef.current == null) {
      throw new Error(
        'The input should always be mounted while we can click things.',
      );
    }
    inputRef.current.focus();
    onChange(index);
  }
  const steps = [];
  for (let index = min; index <= max; index++) {
    const step = timeline[index];
    const environment = step.environment;
    const element = store.getElementByID(step.id);
    const label =
      index === min
        ? // The first step in the timeline is always a Transition (Initial Paint).
          element === null || element.type === ElementTypeRoot
          ? 'Initial Paint'
          : 'Transition' +
            (environment === null ? '' : ' (' + environment + ')')
        : // TODO: Consider adding the name of this specific boundary if this step has only one.
          environment === null
          ? 'Suspense'
          : environment;
    steps.push(
      <Tooltip key={index} label={label}>
        <div
          className={
            styles.SuspenseScrubberStep +
            (highlight === index
              ? ' ' + styles.SuspenseScrubberStepHighlight
              : '')
          }
          onPointerDown={handlePress.bind(null, index)}
          onMouseEnter={onHoverSegment.bind(null, index)}>
          <div
            className={
              styles.SuspenseScrubberBead +
              (index === min
                ? // The first step in the timeline is always a Transition (Initial Paint).
                  ' ' + styles.SuspenseScrubberBeadTransition
                : '') +
              ' ' +
              getClassNameForEnvironment(environment) +
              (index <= value ? ' ' + styles.SuspenseScrubberBeadSelected : '')
            }
          />
        </div>
      </Tooltip>,
    );
  }

  return (
    <div className={styles.SuspenseScrubber} onMouseLeave={onHoverLeave}>
      <input
        className={styles.SuspenseScrubberInput}
        type="range"
        min={min}
        max={max}
        value={value}
        onBlur={onBlur}
        onChange={handleChange}
        onFocus={onFocus}
        ref={inputRef}
      />
      {steps}
    </div>
  );
}
