// rAF never fires on devtools_page (because it's in the background)
// https://bugs.chromium.org/p/chromium/issues/detail?id=1241986#c31
// Since we render React elements here, we need to polyfill it with setTimeout
// The polyfill is based on https://gist.github.com/jalbam/5fe05443270fa6d8136238ec72accbc0
const FRAME_TIME = 16;
let lastTime = 0;

window.requestAnimationFrame = function (callback, element) {
  const now = window.performance.now();
  const nextTime = Math.max(lastTime + FRAME_TIME, now);

  return setTimeout(function () {
    callback((lastTime = nextTime));
  }, nextTime - now);
};

window.cancelAnimationFrame = clearTimeout;
