function testMemberUpdateSemantics() {
  const plain = {
    postIncrement: 0,
    preIncrement: 0,
    postDecrement: 2,
    preDecrement: 2,
  };
  const plainResults = {
    postIncrement: plain.postIncrement++,
    preIncrement: ++plain.preIncrement,
    postDecrement: plain.postDecrement--,
    preDecrement: --plain.preDecrement,
  };

  const evaluationLog = [];
  const computed = {value: 5};
  const getObject = () => {
    evaluationLog.push('object');
    return computed;
  };
  const getKey = () => {
    evaluationLog.push('key');
    return 'value';
  };
  const computedResult = getObject()[getKey()]++;

  const array = [10, 20];
  let index = 0;
  const arrayResult = array[index++]++;

  const accessorLog = [];
  const accessorState = {value: 3};
  const accessor = {};
  Object.defineProperty(accessor, 'value', {
    get: () => {
      accessorLog.push(`get:${accessorState.value}`);
      return accessorState.value;
    },
    set: value => {
      accessorLog.push(`set:${value}`);
      accessorState.value = value;
    },
  });
  const accessorPostfix = accessor.value++;
  const accessorPrefix = ++accessor.value;

  const proxyLog = [];
  const proxyTarget = {value: 7};
  const proxy = new Proxy(proxyTarget, {
    get(target, property) {
      proxyLog.push(`get:${String(property)}`);
      return target[property];
    },
    set(target, property, value) {
      proxyLog.push(`set:${String(property)}:${value}`);
      target[property] = value;
      return true;
    },
  });
  const proxyPostfix = proxy.value++;
  const proxyPrefixDecrement = --proxy.value;

  const bigint = {value: BigInt(1)};
  const bigintPostfixIncrement = bigint.value++;
  const bigintPrefixIncrement = ++bigint.value;
  const bigintPostfixDecrement = bigint.value--;
  const bigintPrefixDecrement = --bigint.value;

  const numericString = {value: '1'};
  const numericStringResult = numericString.value++;

  return {
    plain: {results: plainResults, values: plain},
    computed: {
      result: computedResult,
      value: computed.value,
      evaluationLog,
    },
    array: {result: arrayResult, index, values: array},
    accessor: {
      postfix: accessorPostfix,
      prefix: accessorPrefix,
      value: accessorState.value,
      log: accessorLog,
    },
    proxy: {
      postfix: proxyPostfix,
      prefixDecrement: proxyPrefixDecrement,
      value: proxyTarget.value,
      log: proxyLog,
    },
    bigint: {
      postfixIncrement: String(bigintPostfixIncrement),
      prefixIncrement: String(bigintPrefixIncrement),
      postfixDecrement: String(bigintPostfixDecrement),
      prefixDecrement: String(bigintPrefixDecrement),
      value: String(bigint.value),
    },
    numericString: {
      result: numericStringResult,
      value: numericString.value,
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: testMemberUpdateSemantics,
  params: [],
};
