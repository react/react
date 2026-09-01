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
