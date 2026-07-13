
## Input

```javascript
// @enableNameAnonymousFunctions

import {useCallback, useEffect} from 'react';
import {identity, Stringify, useIdentity} from 'shared-runtime';
import * as SharedRuntime from 'shared-runtime';

function Component(props) {
  function named() {
    const inner = () => props.named;
    const innerIdentity = identity(() => props.named);
    return inner(innerIdentity());
  }
  const callback = useCallback(() => {
    return 'ok';
  }, []);
  const namedVariable = function () {
    return props.namedVariable;
  };
  const methodCall = SharedRuntime.identity(() => props.methodCall);
  const call = identity(() => props.call);
  const builtinElementAttr = <div onClick={() => props.builtinElementAttr} />;
  const namedElementAttr = <Stringify onClick={() => props.namedElementAttr} />;
  const hookArgument = useIdentity(() => props.hookArgument);
  useEffect(() => {
    console.log(props.useEffect);
    JSON.stringify(null, null, () => props.useEffect);
    const g = () => props.useEffect;
    console.log(g());
  }, [props.useEffect]);
  return (
    <>
      {named()}
      {callback()}
      {namedVariable()}
      {methodCall()}
      {call()}
      {builtinElementAttr}
      {namedElementAttr}
      {hookArgument()}
    </>
  );
}

export const TODO_FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      named: '<named>',
      namedVariable: '<namedVariable>',
      methodCall: '<methodCall>',
      call: '<call>',
      builtinElementAttr: '<builtinElementAttr>',
      namedElementAttr: '<namedElementAttr>',
      hookArgument: '<hookArgument>',
      useEffect: '<useEffect>',
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNameAnonymousFunctions

import { useCallback, useEffect } from "react";
import { identity, Stringify, useIdentity } from "shared-runtime";
import * as SharedRuntime from "shared-runtime";

function Component(props) {
  const $ = _c(31);
  let t0;
  if ($[0] !== props.named) {
    t0 = function named() {
      const inner = { "Component[named > inner]": () => props.named }[
        "Component[named > inner]"
      ];
      const innerIdentity = identity(
        { "Component[named > identity()]": () => props.named }[
          "Component[named > identity()]"
        ],
      );
      return inner(innerIdentity());
    };
    $[0] = props.named;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const named = t0;

  const callback = _ComponentCallback;
  let t1;
  if ($[2] !== props.namedVariable) {
    t1 = {
      "Component[namedVariable]": function () {
        return props.namedVariable;
      },
    }["Component[namedVariable]"];
    $[2] = props.namedVariable;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const namedVariable = t1;
  let t2;
  if ($[4] !== props.methodCall) {
    t2 = { "Component[SharedRuntime.identity()]": () => props.methodCall }[
      "Component[SharedRuntime.identity()]"
    ];
    $[4] = props.methodCall;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  const methodCall = SharedRuntime.identity(t2);
  let t3;
  if ($[6] !== props.call) {
    t3 = { "Component[identity()]": () => props.call }["Component[identity()]"];
    $[6] = props.call;
    $[7] = t3;
  } else {
    t3 = $[7];
  }
  const call = identity(t3);
  let t4;
  if ($[8] !== props.builtinElementAttr) {
    t4 = (
      <div
        onClick={
          { "Component[<div>.onClick]": () => props.builtinElementAttr }[
            "Component[<div>.onClick]"
          ]
        }
      />
    );
    $[8] = props.builtinElementAttr;
    $[9] = t4;
  } else {
    t4 = $[9];
  }
  const builtinElementAttr = t4;
  let t5;
  if ($[10] !== props.namedElementAttr) {
    t5 = (
      <Stringify
        onClick={
          { "Component[<Stringify>.onClick]": () => props.namedElementAttr }[
            "Component[<Stringify>.onClick]"
          ]
        }
      />
    );
    $[10] = props.namedElementAttr;
    $[11] = t5;
  } else {
    t5 = $[11];
  }
  const namedElementAttr = t5;
  let t6;
  if ($[12] !== props.hookArgument) {
    t6 = { "Component[useIdentity()]": () => props.hookArgument }[
      "Component[useIdentity()]"
    ];
    $[12] = props.hookArgument;
    $[13] = t6;
  } else {
    t6 = $[13];
  }
  const hookArgument = useIdentity(t6);
  let t7;
  let t8;
  if ($[14] !== props.useEffect) {
    t7 = {
      "Component[useEffect()]": () => {
        console.log(props.useEffect);
        JSON.stringify(
          null,
          null,
          {
            "Component[useEffect() > JSON.stringify()]": () => props.useEffect,
          }["Component[useEffect() > JSON.stringify()]"],
        );
        const g = { "Component[useEffect() > g]": () => props.useEffect }[
          "Component[useEffect() > g]"
        ];
        console.log(g());
      },
    }["Component[useEffect()]"];
    t8 = [props.useEffect];
    $[14] = props.useEffect;
    $[15] = t7;
    $[16] = t8;
  } else {
    t7 = $[15];
    t8 = $[16];
  }
  useEffect(t7, t8);
  let t9;
  if ($[17] !== named) {
    t9 = named();
    $[17] = named;
    $[18] = t9;
  } else {
    t9 = $[18];
  }
  const t10 = callback();
  let t11;
  if ($[19] !== namedVariable) {
    t11 = namedVariable();
    $[19] = namedVariable;
    $[20] = t11;
  } else {
    t11 = $[20];
  }
  const t12 = methodCall();
  const t13 = call();
  let t14;
  if ($[21] !== hookArgument) {
    t14 = hookArgument();
    $[21] = hookArgument;
    $[22] = t14;
  } else {
    t14 = $[22];
  }
  let t15;
  if (
    $[23] !== builtinElementAttr ||
    $[24] !== namedElementAttr ||
    $[25] !== t11 ||
    $[26] !== t12 ||
    $[27] !== t13 ||
    $[28] !== t14 ||
    $[29] !== t9
  ) {
    t15 = (
      <>
        {t9}
        {t10}
        {t11}
        {t12}
        {t13}
        {builtinElementAttr}
        {namedElementAttr}
        {t14}
      </>
    );
    $[23] = builtinElementAttr;
    $[24] = namedElementAttr;
    $[25] = t11;
    $[26] = t12;
    $[27] = t13;
    $[28] = t14;
    $[29] = t9;
    $[30] = t15;
  } else {
    t15 = $[30];
  }
  return t15;
}
function _ComponentCallback() {
  return "ok";
}

export const TODO_FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      named: "<named>",
      namedVariable: "<namedVariable>",
      methodCall: "<methodCall>",
      call: "<call>",
      builtinElementAttr: "<builtinElementAttr>",
      namedElementAttr: "<namedElementAttr>",
      hookArgument: "<hookArgument>",
      useEffect: "<useEffect>",
    },
  ],
};

```
      
### Eval output
(kind: exception) Fixture not implemented