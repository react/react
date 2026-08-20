import {setProperty} from 'shared-runtime';

function useFoo({o, branchCheck}: {o: {value: number}; branchCheck: boolean}) {
  let x = {};
  if (branchCheck) {
    setProperty(x, o.value);
  } else {
    if (o.value) {
      setProperty(x, o.value);
    } else {
      setProperty(x, o.value);
    }
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{o: {value: 2}, branchCheck: false}],
};
