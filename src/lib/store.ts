import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Plant {
  id: string
  name: string
  scientificName: string | null
  family: string | null
  description: string
  careLight: string | null
  careWater: string | null
  careTemperature: string | null
  careSoil: string | null
  careHumidity: string | null
  careFertilizer: string | null
  careTips: string | null
  imageUrl: string | null
  confidence: number
  identifiedAt: string
  chatMessagesCount?: number
}

export interface ChatMsg {
  id?: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface AppStore {
  // Chat state (persisted across tab switches and page refreshes)
  messages: ChatMsg[]
  input: string
  isLoading: boolean
  selectedPlantId: string | null
  selectedPlantName: string | null

  addUserMessage: (content: string) => void
  addAssistantMessage: (content: string) => void
  removeLastMessage: () => void
  setInput: (input: string) => void
  setLoading: (loading: boolean) => void
  setSelectedPlant: (id: string | null, name: string | null) => void
  clearChat: () => void

  // Plant data cache (for the garden tab)
  plants: Plant[]
  setPlants: (plants: Plant[]) => void
  removePlant: (id: string) => void

  // Favorites
  favoritePlantIds: string[]
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
}

// ─── Helper ──────────────────────────────────────────────────────────────────

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9)

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── Chat state ──────────────────────────────────────────────────────────
      messages: [],
      input: '',
      isLoading: false,
      selectedPlantId: null,
      selectedPlantName: null,

      addUserMessage: (content) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: generateId(),
              role: 'user' as const,
              content,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      addAssistantMessage: (content) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: generateId(),
              role: 'assistant' as const,
              content,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      removeLastMessage: () =>
        set((state) => ({
          messages: state.messages.slice(0, -1),
        })),

      setInput: (input) => set({ input }),

      setLoading: (loading) => set({ isLoading: loading }),

      setSelectedPlant: (id, name) =>
        set({ selectedPlantId: id, selectedPlantName: name }),

      clearChat: () =>
        set({
          messages: [],
          input: '',
          isLoading: false,
          selectedPlantId: null,
          selectedPlantName: null,
        }),

      // ── Plant data cache ────────────────────────────────────────────────────
      plants: [],

      setPlants: (plants) => set({ plants }),

      removePlant: (id) =>
        set((state) => ({
          plants: state.plants.filter((p) => p.id !== id),
        })),

      // ── Favorites ────────────────────────────────────────────────────────
      favoritePlantIds: [],

      toggleFavorite: (id) =>
        set((state) => ({
          favoritePlantIds: state.favoritePlantIds.includes(id)
            ? state.favoritePlantIds.filter((fid) => fid !== id)
            : [...state.favoritePlantIds, id],
        })),

      isFavorite: (id) => get().favoritePlantIds.includes(id),
    }),
    {
      name: 'huashi-app-store',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      }),
      partialize: (state) => ({
        messages: state.messages.slice(-50), // Keep last 50 messages
        selectedPlantId: state.selectedPlantId,
        selectedPlantName: state.selectedPlantName,
        favoritePlantIds: state.favoritePlantIds,
      }),
    }
  )
)
