/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// Given the events that have run, works out which results have to be settled
// and which errors they may be rejected with.
//
// A result is due when the events it depends on have run.

const {isObject} = require('./FlightFuzzCompare');

// Values whose contents arrive as a separate result. A containing value need
// not wait for them.
const separateResultTypes = ['promise'];

function getValueDependencies(fixture, value) {
  const metadata = fixture.valueMetadata.get(value);
  if (metadata !== undefined) {
    return [];
  }
  if (value instanceof Set) {
    return Array.from(value);
  }
  if (value instanceof Map) {
    return Array.from(value.entries()).flat();
  }
  return Array.isArray(value) ||
    Object.getPrototypeOf(value) === Object.prototype
    ? Object.values(value)
    : [];
}

// The events a value needs before it can be delivered, not counting values
// that arrive as separate results.
function getRequiredEvents(fixture, value) {
  const todo = [value];
  const seen = new Set();
  const events = new Set();
  while (todo.length > 0) {
    const current = todo.pop();
    if (!isObject(current) || seen.has(current)) {
      continue;
    }
    seen.add(current);
    const metadata = fixture.valueMetadata.get(current);
    if (metadata !== undefined && separateResultTypes.includes(metadata.type)) {
      continue;
    }
    (fixture.requiredEvents.get(current) || []).forEach(event =>
      events.add(event),
    );
    todo.push(...getValueDependencies(fixture, current));
  }
  return Array.from(events);
}

function getReleasedErrors(events) {
  return Array.from(events)
    .filter(
      event =>
        event.released &&
        event.error !== undefined &&
        // Evaluation can finish early, but its error needs the loaded module.
        (event.after === undefined || event.after.released),
    )
    .map(event => event.error);
}

function areAllEventsReleased(events) {
  return Array.from(events).every(event => event.released);
}

// One failed dependency rejects the result without waiting for other loads.
function canSettle(events) {
  return areAllEventsReleased(events) || getReleasedErrors(events).length > 0;
}

function isRootProduced(fixture) {
  return (
    fixture.rootPromise == null ||
    fixture.valueMetadata.get(fixture.rootPromise).state === 'fulfilled'
  );
}

// value: what the result fulfills with.
// inputsReady: the result's own inputs are released or one of them failed.
// errors: the errors of its own released inputs.
function getResultExpectation(value, inputsReady, errors) {
  return {
    value,
    canFulfill: inputsReady && errors.length === 0,
    errors: inputsReady ? errors : [],
    mustSettle: inputsReady,
  };
}

function getRootExpectation(fixture, value) {
  const events = getRequiredEvents(fixture, value);
  const produced = isRootProduced(fixture);
  return getResultExpectation(
    value,
    produced && canSettle(events),
    getReleasedErrors(events),
  );
}

function getPromiseExpectation(fixture, metadata) {
  const events = getRequiredEvents(fixture, metadata.value);
  const produced = metadata.state === 'fulfilled';
  let errors;
  if (metadata.state === 'rejected') {
    errors = [fixture.valueMetadata.get(metadata.reason)];
  } else {
    errors = getReleasedErrors(events);
  }
  return getResultExpectation(
    metadata.value,
    metadata.state === 'rejected' || (produced && canSettle(events)),
    errors,
  );
}

module.exports = {
  separateResultTypes,
  getRootExpectation,
  getPromiseExpectation,
};
