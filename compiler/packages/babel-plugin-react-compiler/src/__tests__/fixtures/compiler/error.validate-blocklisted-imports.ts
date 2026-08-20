// @validateBlocklistedImports:["DangerousImport"]
import {foo} from 'DangerousImport';
import {useIdentity} from 'shared-runtime';

function useHook() {
  useIdentity(foo);
  return;
}
