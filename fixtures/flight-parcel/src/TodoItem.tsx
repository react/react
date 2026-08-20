'use client';

import {startTransition, useOptimistic} from 'react';
import {deleteTodo, setTodoComplete, type Todo as ITodo} from './actions';

export function TodoItem({
  todo,
  isSelected,
}: {
  todo: ITodo;
  isSelected: boolean;
}) {
  let [isOptimisticComplete, setOptimisticComplete] = useOptimistic(
    todo.isComplete,
  );

  return (
    <li data-selected={isSelected || undefined}>
      <input
        type="checkbox"
        checked={isOptimisticComplete}
        onChange={e => {
          startTransition(async () => {
            setOptimisticComplete(e.target.checked);
            await setTodoComplete(todo.id, e.target.checked);
          });
        }}
      />
      <a
        href={`/todos/${todo.id}`}
        aria-current={isSelected ? 'page' : undefined}>
        {todo.title}
      </a>
      <button onClick={() => deleteTodo(todo.id)}>x</button>
    </li>
  );
}
