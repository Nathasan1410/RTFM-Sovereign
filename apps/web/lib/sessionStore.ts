/**
 * Session Store
 *
 * Zustand-based state management for learning sessions.
 * Provides persistent storage for session data, milestones, and user progress.
 *
 * Key Features:
 * - LocalStorage persistence via zustand/middleware
 * - Session CRUD operations (create, read, update, delete)
 * - Milestone tracking and updates
 * - Active session management
 * - Loading and error state management
 *
 * Dependencies:
 * - zustand: State management library
 * - zustand/middleware: Persistence utilities
 *
 * @module apps/web/lib/sessionStore
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Interface for a question within a milestone
 */
export interface Question {
  id: string
  prompt: string
  expectedPoints: number
  language?: string
}

/**
 * Interface for a milestone data
 */
export interface MilestoneData {
  id: number
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  status: 'pending' | 'active' | 'completed' | 'failed'
  score?: number
  feedback?: string | undefined
  questions?: Question[]
}

/**
 * Interface for complete session data
 */
export interface SessionData {
  sessionId: string
  userAddress: string
  topic: string
  status: 'created' | 'in_progress' | 'completed' | 'failed'
  createdAt: string
  deadline?: string
  milestones: MilestoneData[]
  currentMilestone?: number
  score?: number
  totalScore?: number
  finalScore?: number
  ipfsHash?: string
  attestationHash?: string
}

/**
 * Interface for session store state and actions
 */
interface SessionState {
  sessions: Record<string, SessionData>
  activeSessionId: string | null
  isLoading: boolean
  error: string | null
  
  setActiveSession: (sessionId: string | null) => void
  addSession: (session: SessionData) => void
  updateSession: (sessionId: string, updates: Partial<SessionData>) => void
  removeSession: (sessionId: string) => void
  updateMilestone: (sessionId: string, milestoneId: number, updates: Partial<MilestoneData>) => void
  setCurrentMilestone: (sessionId: string, milestoneId: number) => void
  clearAllSessions: () => void
  setError: (error: string | null) => void
  setLoading: (isLoading: boolean) => void
}

/**
 * Zustand store hook for session management.
 * Automatically persists to localStorage under key 'rtfm-sovereign-sessions'.
 *
 * @example
 * ```typescript
 * const { sessions, activeSessionId, addSession } = useSessionStore();
 *
 * // Add a new session
 * addSession({
 *   sessionId: 'session-123',
 *   userAddress: '0xabc...',
 *   topic: 'React Hooks',
 *   status: 'created',
 *   createdAt: new Date().toISOString(),
 *   milestones: []
 * });
 * ```
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeSessionId: null,
      isLoading: false,
      error: null,

      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

      addSession: (session) => set((state) => ({
        sessions: {
          ...state.sessions,
          [session.sessionId]: session
        },
        activeSessionId: session.sessionId
      })),

      updateSession: (sessionId, updates) => set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...state.sessions[sessionId],
            ...updates
          } as SessionData
        }
      })),

      removeSession: (sessionId) => set((state) => {
        const newSessions = { ...state.sessions }
        delete newSessions[sessionId]
        return {
          sessions: newSessions,
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId
        }
      }),

      updateMilestone: (sessionId, milestoneId, updates) => set((state) => {
        const session = state.sessions[sessionId]
        if (!session) return state

        const updatedMilestones = session.milestones.map(m =>
          m.id === milestoneId ? { ...m, ...updates } : m
        )

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              milestones: updatedMilestones
            }
          }
        }
      }),

      setCurrentMilestone: (sessionId, milestoneId) => set((state) => ({
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...state.sessions[sessionId],
            currentMilestone: milestoneId
          } as SessionData
        }
      })),

      clearAllSessions: () => set({
        sessions: {},
        activeSessionId: null,
        error: null
      }),

      setError: (error) => set({ error }),

      setLoading: (isLoading) => set({ isLoading })
    }),
    {
      name: 'rtfm-sovereign-sessions',
      storage: createJSONStorage(() => localStorage)
    }
  )
)

/**
 * Helper hook to retrieve the currently active session.
 * Returns null if no session is active.
 *
 * @returns The active SessionData object or null if no active session
 *
 * @example
 * ```typescript
 * const activeSession = useActiveSession();
 *
 * if (!activeSession) {
 *   return <div>No active session</div>;
 * }
 *
 * console.log('Current session:', activeSession.sessionId);
 * console.log('Progress:', activeSession.milestones);
 * ```
 */
export const useActiveSession = () => {
  const { sessions, activeSessionId } = useSessionStore()
  return activeSessionId ? sessions[activeSessionId] : null
}
