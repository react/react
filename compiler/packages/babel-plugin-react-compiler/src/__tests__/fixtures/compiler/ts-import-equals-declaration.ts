import lib = require('shared-runtime');

function useValue(value: number) {
  return lib.identity(value);
}
