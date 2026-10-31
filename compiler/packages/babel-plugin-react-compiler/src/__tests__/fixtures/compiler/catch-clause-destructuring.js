import {useEffect} from 'react';

export function Foo() {
  useEffect(() => {
    try {
      doSomething();
    } catch ({status}) {
      log(status);
    }
  }, []);
}

export function Bar() {
  useEffect(() => {
    try {
      doSomething();
    } catch ([error]) {
      log(error);
    }
  }, []);
}
