import * as React from 'react';

import Button from './Button.js';
import Form from './Form.js';

import {like, greet} from './actions.js';

import {getServerState} from './ServerState.js';

const h = React.createElement;

export default async function App() {
  const res = await fetch('http://localhost:3001/todos');
  const todos = await res.json();
  return h(
    'html',
    {
      lang: 'en',
    },
    h(
      'head',
      null,
      h('meta', {
        charSet: 'utf-8',
      }),
      h('meta', {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      }),
      h('title', null, 'Flight'),
      h('link', {
        rel: 'stylesheet',
        href: '/src/style.css',
        precedence: 'default',
      })
    ),
    h(
      'body',
      null,
      h(
        'div',
        null,
        h('h1', null, getServerState()),
        h(
          'ul',
          null,
          todos.map(todo =>
            h(
              'li',
              {
                key: todo.id,
              },
              todo.text
            )
          )
        ),
        h(Form, {
          action: greet,
        }),
        h(
          'div',
          null,
          h(
            Button,
            {
              action: like,
            },
            'Like'
          )
        )
      )
    )
  );
}
