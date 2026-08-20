"use client";
// CJS-ESM async module
module.exports = import('../Counter.js').then(m => {
  return m.Counter
});
