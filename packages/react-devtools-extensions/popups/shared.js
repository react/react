/* globals chrome */

'use strict';

document.addEventListener('DOMContentLoaded', function () {
  // Make links work
  const links = document.getElementsByTagName('a');
  for (let i = 0; i < links.length; i++) {
    (function () {
      const ln = links[i];
      const location = ln.href;
      ln.onclick = function () {
        chrome.tabs.create({active: true, url: location});
        return false;
      };
    })();
  }

  // Work around https://bugs.chromium.org/p/chromium/issues/detail?id=428044
  document.body.style.opacity = 0;
  document.body.style.transition = 'opacity ease-out .4s';
  requestAnimationFrame(function () {
    document.body.style.opacity = 1;
  });
});
