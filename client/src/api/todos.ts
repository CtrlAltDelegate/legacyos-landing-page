import { api } from './client';

export interface TodoItem {
  id: string;
  title: string;
  description: string | null;
  category: 'document' | 'action' | 'review';
  priority: number;
  relatedWing: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  isInternal: boolean;
  sourceKey: string | null;
  completedAt: string | null;
  createdAt: string;
}

export async function getTodos(includeCompleted = false): Promise<TodoItem[]> {
  const { data } = await api.get<{ todos: TodoItem[] }>('/todos', {
    params: { includeCompleted: String(includeCompleted) },
  });
  return data.todos;
}

export async function completeTodo(id: string): Promise<TodoItem> {
  const { data } = await api.patch<TodoItem>(`/todos/${id}/complete`);
  return data;
}

export async function uncompleteTodo(id: string): Promise<TodoItem> {
  const { data } = await api.patch<TodoItem>(`/todos/${id}/uncomplete`);
  return data;
}

export async function dismissTodo(id: string): Promise<void> {
  await api.delete(`/todos/${id}`);
}
