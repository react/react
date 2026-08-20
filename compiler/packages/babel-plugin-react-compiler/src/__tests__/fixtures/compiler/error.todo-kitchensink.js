function foo([a, b], {c, d, e = 'e'}, f = 'f', ...args) {
  let i = 0;
  var x = [];

  class Bar {
    #secretSauce = 42;
    constructor() {
      console.log(this.#secretSauce);
    }
  }

  const g = {b() {}, c: () => {}};
  const {z, aa = 'aa'} = useCustom();

  <Button haha={1}></Button>;
  <Button>{/** empty */}</Button>;

  const j = function bar([quz, qux], ...args) {};

  for (; i < 3; i += 1) {
    x.push(i);
  }
  for (; i < 3; ) {
    break;
  }
  for (;;) {
    break;
  }

  graphql`
    ${g}
  `;

  graphql`\\t\n`;

  for (c of [1, 2]) {
  }
  for ([v] of [[1], [2]]) {
  }
  for ({v} of [{v: 1}, {v: 2}]) {
  }

  for (let x in {a: 1}) {
  }

  let updateIdentifier = 0;
  --updateIdentifier;
  ++updateIdentifier;
  updateIdentifier.y++;
  updateIdentifier.y--;

  switch (i) {
    case 1 + 1: {
    }
    case foo(): {
    }
    case x.y: {
    }
    default: {
    }
  }

  function component(a) {
    // Add support for function declarations once we support `var` hoisting.
    function t() {}
    t();
  }
}

let moduleLocal = false;
