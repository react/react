'use client';

import * as React from 'react';

import Container from './Container.js';

export default function ShowMore({children}) {
  const [show, setShow] = React.useState(false);
  if (!show) {
    return <button onClick={() => setShow(true)}>Show More</button>;
  }
  return <Container>{children}</Container>;
}
