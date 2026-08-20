import {useEffect} from 'react';

export function Foo() {
  useEffect(() => {
    try {
      // do something
    } catch ({status}) {
      // do something
    }
  }, []);
}
