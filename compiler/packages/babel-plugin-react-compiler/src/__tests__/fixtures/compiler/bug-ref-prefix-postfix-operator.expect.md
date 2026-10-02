
## Input

```javascript
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

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function testMemberUpdateSemantics() {
  const $ = _c(28);
  let plain;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    plain = {
      postIncrement: 0,
      preIncrement: 0,
      postDecrement: 2,
      preDecrement: 2,
    };
    let t1 = plain.postIncrement;
    const t2 = t1++;
    plain.postIncrement = t1;
    let t3 = plain.preIncrement;
    const t4 = ++t3;
    plain.preIncrement = t3;
    let t5 = plain.postDecrement;
    const t6 = t5--;
    plain.postDecrement = t5;
    let t7 = plain.preDecrement;
    const t8 = --t7;
    plain.preDecrement = t7;
    t0 = {
      postIncrement: t2,
      preIncrement: t4,
      postDecrement: t6,
      preDecrement: t8,
    };
    $[0] = plain;
    $[1] = t0;
  } else {
    plain = $[0];
    t0 = $[1];
  }
  const plainResults = t0;
  let computed;
  let evaluationLog;
  let t1;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    evaluationLog = [];
    computed = { value: 5 };
    const getObject = () => {
      evaluationLog.push("object");
      return computed;
    };
    const getKey = () => {
      evaluationLog.push("key");
      return "value";
    };
    const t2 = getObject();
    const t3 = getKey();
    let t4 = t2[t3];
    t1 = t4++;
    t2[t3] = t4;
    $[2] = computed;
    $[3] = evaluationLog;
    $[4] = t1;
  } else {
    computed = $[2];
    evaluationLog = $[3];
    t1 = $[4];
  }
  const computedResult = t1;
  let array;
  let t2;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    array = [10, 20];
    let t3 = array[0];
    t2 = t3++;
    array[0] = t3;
    $[5] = array;
    $[6] = t2;
  } else {
    array = $[5];
    t2 = $[6];
  }
  const arrayResult = t2;
  let accessorLog;
  let accessorPostfix;
  let accessorState;
  let t3;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    accessorLog = [];
    accessorState = { value: 3 };
    const accessor = {};
    Object.defineProperty(accessor, "value", {
      get: () => {
        accessorLog.push(`get:${accessorState.value}`);
        return accessorState.value;
      },
      set: (value) => {
        accessorLog.push(`set:${value}`);
        accessorState.value = value;
      },
    });
    let t4 = accessor.value;
    const t5 = t4++;
    accessor.value = t4;
    accessorPostfix = t5;
    let t6 = accessor.value;
    t3 = ++t6;
    accessor.value = t6;
    $[7] = accessorLog;
    $[8] = accessorPostfix;
    $[9] = accessorState;
    $[10] = t3;
  } else {
    accessorLog = $[7];
    accessorPostfix = $[8];
    accessorState = $[9];
    t3 = $[10];
  }
  const accessorPrefix = t3;
  let proxyLog;
  let proxyPostfix;
  let proxyTarget;
  let t4;
  if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
    proxyLog = [];
    proxyTarget = { value: 7 };
    const proxy = new Proxy(proxyTarget, {
      get(target, property) {
        proxyLog.push(`get:${String(property)}`);
        return target[property];
      },
      set(target_0, property_0, value_0) {
        proxyLog.push(`set:${String(property_0)}:${value_0}`);
        target_0[property_0] = value_0;
        return true;
      },
    });
    let t5 = proxy.value;
    const t6 = t5++;
    proxy.value = t5;
    proxyPostfix = t6;
    let t7 = proxy.value;
    t4 = --t7;
    proxy.value = t7;
    $[11] = proxyLog;
    $[12] = proxyPostfix;
    $[13] = proxyTarget;
    $[14] = t4;
  } else {
    proxyLog = $[11];
    proxyPostfix = $[12];
    proxyTarget = $[13];
    t4 = $[14];
  }
  const proxyPrefixDecrement = t4;
  let bigint;
  let bigintPostfixDecrement;
  let bigintPostfixIncrement;
  let bigintPrefixIncrement;
  let t5;
  if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
    bigint = { value: BigInt(1) };
    let t6 = bigint.value;
    const t7 = t6++;
    bigint.value = t6;
    bigintPostfixIncrement = t7;
    let t8 = bigint.value;
    const t9 = ++t8;
    bigint.value = t8;
    bigintPrefixIncrement = t9;
    let t10 = bigint.value;
    const t11 = t10--;
    bigint.value = t10;
    bigintPostfixDecrement = t11;
    let t12 = bigint.value;
    t5 = --t12;
    bigint.value = t12;
    $[15] = bigint;
    $[16] = bigintPostfixDecrement;
    $[17] = bigintPostfixIncrement;
    $[18] = bigintPrefixIncrement;
    $[19] = t5;
  } else {
    bigint = $[15];
    bigintPostfixDecrement = $[16];
    bigintPostfixIncrement = $[17];
    bigintPrefixIncrement = $[18];
    t5 = $[19];
  }
  const bigintPrefixDecrement = t5;
  let numericString;
  let t6;
  if ($[20] === Symbol.for("react.memo_cache_sentinel")) {
    numericString = { value: "1" };
    let t7 = numericString.value;
    t6 = t7++;
    numericString.value = t7;
    $[20] = numericString;
    $[21] = t6;
  } else {
    numericString = $[20];
    t6 = $[21];
  }
  const numericStringResult = t6;
  let t10;
  let t11;
  let t7;
  let t8;
  let t9;
  if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = { results: plainResults, values: plain };
    t8 = { result: computedResult, value: computed.value, evaluationLog };
    t9 = { result: arrayResult, index: 1, values: array };
    t10 = {
      postfix: accessorPostfix,
      prefix: accessorPrefix,
      value: accessorState.value,
      log: accessorLog,
    };
    t11 = {
      postfix: proxyPostfix,
      prefixDecrement: proxyPrefixDecrement,
      value: proxyTarget.value,
      log: proxyLog,
    };
    $[22] = t10;
    $[23] = t11;
    $[24] = t7;
    $[25] = t8;
    $[26] = t9;
  } else {
    t10 = $[22];
    t11 = $[23];
    t7 = $[24];
    t8 = $[25];
    t9 = $[26];
  }
  let t12;
  if ($[27] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = {
      plain: t7,
      computed: t8,
      array: t9,
      accessor: t10,
      proxy: t11,
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
    $[27] = t12;
  } else {
    t12 = $[27];
  }
  return t12;
}

export const FIXTURE_ENTRYPOINT = {
  fn: testMemberUpdateSemantics,
  params: [],
};

```
      
### Eval output
(kind: ok) {"plain":{"results":{"postIncrement":0,"preIncrement":1,"postDecrement":2,"preDecrement":1},"values":{"postIncrement":1,"preIncrement":1,"postDecrement":1,"preDecrement":1}},"computed":{"result":5,"value":6,"evaluationLog":["object","key"]},"array":{"result":10,"index":1,"values":[11,20]},"accessor":{"postfix":3,"prefix":5,"value":5,"log":["get:3","set:4","get:4","set:5"]},"proxy":{"postfix":7,"prefixDecrement":7,"value":7,"log":["get:value","set:value:8","get:value","set:value:7"]},"bigint":{"postfixIncrement":"1","prefixIncrement":"3","postfixDecrement":"3","prefixDecrement":"1","value":"1"},"numericString":{"result":1,"value":2}}