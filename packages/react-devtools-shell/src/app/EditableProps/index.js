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
  Component,
  forwardRef,
  Fragment,
  memo,
  useCallback,
  useDebugValue,
  useEffect,
  useReducer,
  useState,
} from 'react';

const initialData = {foo: 'FOO', bar: 'BAR'};

// $FlowFixMe[missing-local-annot]
function reducer(state, action: {type: string}) {
  switch (action.type) {
    case 'swap':
      return {foo: state.bar, bar: state.foo};
    default:
      throw new Error();
  }
}

type StatefulFunctionProps = {name: string};

function StatefulFunction({name}: StatefulFunctionProps) {
  const [count, updateCount] = useState(0);
  const debouncedCount = useDebounce(count, 1000);
  const handleUpdateCountClick = useCallback(
    () => updateCount(count + 1),
    [count],
  );

  const [data, dispatch] = useReducer(reducer, initialData);
  const handleUpdateReducerClick = useCallback(
    () => dispatch({type: 'swap'}),
    [],
  );

  return (
    <ul>
      <li>Name: {name}</li>
      <li>
        <button onClick={handleUpdateCountClick}>
          Debounced count: {debouncedCount}
        </button>
      </li>
      <li>
        Reducer state: foo "{data.foo}", bar "{data.bar}"
      </li>
      <li>
        <button onClick={handleUpdateReducerClick}>Swap reducer values</button>
      </li>
    </ul>
  );
}

const BoolContext = createContext(true);
BoolContext.displayName = 'BoolContext';

type Props = {name: string, toggle: boolean};
type State = {cities: Array<string>, state: string};

class StatefulClass extends Component<Props, State> {
  static contextType: ReactContext<boolean> = BoolContext;

  state: State = {
    cities: ['San Francisco', 'San Jose'],
    state: 'California',
  };

  // $FlowFixMe[missing-local-annot]
  handleChange = ({target}): any =>
    this.setState({
      state: target.value,
    });

  render(): any {
    return (
      <ul>
        <li>Name: {this.props.name}</li>
        <li>Toggle: {this.props.toggle ? 'true' : 'false'}</li>
        <li>
          State: <input value={this.state.state} onChange={this.handleChange} />
        </li>
        <li>Cities: {this.state.cities.join(', ')}</li>
        <li>Context: {this.context ? 'true' : 'false'}</li>
      </ul>
    );
  }
}

const MemoizedStatefulClass = memo(StatefulClass);
const MemoizedStatefulFunction = memo(StatefulFunction);

const ForwardRef = forwardRef<{name: string}, HTMLUListElement>(
  ({name}, ref) => {
    const [count, updateCount] = useState(0);
    const debouncedCount = useDebounce(count, 1000);
    const handleUpdateCountClick = useCallback(
      () => updateCount(count + 1),
      [count],
    );
    return (
      <ul ref={ref}>
        <li>Name: {name}</li>
        <li>
          <button onClick={handleUpdateCountClick}>
            Debounced count: {debouncedCount}
          </button>
        </li>
      </ul>
    );
  },
);

export default function EditableProps(): React.Node {
  return (
    <Fragment>
      <h1>Editable props</h1>
      <strong>Class</strong>
      <StatefulClass name="Brian" toggle={true} />
      <strong>Function</strong>
      <StatefulFunction name="Brian" />
      <strong>Memoized Class</strong>
      <MemoizedStatefulClass name="Brian" toggle={true} />
      <strong>Memoized Function</strong>
      <MemoizedStatefulFunction name="Brian" />
      <strong>Forward Ref</strong>
      <ForwardRef name="Brian" />
    </Fragment>
  );
}

// Below copied from https://usehooks.com/
function useDebounce(value: number, delay: number) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Show the value in DevTools
  useDebugValue(debouncedValue);

  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay], // Only re-call effect if value or delay changes
  );

  return debouncedValue;
}
// Above copied from https://usehooks.com/
