let x = {a: 42};

function Component(props) {
  foo(() => {
    x.a = 10;
    x.a = 20;
  });
}
