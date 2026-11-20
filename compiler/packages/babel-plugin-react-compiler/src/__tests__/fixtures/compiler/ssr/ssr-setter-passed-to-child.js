// @outputMode:"ssr"
import {useState} from 'react';

function Dialog({open, onOpenChange}) {
  return (
    <div>
      {String(open)} {typeof onOpenChange}
    </div>
  );
}

function Component() {
  // The setter is passed to a child, so the state is not inlined
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
