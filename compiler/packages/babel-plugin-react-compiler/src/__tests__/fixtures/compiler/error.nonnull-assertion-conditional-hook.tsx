import * as React from 'react';

function Component({enabled}) {
  if (enabled) {
    React!.useState(0);
  }
  return <div />;
}
