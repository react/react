// Server dependencies.
import express, {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from 'express';
import {Readable} from 'node:stream';
import type {ReadableStream as NodeReadableStream} from 'stream/web';
import {
  renderToReadableStream,
  loadServerAction,
  decodeReply,
  decodeAction,
} from 'react-server-dom-parcel/server.edge';
import {injectRSCPayload} from 'rsc-html-stream/server';

// Client dependencies, used for SSR.
// These must run in the same environment as client components (e.g. same instance of React).
import {createFromReadableStream} from 'react-server-dom-parcel/client.edge' with {env: 'react-client'};
import {renderToReadableStream as renderHTMLToReadableStream} from 'react-dom/server.edge' with {env: 'react-client'};
import ReactClient, {ReactElement} from 'react' with {env: 'react-client'};

// Page components. These must have "use server-entry" so they are treated as code splitting entry points.
import {Todos} from './Todos';

const app = express();

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'rsc-action');
  next();
});

app.use(express.static('dist'));

app.get('/', async (req, res) => {
  await render(req, res, <Todos />);
});

app.post('/', async (req, res) => {
  await handleAction(req, res, <Todos />);
});

app.get('/todos/:id', async (req, res) => {
  await render(req, res, <Todos id={Number(req.params.id)} />);
});

app.post('/todos/:id', async (req, res) => {
  await handleAction(req, res, <Todos id={Number(req.params.id)} />);
});

async function render(
  req: ExpressRequest,
  res: ExpressResponse,
  component: ReactElement,
  actionResult?: any,
) {
  // Render RSC payload.
  let root: any = component;
  if (actionResult) {
    root = {result: actionResult, root};
  }
  let stream = renderToReadableStream(root);
  if (req.accepts('text/html')) {
    res.setHeader('Content-Type', 'text/html');

    // Use client react to render the RSC payload to HTML.
    let [s1, s2] = stream.tee();
    let data: Promise<ReactElement>;
    function Content() {
      data ??= createFromReadableStream<ReactElement>(s1);
      return ReactClient.use(data);
    }

    let htmlStream = await renderHTMLToReadableStream(<Content />, {
      bootstrapScriptContent: (Todos as any).bootstrapScript,
    });
    let response = htmlStream.pipeThrough(injectRSCPayload(s2));
    Readable.fromWeb(response as NodeReadableStream).pipe(res);
  } else {
    res.set('Content-Type', 'text/x-component');
    Readable.fromWeb(stream as NodeReadableStream).pipe(res);
  }
}

// Handle server actions.
async function handleAction(
  req: ExpressRequest,
  res: ExpressResponse,
  component: ReactElement,
) {
  let id = req.get('rsc-action-id');
  let request = new Request('http://localhost' + req.url, {
    method: 'POST',
    headers: req.headers as any,
    body: Readable.toWeb(req) as ReadableStream,
    // @ts-ignore
    duplex: 'half',
  });

  if (id) {
    let action = await loadServerAction(id);
    let body = req.is('multipart/form-data')
      ? await request.formData()
      : await request.text();
    let args = await decodeReply<any[]>(body);
    let result = action.apply(null, args);
    try {
      // Wait for any mutations
      await result;
    } catch (x) {
      // We handle the error on the client
    }

    await render(req, res, component, result);
  } else {
    // Form submitted by browser (progressive enhancement).
    let formData = await request.formData();
    let action = await decodeAction(formData);
    try {
      // Wait for any mutations
      await action();
    } catch (err) {
      // TODO render error page?
    }
    await render(req, res, component);
  }
}

let server = app.listen(3001);
console.log('Server listening on port 3001');

// Restart the server when it changes.
if (module.hot) {
  module.hot.dispose(() => {
    server.close();
  });

  module.hot.accept();
}
