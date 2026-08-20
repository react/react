'use client';

import {ReactNode, useRef} from 'react';

export function Dialog({
  trigger,
  children,
}: {
  trigger: ReactNode;
  children: ReactNode;
}) {
  let ref = useRef<HTMLDialogElement | null>(null);
  return (
    <>
      <button onClick={() => ref.current?.showModal()}>{trigger}</button>
      <dialog ref={ref} onSubmit={() => ref.current?.close()}>
        {children}
      </dialog>
    </>
  );
}
