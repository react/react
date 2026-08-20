import * as React from 'react';
import {useState, useMemo} from 'react';

function Component(props) {
  const [x] = useState(0);
  const expensiveNumber = useMemo(() => calculateExpensiveNumber(x), [x]);

  return <div>{expensiveNumber}</div>;
}

function Component2(props) {
  const [x] = useState(0);
  const expensiveNumber = useMemo(() => calculateExpensiveNumber(x), [x]);

  return <div>{expensiveNumber}</div>;
}
