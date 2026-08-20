// @validateSourceLocations
import {useEffect, useCallback} from 'react';

function Component({prop1, prop2}) {
  const x = prop1 + prop2;
  const y = x * 2;
  const arr = [x, y];
  const obj = {x, y};
  let destA, destB;
  if (y > 5) {
    [destA, destB] = arr;
  }

  const [a, b] = arr;
  const {x: c, y: d} = obj;
  let sound;

  if (y > 10) {
    sound = 'woof';
  } else {
    sound = 'meow';
  }

  useEffect(() => {
    if (a > 10) {
      console.log(a);
      console.log(sound);
      console.log(destA, destB);
    }
  }, [a, sound, destA, destB]);

  const foo = useCallback(() => {
    return a + b;
  }, [a, b]);

  function bar() {
    return (c + d) * 2;
  }

  console.log('Hello, world!');

  return [y, foo, bar];
}
