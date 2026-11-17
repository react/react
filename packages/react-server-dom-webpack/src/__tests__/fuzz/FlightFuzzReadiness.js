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
//
// Two results can contain the same object. The server writes it in the result
// it writes first, and the other one refers to it. So a result may also wait
// for another result that has been produced and contains one of its objects,
// or be rejected with that result's error. The root is always written first.

const {isObject} = require('./FlightFuzzCompare');

// Values whose contents arrive as a separate result. A containing value need
// not wait for them.
const separateResultTypes = ['promise', 'element', 'stream'];

function getValueDependencies(fixture, value) {
  const metadata = fixture.valueMetadata.get(value);
  if (metadata !== undefined) {
    switch (metadata.type) {
      case 'error':
        return __DEV__
          ? [
              value.cause,
              value instanceof AggregateError ? value.errors : undefined,
            ]
          : [];
      case 'function':
        return metadata.bound;
      case 'iterator':
        return metadata.items;
      default:
        return [];
    }
  }
  if (value instanceof Set) {
    return Array.from(value);
  }
  if (value instanceof Map) {
    return Array.from(value.entries()).flat();
  }
  if (value instanceof FormData) {
    return Array.from(value.values());
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

function isOutlined(fixture, value) {
  const metadata = fixture.valueMetadata.get(value);
  return (
    value instanceof Set ||
    value instanceof Map ||
    (metadata !== undefined && metadata.type === 'iterator')
  );
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

function getModelErrors(models) {
  return models.flatMap(model => getReleasedErrors(model.events));
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

function isElementProduced(metadata) {
  return metadata.renderEvent === undefined || metadata.renderEvent.released;
}

// Splits the source values into the parts that the server writes separately.
// The code calls such a part a model. The root is one, and so is the value of
// each Promise that has resolved.
// Stream items, rendered output and bound arguments are models too.
// For each model this records the events it depends on, and the other models
// that may have written one of its objects first. It returns a map from the
// value at the top of each model to that model.
function collectModels(fixture) {
  const modelsByRootValue = new Map();
  const modelsByValue = new Map();
  const separateValues = new Set();
  const boundArgumentModels = new Map();
  const outlinedModels = new Map();
  const visitedElements = new Set();
  const propsModels = new Map();

  function collectModel(rootValues, parent = null, events = [], result = true) {
    const model = {
      parents: parent === null ? [] : [parent],
      events: new Set(events),
      referencedModels: new Set(),
    };
    const todo = rootValues.slice();
    const seen = new Set();
    while (todo.length > 0) {
      const value = todo.pop();
      if (!isObject(value) || seen.has(value)) {
        continue;
      }
      seen.add(value);
      if (result && rootValues.includes(value)) {
        modelsByRootValue.set(value, model);
      }
      modelsByValue.set(value, (modelsByValue.get(value) || []).concat(model));
      const metadata = fixture.valueMetadata.get(value);
      if (metadata !== undefined && metadata.type === 'element') {
        if (metadata.renderEvent !== undefined) {
          separateValues.add(value);
        } else if (!visitedElements.has(value)) {
          // An error in the props belongs to the element. The model that
          // contains the element can still be delivered, because it can hold
          // a lazy element.
          visitedElements.add(value);
          propsModels.set(
            value,
            collectModel(
              [value.props],
              model,
              fixture.requiredEvents.get(value) || [],
            ),
          );
        } else {
          // The element is in more than one model. Any of them may have been
          // the one that wrote its props.
          const propsModel = propsModels.get(value);
          if (
            propsModel !== undefined &&
            propsModel !== model &&
            !propsModel.parents.includes(model)
          ) {
            propsModel.parents.push(model);
          }
        }
        continue;
      }
      if (
        metadata !== undefined &&
        separateResultTypes.includes(metadata.type)
      ) {
        separateValues.add(value);
        continue;
      }
      (fixture.requiredEvents.get(value) || []).forEach(event =>
        model.events.add(event),
      );
      if (metadata !== undefined && metadata.type === 'function') {
        // Bound arguments are written as a separate model, even when the
        // function is in the root.
        separateValues.add(value);
        continue;
      }
      if (isOutlined(fixture, value)) {
        // The entries of a Set or a Map, and the items of an iterator, are
        // written as a row of their own. The model that holds the value
        // waits for that row, but a failure next to the value does not
        // settle it.
        separateValues.add(value);
        continue;
      }
      todo.push(...getValueDependencies(fixture, value));
    }
    return model;
  }

  // Nothing has been written before the root itself is available.
  if (!isRootProduced(fixture)) {
    return modelsByRootValue;
  }
  const rootModel = collectModel([
    fixture.rootPromise == null ? fixture.model : fixture.resolvedModel,
  ]);
  // A result that the source has not produced yet has not written anything.
  separateValues.forEach(value => {
    if (isOutlined(fixture, value)) {
      // Its entries are not results of their own.
      outlinedModels.set(
        value,
        collectModel(getValueDependencies(fixture, value), null, [], false),
      );
      return;
    }
    const metadata = fixture.valueMetadata.get(value);
    if (metadata.type === 'element') {
      if (isElementProduced(metadata)) {
        collectModel([metadata.renderedElement]);
      }
    } else if (metadata.type === 'function') {
      boundArgumentModels.set(value, collectModel(metadata.bound));
    } else if (metadata.type === 'promise') {
      if (metadata.state === 'fulfilled') {
        collectModel([metadata.value]);
      }
    } else if (metadata.type === 'stream') {
      for (let i = 0; i < metadata.items.length; i++) {
        if (!metadata.events[i].released) {
          break;
        }
        collectModel([metadata.items[i]]);
      }
    }
  });
  boundArgumentModels.forEach((argumentModel, fn) => {
    modelsByValue
      .get(fn)
      .forEach(model => model.referencedModels.add(argumentModel));
  });
  // The row of a Set, a Map or an iterator is written while a model that
  // holds the value is written. Any of them may have been the one.
  const holders = new Map();
  outlinedModels.forEach((outlinedModel, value) => {
    holders.set(outlinedModel, modelsByValue.get(value));
    modelsByValue
      .get(value)
      .forEach(model => model.referencedModels.add(outlinedModel));
  });
  // An element's props are a model of their own, inside a model that
  // contains the element. This finds the models a model is written inside
  // of, including itself.
  const ownersByModel = new Map();
  const getOwners = model => {
    let owners = ownersByModel.get(model);
    if (owners === undefined) {
      owners = [model];
      const seen = new Set(owners);
      const add = owner => {
        if (!seen.has(owner)) {
          seen.add(owner);
          owners.push(owner);
        }
      };
      for (let i = 0; i < owners.length; i++) {
        owners[i].parents.forEach(add);
        (holders.get(owners[i]) || []).forEach(add);
      }
      ownersByModel.set(model, owners);
    }
    return owners;
  };
  modelsByValue.forEach(models => {
    // The root is written first, so an object that is in the root is written
    // there. Otherwise any model that contains the object may have written it,
    // and the others refer to it.
    const rootModels = models.filter(model =>
      getOwners(model).includes(rootModel),
    );
    models.forEach(model => {
      const possibleSources =
        rootModels.length > 0
          ? rootModels
          : models.filter(other => other !== model);
      possibleSources.forEach(source => {
        getOwners(source).forEach(owner => model.referencedModels.add(owner));
      });
    });
  });
  return modelsByRootValue;
}

// Returns a function that takes a value and returns the models its result may
// depend on. Working this out is slow, so one lookup is shared by all the
// checks that run after the same event. Create a new one after the next event.
function createModelLookup(fixture) {
  let modelsByRootValue = null;
  return value => {
    if (modelsByRootValue === null) {
      modelsByRootValue = collectModels(fixture);
    }
    const model = modelsByRootValue.get(value);
    if (model === undefined) {
      return [];
    }
    const models = [model];
    const seen = new Set(models);
    for (let i = 0; i < models.length; i++) {
      models[i].referencedModels.forEach(next => {
        if (!seen.has(next)) {
          seen.add(next);
          models.push(next);
        }
      });
    }
    return models;
  };
}

// value: what the result fulfills with.
// inputsReady: the result's own inputs are released or one of them failed.
// errors: the errors of its own released inputs.
// models: the other models that may have written one of its objects.
function getResultExpectation(value, inputsReady, errors, models) {
  return {
    value,
    canFulfill: inputsReady && errors.length === 0,
    errors: (inputsReady ? errors : []).concat(getModelErrors(models)),
    // If one of the result's own inputs failed, it has to be rejected now,
    // even if another model it may depend on is still loading.
    mustSettle:
      inputsReady &&
      (errors.length > 0 ||
        models.every(model => canSettle(Array.from(model.events)))),
  };
}

function getRootExpectation(fixture, value, findModels) {
  const events = getRequiredEvents(fixture, value);
  const produced = isRootProduced(fixture);
  return getResultExpectation(
    value,
    produced && canSettle(events),
    getReleasedErrors(events),
    produced ? findModels(value) : [],
  );
}

function getPromiseExpectation(fixture, metadata, findModels) {
  const valueMetadata = fixture.valueMetadata.get(metadata.value);
  const events = getRequiredEvents(fixture, metadata.value);
  const isElement =
    valueMetadata !== undefined && valueMetadata.type === 'element';
  if (isElement && valueMetadata.renderEvent !== undefined) {
    // A Promise resolving to a Server Component waits for its output.
    events.push(valueMetadata.renderEvent);
  }
  const produced =
    metadata.state === 'fulfilled' &&
    (!isElement || isElementProduced(valueMetadata));
  let errors;
  if (metadata.state === 'rejected') {
    errors = [fixture.valueMetadata.get(metadata.reason)];
  } else if (isElement && valueMetadata.failure !== undefined) {
    errors = [fixture.valueMetadata.get(valueMetadata.failure)];
  } else {
    errors = getReleasedErrors(events);
  }
  return getResultExpectation(
    metadata.value,
    metadata.state === 'rejected' || (produced && canSettle(events)),
    errors,
    // Until the result's own value is available, another model's error is
    // not a reason for it to be rejected.
    produced ? findModels(metadata.value) : [],
  );
}

function getRenderExpectation(fixture, element, findModels) {
  const metadata = fixture.valueMetadata.get(element);
  const output = metadata.renderedElement;
  const events = (fixture.requiredEvents.get(element) || []).concat(
    getRequiredEvents(fixture, element.props),
    output === undefined ? [] : getRequiredEvents(fixture, output.props),
  );
  const produced = isElementProduced(metadata);
  return getResultExpectation(
    metadata.html,
    produced && canSettle(events),
    metadata.failure === undefined
      ? getReleasedErrors(events)
      : [fixture.valueMetadata.get(metadata.failure)],
    produced
      ? findModels(element).concat(
          findModels(element.props),
          output === undefined
            ? []
            : findModels(output).concat(findModels(output.props)),
        )
      : [],
  );
}

function getStreamExpectations(fixture, metadata) {
  const items = metadata.items;
  const isProducedThrough = i =>
    areAllEventsReleased(metadata.events.slice(0, i + 1));
  const isClosed = () => areAllEventsReleased(metadata.events);
  const getStreamErrors = () =>
    isClosed() && metadata.failure !== undefined
      ? [fixture.valueMetadata.get(metadata.failure)]
      : [];
  const canSettleThrough = i => {
    for (let j = 0; j <= i; j++) {
      if (!canSettle(getRequiredEvents(fixture, items[j]))) {
        return false;
      }
    }
    return true;
  };
  const getModelsThrough = (i, findModels) =>
    items.slice(0, i + 1).flatMap(findModels);
  return {
    getItemExpectation(i, findModels) {
      const errors = getReleasedErrors(getRequiredEvents(fixture, items[i]));
      const expectation = getResultExpectation(
        items[i],
        isProducedThrough(i) && canSettleThrough(i),
        errors,
        isProducedThrough(i) ? getModelsThrough(i, findModels) : [],
      );
      // A stream error discards queued items. This read may receive an error
      // from a later item, even while an earlier item's inputs are pending.
      const laterErrors = items
        .slice(i + 1)
        .filter((item, offset) => isProducedThrough(i + 1 + offset))
        .flatMap(item => getReleasedErrors(getRequiredEvents(fixture, item)))
        .concat(getStreamErrors());
      const referenceErrors = items
        .slice(i)
        .filter((item, offset) => isProducedThrough(i + offset))
        .flatMap(item => getModelErrors(findModels(item)));
      if (laterErrors.length > 0 || referenceErrors.length > 0) {
        expectation.errors = laterErrors.concat(referenceErrors, errors);
      }
      // Reads settle in order. An earlier item may still be waiting for
      // another model that wrote one of its objects first, and then this
      // item waits behind it, even if one of its own inputs has failed.
      if (
        i > 0 &&
        !getModelsThrough(i - 1, findModels).every(model =>
          canSettle(Array.from(model.events)),
        )
      ) {
        expectation.mustSettle = false;
      }
      return expectation;
    },
    getEndExpectation(findModels) {
      const errors = getStreamErrors();
      return getResultExpectation(
        undefined,
        isClosed() && (errors.length > 0 || canSettleThrough(items.length - 1)),
        errors,
        isClosed() ? getModelsThrough(items.length - 1, findModels) : [],
      );
    },
  };
}

module.exports = {
  separateResultTypes,
  getRequiredEvents,
  getReleasedErrors,
  areAllEventsReleased,
  createModelLookup,
  getRootExpectation,
  getPromiseExpectation,
  getRenderExpectation,
  getStreamExpectations,
};
