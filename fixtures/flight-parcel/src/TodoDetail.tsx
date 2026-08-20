import {getTodo, updateTodo} from './actions';

export async function TodoDetail({id}: {id: number}) {
  let todo = await getTodo(id);
  if (!todo) {
    return <p>Todo not found</p>;
  }

  return (
    <form className="todo" action={updateTodo.bind(null, todo.id)}>
      <label>
        Title: <input name="title" defaultValue={todo.title} />
      </label>
      <label>
        Description:{' '}
        <textarea name="description" defaultValue={todo.description} />
      </label>
      <label>
        Due date:{' '}
        <input type="date" name="dueDate" defaultValue={todo.dueDate} />
      </label>
      <button type="submit">Update todo</button>
    </form>
  );
}
