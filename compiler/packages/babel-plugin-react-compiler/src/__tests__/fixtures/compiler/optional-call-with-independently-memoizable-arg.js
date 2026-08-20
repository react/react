function Component(props) {
  const x = makeOptionalFunction(props);
  // for a regular call, the JSX element could be independently memoized
  // since it is an immutable value. however, because the call is optional,
  // we can't extract out independent memoization for the element w/o
  // forcing that argument to evaluate unconditionally
  const y = x?.(
    <div>
      <span>{props.text}</span>
    </div>
  );
  return y;
}
