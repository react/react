# Fiber Debugger

This is a debugger handy for visualizing how [Fiber](https://github.com/react/react/issues/6170) works internally.

**It is only meant to be used by React contributors, and not by React users.**

It is likely that it might get broken at some point. If it's broken, ping [Dan](https://twitter.com/dan_abramov).

### Running

First, `npm run build` in React root repo folder.

Then `npm install` and `npm start` in this folder.

Open `http://localhost:3000` in Chrome.

### Features

* Edit code that uses `ReactNoop` renderer
* Visualize how relationships between fibers change over time
* Current tree is displayed in green

![fiber debugger](https://d17oy1vhnax1f7.cloudfront.net/items/3R2W1H2M3a0h3p1l133r/Screen%20Recording%202016-10-21%20at%2020.41.gif?v=e4323e51)


