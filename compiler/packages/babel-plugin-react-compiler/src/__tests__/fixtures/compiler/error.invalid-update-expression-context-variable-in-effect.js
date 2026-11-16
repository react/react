import {useEffect} from 'react';

function Component() {
  let local = 0;

  const reassignLocal = newValue => {
    local++;
  };

  const onMount = newValue => {
    reassignLocal('hello');

    if (local === newValue) {
      console.log('`local` was updated!');
    } else {
      throw new Error('`local` not updated!');
    }
  };

  useEffect(() => {
    onMount();
  }, [onMount]);

  return null;
}
