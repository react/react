import * as React from 'react';
import {renderToReadableStream} from 'react-server-dom-unbundled/server';
import {createFromReadableStream} from 'react-server-dom-webpack/client';
import {PassThrough, Readable} from 'stream';
import {ClientContext, ClientReadContext} from './ClientContext.js';
import Container from './Container.js';

import {Counter} from './Counter.js';
import {Counter as Counter2} from './Counter2.js';
import AsyncModule from './cjs/Counter3.js';
const Counter3 = await(AsyncModule);

import ShowMore from './ShowMore.js';
import Button from './Button.js';
import Form from './Form.js';
import {Dynamic} from './Dynamic.js';
import {Client} from './Client.js';
import {Navigate} from './Navigate.js';

import {Note} from './cjs/Note.js';

import {GenerateImage} from './GenerateImage.js';

import LargeContent from './LargeContent.js';

import {like, greet, increment} from './actions.js';

import {getServerState} from './ServerState.js';
import {sdkMethod} from './library.js';
import FileReader from './FileReader.js';

const promisedText = new Promise(resolve =>
  setTimeout(() => resolve('deferred text'), 50)
);

function Foo({children}) {
  return <div>{children}</div>;
}

async function delayedError(text, ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(text)), ms)
  );
}

async function delay(text, ms) {
  return new Promise(resolve => setTimeout(() => resolve(text), ms));
}

async function delayTwice() {
  try {
    await delayedError('Delayed exception', 20);
  } catch (x) {
    // Ignored
  }
  await delay('', 10);
}

async function delayTrice() {
  const p = delayTwice();
  await delay('', 40);
  return p;
}

async function Bar({children}) {
  await delayTrice();
  return <div>{children}</div>;
}

async function ThirdPartyComponent() {
  return await delay('hello from a 3rd party', 30);
}

let cachedThirdPartyStream;

// We create the Component outside of AsyncLocalStorage so that it has no owner.
// That way it gets the owner from the call to createFromNodeStream.
const thirdPartyComponent = <ThirdPartyComponent />;

function simulateFetch(cb, latencyMs) {
  return new Promise(resolve => {
    // Request latency
    setTimeout(() => {
      const result = cb();
      // Response latency
      setTimeout(() => {
        resolve(result);
      }, latencyMs);
    }, latencyMs);
  });
}

async function fetchThirdParty(noCache) {
  // We're using the Web Streams APIs for tee'ing convenience.
  let stream;
  if (cachedThirdPartyStream && !noCache) {
    stream = cachedThirdPartyStream;
  } else {
    stream = await simulateFetch(
      () =>
        renderToReadableStream(
          thirdPartyComponent,
          {},
          {environmentName: 'third-party'}
        ),
      25
    );
  }

  const [stream1, stream2] = stream.tee();
  cachedThirdPartyStream = stream1;

  return createFromReadableStream(stream2, {
    serverConsumerManifest: {
      moduleMap: {},
      serverModuleMap: null,
      moduleLoading: null,
    },
  });
}

async function ServerComponent({noCache}) {
  await delay('deferred text', 50);
  return await fetchThirdParty(noCache);
}

let veryDeepObject = [
  {
    bar: {
      baz: {
        a: {},
      },
    },
  },
  {
    bar: {
      baz: {
        a: {},
      },
    },
  },
  {
    bar: {
      baz: {
        a: {},
      },
    },
  },
  {
    bar: {
      baz: {
        a: {
          b: {
            c: {
              d: {
                e: {
                  f: {
                    g: {
                      h: {
                        i: {
                          j: {
                            k: {
                              l: {
                                m: {
                                  yay: 'You reached the end',
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
];

export default async function App({prerender, noCache}) {
  const res = await fetch('http://localhost:3001/todos');
  const todos = await res.json();
  await sdkMethod('http://localhost:3001/todos');

  console.log('Expand me:', veryDeepObject);

  const dedupedChild = <ServerComponent noCache={noCache} />;
  const message = getServerState();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Flight</title>
      </head>
      <body>
        <Container>
          {prerender ? (
            <meta data-testid="prerendered" name="prerendered" content="true" />
          ) : (
            <meta content="when not prerendering we render this meta tag. When prerendering you will expect to see this tag and the one with data-testid=prerendered because we SSR one and hydrate the other" />
          )}
          <h1>{message}</h1>
          <React.Suspense fallback={null}>
            <div data-testid="promise-as-a-child-test">
              Promise as a child hydrates without errors: {promisedText}
            </div>
          </React.Suspense>
          <Counter incrementAction={increment} />
          <Counter2 incrementAction={increment} />
          <Counter3 incrementAction={increment} />
          <ul>
            {todos.map(todo => (
              <li key={todo.id}>{todo.text}</li>
            ))}
          </ul>
          <ShowMore>
            <p>Lorem ipsum</p>
          </ShowMore>
          <Form action={greet} />
          <div>
            <Button action={like}>Like</Button>
          </div>
          <div>
            loaded statically: <Dynamic />
          </div>
          <div>
            <GenerateImage message={message} />
          </div>
          <Client />
          <Note />
          <Foo>{dedupedChild}</Foo>
          <Bar>{Promise.resolve([dedupedChild])}</Bar>
          <Navigate />
          <ClientContext value="from server">
            <div>
              <ClientReadContext />
            </div>
          </ClientContext>
          {prerender ? null : ( // TODO: prerender is broken for large content for some reason.
            <React.Suspense fallback={null}>
              <LargeContent />
              {/*
                This text prop is above the threshold, so in the debug info for
                the element we'll see a placeholder instead of the actual value.
              */}
              <FileReader largeText={'a'.repeat(1000001)} />
            </React.Suspense>
          )}
        </Container>
      </body>
    </html>
  );
}
