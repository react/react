/** @flow */

import * as React from 'react';
import {Fragment, useEffect, useRef, useState} from 'react';

// $FlowFixMe[missing-local-annot]
function WarnDuringRender({children = null}) {
  console.warn('This warning fires during every render');
  return children;
}

// $FlowFixMe[missing-local-annot]
function WarnOnMount({children = null}) {
  useEffect(() => {
    console.warn('This warning fires on initial mount only');
  }, []);
  return children;
}

// $FlowFixMe[missing-local-annot]
function WarnOnUpdate({children = null}) {
  const didMountRef = useRef(false);
  useEffect(() => {
    if (didMountRef.current) {
      console.warn('This warning fires on every update');
    } else {
      didMountRef.current = true;
    }
  });
  return children;
}

// $FlowFixMe[missing-local-annot]
function WarnOnUnmount({children = null}) {
  useEffect(() => {
    return () => {
      console.warn('This warning fires on unmount');
    };
  }, []);
  return children;
}

// $FlowFixMe[missing-local-annot]
function ErrorDuringRender({children = null}) {
  console.error('This error fires during every render');
  return children;
}

// $FlowFixMe[missing-local-annot]
function ErrorOnMount({children = null}) {
  useEffect(() => {
    console.error('This error fires on initial mount only');
  }, []);
  return children;
}

// $FlowFixMe[missing-local-annot]
function ErrorOnUpdate({children = null}) {
  const didMountRef = useRef(false);
  useEffect(() => {
    if (didMountRef.current) {
      console.error('This error fires on every update');
    } else {
      didMountRef.current = true;
    }
  });
  return children;
}

// $FlowFixMe[missing-local-annot]
function ErrorOnUnmount({children = null}) {
  useEffect(() => {
    return () => {
      console.error('This error fires on unmount');
    };
  }, []);
  return children;
}

// $FlowFixMe[missing-local-annot]
function ErrorAndWarningDuringRender({children = null}) {
  console.warn('This warning fires during every render');
  console.error('This error fires during every render');
  return children;
}

// $FlowFixMe[missing-local-annot]
function ErrorAndWarningOnMount({children = null}) {
  useEffect(() => {
    console.warn('This warning fires on initial mount only');
    console.error('This error fires on initial mount only');
  }, []);
  return children;
}

// $FlowFixMe[missing-local-annot]
function ErrorAndWarningOnUpdate({children = null}) {
  const didMountRef = useRef(false);
  useEffect(() => {
    if (didMountRef.current) {
      console.warn('This warning fires on every update');
      console.error('This error fires on every update');
    } else {
      didMountRef.current = true;
    }
  });
  return children;
}

// $FlowFixMe[missing-local-annot]
function ErrorAndWarningOnUnmount({children = null}) {
  useEffect(() => {
    return () => {
      console.warn('This warning fires on unmount');
      console.error('This error fires on unmount');
    };
  }, []);
  return children;
}

// $FlowFixMe[missing-local-annot]
function ReallyLongErrorMessageThatWillCauseTextToBeTruncated({
  children = null,
}) {
  console.error(
    'This error is a really long error message that should cause the text to be truncated in DevTools',
  );
  return children;
}

// $FlowFixMe[missing-local-annot]
function ErrorWithMultipleArgs({children = null}) {
  console.error('This error', 'passes console', 4, 'arguments');
  return children;
}

// $FlowFixMe[missing-local-annot]
function ErrorWithStringSubstitutions({children = null}) {
  console.error('This error uses "%s" substitutions', 'string');
  return children;
}

// $FlowFixMe[missing-local-annot]
function ReactErrorOnHostComponent({children = null}) {
  return <div data-camelCasedAttribute="should-lower-case">{children}</div>;
}

// $FlowFixMe[missing-local-annot]
function DuplicateWarningsAndErrors({children = null}) {
  console.warn('this warning is logged twice per render');
  console.warn('this warning is logged twice per render');
  console.error('this error is logged twice per render');
  console.error('this error is logged twice per render');
  return <div data-camelCasedAttribute="should-lower-case">{children}</div>;
}

// $FlowFixMe[missing-local-annot]
function MultipleWarningsAndErrors({children = null}) {
  console.warn('this is the first warning logged');
  console.warn('this is the second warning logged');
  console.error('this is the first error logged');
  console.error('this is the second error logged');
  return <div data-camelCasedAttribute="should-lower-case">{children}</div>;
}

// $FlowFixMe[missing-local-annot]
function ComponentWithMissingKey({children}) {
  return [<div />];
}

function ComponentWithSymbolWarning() {
  console.warn('this is a symbol', Symbol('foo'));
  console.error('this is a symbol', Symbol.for('bar'));
  return null;
}

export default function ErrorsAndWarnings(): React.Node {
  const [count, setCount] = useState(0);
  const handleClick = () => setCount(count + 1);
  return (
    <Fragment>
      <h1>Inline warnings</h1>
      <button onClick={handleClick}>Update {count > 0 ? count : ''}</button>
      <ComponentWithMissingKey />
      <WarnDuringRender />
      <WarnOnMount />
      <WarnOnUpdate />
      {count === 0 ? <WarnOnUnmount /> : null}
      {count === 0 ? <WarnOnMount /> : null}
      <ErrorDuringRender />
      <ErrorOnMount />
      <ErrorOnUpdate />
      {count === 0 ? <ErrorOnUnmount /> : null}
      <ErrorAndWarningDuringRender />
      <ErrorAndWarningOnMount />
      <ErrorAndWarningOnUpdate />
      {count === 0 ? <ErrorAndWarningOnUnmount /> : null}
      <ErrorWithMultipleArgs />
      <ErrorWithStringSubstitutions />
      <ReactErrorOnHostComponent />
      <ReallyLongErrorMessageThatWillCauseTextToBeTruncated />
      <DuplicateWarningsAndErrors />
      <MultipleWarningsAndErrors />
      <ComponentWithSymbolWarning />
    </Fragment>
  );
}
