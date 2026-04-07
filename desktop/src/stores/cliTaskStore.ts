import { create } from 'zustand'
import { cliTasksApi } from '../api/cliTasks'
import type { CLITask } from '../types/cliTask'

type TodoItem = {
  content: string
  status: string
  activeForm?: string
}

type CLITaskStore = {
  /** Current session ID being tracked */
  sessionId: string | null
  /** Tasks for the current session */
  tasks: CLITask[]
  /** Whether the task bar is expanded */
  expanded: boolean

  /** Fetch tasks for a given session (uses sessionId as taskListId) */
  fetchSessionTasks: (sessionId: string) => Promise<void>
  /** Refresh tasks for the currently tracked session */
  refreshTasks: () => Promise<void>
  /** Update tasks from TodoWrite V1 tool input (in-memory, no disk read needed) */
  setTasksFromTodos: (todos: TodoItem[]) => void
  /** Clear task tracking state */
  clearTasks: () => void
  /** Toggle expanded state */
  toggleExpanded: () => void
}

export const useCLITaskStore = create<CLITaskStore>((set, get) => ({
  sessionId: null,
  tasks: [],
  expanded: true,

  fetchSessionTasks: async (sessionId) => {
    set({ sessionId })
    try {
      const { tasks } = await cliTasksApi.getTasksForList(sessionId)
      // Only update if still tracking the same session
      if (get().sessionId === sessionId) {
        set({ tasks })
      }
    } catch {
      // No tasks for this session — that's fine
      if (get().sessionId === sessionId) {
        set({ tasks: [] })
      }
    }
  },

  refreshTasks: async () => {
    const { sessionId } = get()
    if (!sessionId) return
    try {
      const { tasks } = await cliTasksApi.getTasksForList(sessionId)
      if (get().sessionId === sessionId) {
        set({ tasks })
      }
    } catch {
      // ignore
    }
  },

  setTasksFromTodos: (todos) => {
    const tasks: CLITask[] = todos.map((todo, index) => ({
      id: String(index + 1),
      subject: todo.content,
      description: '',
      activeForm: todo.activeForm,
      status: (['pending', 'in_progress', 'completed'].includes(todo.status)
        ? todo.status
        : 'pending') as CLITask['status'],
      blocks: [],
      blockedBy: [],
      taskListId: get().sessionId || '',
    }))
    set({ tasks })
  },

  clearTasks: () => {
    set({ sessionId: null, tasks: [] })
  },

  toggleExpanded: () => {
    set((s) => ({ expanded: !s.expanded }))
  },
}))
