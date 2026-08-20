import {createTodo} from './actions';

export function TodoCreate() {
  return (
    <form action={createTodo}>
      <label>
        Title: <input name="title" />
      </label>
      <label>
        Description: <textarea name="description" />
      </label>
      <label>
        Due date: <input type="date" name="dueDate" />
      </label>
      <button>Add todo</button>
    </form>
  );
}
