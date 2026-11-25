// @compilationMode:"infer"
import {use} from 'react';

function useThing(Ctx) {
  const v = use(Ctx);
  return {v, w: [v.x]};
}
