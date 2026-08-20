import {TodoItem} from './TodoItem';
import {getTodos} from './actions';

export async function TodoList({id}: {id: number | undefined}) {
  let todos = await getTodos();
  return (
    <ul className="todo-list">
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} isSelected={todo.id === id} />
      ))}
    </ul>
  );
}
