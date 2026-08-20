'use server-entry';

import './client';
import './Todos.css';
import {Dialog} from './Dialog';
import {TodoDetail} from './TodoDetail';
import {TodoCreate} from './TodoCreate';
import {TodoList} from './TodoList';

export async function Todos({id}: {id?: number}) {
  return (
    <html style={{colorScheme: 'dark light'}}>
      <head>
        <title>Todos</title>
      </head>
      <body>
        <header>
          <h1>Todos</h1>
          <Dialog trigger="+">
            <h2>Add todo</h2>
            <TodoCreate />
          </Dialog>
        </header>
        <main>
          <div className="todo-column">
            <TodoList id={id} />
          </div>
          {id != null ? <TodoDetail key={id} id={id} /> : <p>Select a todo</p>}
        </main>
      </body>
    </html>
  );
}
