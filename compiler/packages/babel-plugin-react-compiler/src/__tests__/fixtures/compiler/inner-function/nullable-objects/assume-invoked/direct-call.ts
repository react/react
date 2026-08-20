import {useState} from 'react';
import {useIdentity} from 'shared-runtime';

function useMakeCallback({obj}: {obj: {value: number}}) {
  const [state, setState] = useState(0);
  const cb = () => {
    if (obj.value !== state) setState(obj.value);
  };
  useIdentity();
  cb();
  return [cb];
}
export const FIXTURE_ENTRYPOINT = {
  fn: useMakeCallback,
  params: [{obj: {value: 1}}],
  sequentialRenders: [{obj: {value: 1}}, {obj: {value: 2}}],
};
