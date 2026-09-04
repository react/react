function useFoo() {
  let counter = '2';
  return [null].map(() => {
    const postfixIncrement = counter++;
    const prefixIncrement = ++counter;
    const postfixDecrement = counter--;
    const prefixDecrement = --counter;
    return {
      counter,
      postfixIncrement,
      prefixIncrement,
      postfixDecrement,
      prefixDecrement,
    };
  })[0];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
