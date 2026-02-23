import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Question {
  id: string
  prompt: string
  expectedPoints: number
  language?: string
}

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

export const useActiveSession = () => {
  const { sessions, activeSessionId } = useSessionStore()
  return activeSessionId ? sessions[activeSessionId] : null
}
