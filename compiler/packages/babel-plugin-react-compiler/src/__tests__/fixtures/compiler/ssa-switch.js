function foo() {
  let x = 1;

  switch (x) {
    case 1: {
      x = x + 1;
      break;
    }
    case 2: {
      x = x + 2;
      break;
    }
    default: {
      x = x + 3;
    }
  }

  let y = x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
