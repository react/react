/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export default function Html({assets, children, title}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="shortcut icon" href="favicon.ico" />
        <link rel="stylesheet" href={assets['main.css']} />
        <title>{title}</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(
      \`The time to \${entry.name} was \${entry.startTime} milliseconds.\`,
    );
    // Logs "The time to first-paint was 386.7999999523163 milliseconds."
    // Logs "The time to first-contentful-paint was 400.6999999284744 milliseconds."
  });
});

observer.observe({ type: "paint", buffered: true });        
          
  `,
          }}
        />
      </head>
      <body>
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<b>Enable JavaScript to run this app.</b>`,
          }}
        />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `assetManifest = ${JSON.stringify(assets)};`,
          }}
        />
      </body>
    </html>
  );
}
