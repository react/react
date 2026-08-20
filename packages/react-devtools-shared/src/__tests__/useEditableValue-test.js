/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getVersionedRenderImplementation} from './utils';

describe('useEditableValue', () => {
  let act;
  let React;
  let useEditableValue;

  beforeEach(() => {
    const utils = require('./utils');
    act = utils.act;

    React = require('react');

    useEditableValue = require('../devtools/views/hooks').useEditableValue;
  });

  const {render} = getVersionedRenderImplementation();

  it('should not cause a loop with values like NaN', () => {
    let state;

    function Example({value = NaN}) {
      const tuple = useEditableValue(value);
      state = tuple[0];
      return null;
    }

    act(() => render(<Example />));

    expect(state.editableValue).toEqual('NaN');
    expect(state.externalValue).toEqual(NaN);
    expect(state.parsedValue).toEqual(NaN);
    expect(state.hasPendingChanges).toBe(false);
    expect(state.isValid).toBe(true);
  });

  it('should override editable state when external props are updated', () => {
    let state;

    function Example({value}) {
      const tuple = useEditableValue(value);
      state = tuple[0];
      return null;
    }

    act(() => render(<Example value={1} />));

    expect(state.editableValue).toEqual('1');
    expect(state.externalValue).toEqual(1);
    expect(state.parsedValue).toEqual(1);
    expect(state.hasPendingChanges).toBe(false);
    expect(state.isValid).toBe(true);

    // If there are NO pending changes,
    // an update to the external prop value should override the local/pending value.
    act(() => render(<Example value={2} />));

    expect(state.editableValue).toEqual('2');
    expect(state.externalValue).toEqual(2);
    expect(state.parsedValue).toEqual(2);
    expect(state.hasPendingChanges).toBe(false);
    expect(state.isValid).toBe(true);
  });

  it('should not override editable state when external props are updated if there are pending changes', () => {
    let dispatch, state;

    function Example({value}) {
      const tuple = useEditableValue(value);
      state = tuple[0];
      dispatch = tuple[1];
      return null;
    }

    act(() => render(<Example value={1} />));

    expect(state.editableValue).toEqual('1');
    expect(state.externalValue).toEqual(1);
    expect(state.parsedValue).toEqual(1);
    expect(state.hasPendingChanges).toBe(false);
    expect(state.isValid).toBe(true);

    // Update (local) editable state.
    act(() =>
      dispatch({
        type: 'UPDATE',
        editableValue: '2',
        externalValue: 1,
      }),
    );
    expect(state.editableValue).toEqual('2');
    expect(state.externalValue).toEqual(1);
    expect(state.parsedValue).toEqual(2);
    expect(state.hasPendingChanges).toBe(true);
    expect(state.isValid).toBe(true);

    // If there ARE pending changes,
    // an update to the external prop value should NOT override the local/pending value.
    act(() => render(<Example value={3} />));

    expect(state.editableValue).toEqual('2');
    expect(state.externalValue).toEqual(3);
    expect(state.parsedValue).toEqual(2);
    expect(state.hasPendingChanges).toBe(true);
    expect(state.isValid).toBe(true);
  });

  it('should parse edits to ensure valid JSON', () => {
    let dispatch, state;

    function Example({value}) {
      const tuple = useEditableValue(value);
      state = tuple[0];
      dispatch = tuple[1];
      return null;
    }

    act(() => render(<Example value={1} />));

    expect(state.editableValue).toEqual('1');
    expect(state.externalValue).toEqual(1);
    expect(state.parsedValue).toEqual(1);
    expect(state.hasPendingChanges).toBe(false);
    expect(state.isValid).toBe(true);

    // Update (local) editable state.
    act(() =>
      dispatch({
        type: 'UPDATE',
        editableValue: '"a',
        externalValue: 1,
      }),
    );
    expect(state.editableValue).toEqual('"a');
    expect(state.externalValue).toEqual(1);
    expect(state.parsedValue).toEqual(1);
    expect(state.hasPendingChanges).toBe(true);
    expect(state.isValid).toBe(false);
  });

  it('should reset to external value upon request', () => {
    let dispatch, state;

    function Example({value}) {
      const tuple = useEditableValue(value);
      state = tuple[0];
      dispatch = tuple[1];
      return null;
    }

    act(() => render(<Example value={1} />));

    expect(state.editableValue).toEqual('1');
    expect(state.externalValue).toEqual(1);
    expect(state.parsedValue).toEqual(1);
    expect(state.hasPendingChanges).toBe(false);
    expect(state.isValid).toBe(true);

    // Update (local) editable state.
    act(() =>
      dispatch({
        type: 'UPDATE',
        editableValue: '2',
        externalValue: 1,
      }),
    );
    expect(state.editableValue).toEqual('2');
    expect(state.externalValue).toEqual(1);
    expect(state.parsedValue).toEqual(2);
    expect(state.hasPendingChanges).toBe(true);
    expect(state.isValid).toBe(true);

    // Reset editable state
    act(() =>
      dispatch({
        type: 'RESET',
        externalValue: 1,
      }),
    );
    expect(state.editableValue).toEqual('1');
    expect(state.externalValue).toEqual(1);
    expect(state.parsedValue).toEqual(1);
    expect(state.hasPendingChanges).toBe(false);
    expect(state.isValid).toBe(true);
  });
});
