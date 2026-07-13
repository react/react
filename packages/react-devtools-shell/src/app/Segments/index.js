/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

function deferred<T>(
  timeoutMS: number,
  resolvedValue: T,
  displayName: string,
): Promise<T> {
  const promise = new Promise<T>(resolve => {
    setTimeout(() => resolve(resolvedValue), timeoutMS);
  });
  (promise as any).displayName = displayName;

  return promise;
}

const title = deferred(100, 'Segmented Page Title', 'title');
const content = deferred(
  400,
  'This is the content of a segmented page. It loads in multiple parts.',
  'content',
);
function Page(): React.Node {
  return (
    <article>
      <h1>{title}</h1>
      <p>{content}</p>
    </article>
  );
}

function InnerSegment({children}: {children: React.Node}): React.Node {
  return (
    <>
      <h3>Inner Segment</h3>
      <React.Suspense name="InnerSegment" fallback={<p>Loading...</p>}>
        <section>{children}</section>
        <p>After inner</p>
      </React.Suspense>
    </>
  );
}

const cookies = deferred(200, 'Cookies: 🍪🍪🍪', 'cookies');
function OuterSegment({children}: {children: React.Node}): React.Node {
  return (
    <>
      <h2>Outer Segment</h2>
      <React.Suspense name="OuterSegment" fallback={<p>Loading outer</p>}>
        <p>{cookies}</p>
        <div>{children}</div>
        <p>After outer</p>
      </React.Suspense>
    </>
  );
}

function Root({children}: {children: React.Node}): React.Node {
  return (
    <>
      <h1>Root Segment</h1>
      <React.Suspense name="Root" fallback={<p>Loading root</p>}>
        <main>{children}</main>
        <footer>After root</footer>
      </React.Suspense>
    </>
  );
}

const dynamicData = deferred(10, 'Dynamic Data: 📈📉📊', 'dynamicData');
export default function Segments(): React.Node {
  return (
    <>
      <p>{dynamicData}</p>
      <React.Activity name="root" mode="visible">
        <Root>
          <React.Activity name="outer" mode="visible">
            <OuterSegment>
              <React.Activity name="inner" mode="visible">
                <InnerSegment>
                  <React.Activity name="slot" mode="visible">
                    <Page />
                  </React.Activity>
                </InnerSegment>
              </React.Activity>
            </OuterSegment>
          </React.Activity>
        </Root>
      </React.Activity>
    </>
  );
}
