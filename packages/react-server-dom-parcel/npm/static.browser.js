'use strict';

var s;
if (process.env.NODE_ENV === 'production') {
  s = require('./cjs/react-server-dom-parcel-server.browser.production.js');
} else {
  s = require('./cjs/react-server-dom-parcel-server.browser.development.js');
}

exports.prerender = s.prerender;
