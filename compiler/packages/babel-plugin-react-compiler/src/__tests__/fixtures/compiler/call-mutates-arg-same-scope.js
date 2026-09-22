// When a function with a known aliasing signature definitively mutates its
// argument (Mutate/MutateTransitive effect), the argument and result should
// remain in the same reactive scope.
import {mutate} from 'shared-runtime';

function Component(props) {
  const x = {};
  mutate(x);
  return x;
}
