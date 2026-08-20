'use server';

import fs from 'fs/promises';

export interface Todo {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  isComplete: boolean;
}

export async function getTodos(): Promise<Todo[]> {
  try {
    let contents = await fs.readFile('todos.json', 'utf8');
    return JSON.parse(contents);
  } catch {
    await fs.writeFile('todos.json', '[]');
    return [];
  }
}

export async function getTodo(id: number): Promise<Todo | undefined> {
  let todos = await getTodos();
  return todos.find(todo => todo.id === id);
}

export async function createTodo(formData: FormData) {
  let todos = await getTodos();
  let title = formData.get('title');
  let description = formData.get('description');
  let dueDate = formData.get('dueDate');
  let id = todos.length > 0 ? Math.max(...todos.map(todo => todo.id)) + 1 : 0;
  todos.push({
    id,
    title: typeof title === 'string' ? title : '',
    description: typeof description === 'string' ? description : '',
    dueDate: typeof dueDate === 'string' ? dueDate : new Date().toISOString(),
    isComplete: false,
  });
  await fs.writeFile('todos.json', JSON.stringify(todos));
}

export async function updateTodo(id: number, formData: FormData) {
  let todos = await getTodos();
  let title = formData.get('title');
  let description = formData.get('description');
  let dueDate = formData.get('dueDate');
  let todo = todos.find(todo => todo.id === id);
  if (todo) {
    todo.title = typeof title === 'string' ? title : '';
    todo.description = typeof description === 'string' ? description : '';
    todo.dueDate =
      typeof dueDate === 'string' ? dueDate : new Date().toISOString();
    await fs.writeFile('todos.json', JSON.stringify(todos));
  }
}

export async function setTodoComplete(id: number, isComplete: boolean) {
  let todos = await getTodos();
  let todo = todos.find(todo => todo.id === id);
  if (todo) {
    todo.isComplete = isComplete;
    await fs.writeFile('todos.json', JSON.stringify(todos));
  }
}

export async function deleteTodo(id: number) {
  let todos = await getTodos();
  let index = todos.findIndex(todo => todo.id === id);
  if (index >= 0) {
    todos.splice(index, 1);
    await fs.writeFile('todos.json', JSON.stringify(todos));
  }
}
