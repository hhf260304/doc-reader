'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Heading } from '@/lib/markdown'

export interface DocFile {
  id: string
  name: string
  content: string
  catId: string
}

export interface Category {
  id: string
  name: string
  deletable: boolean
  open: boolean
}

interface DocReaderState {
  // Persisted
  cats: Category[]
  files: DocFile[]
  activeFileId: string | null
  openTabs: string[]
  scrollPositions: Record<string, number>

  // UI (not persisted)
  addingCategory: boolean
  renamingCatId: string | null
  confirmCatId: string | null
  editing: boolean
  headings: Heading[]
  activeHeadingId: string | null
}

interface DocReaderActions {
  setEditing: (v: boolean) => void
  setActiveFileId: (id: string | null) => void
  setAddingCategory: (v: boolean) => void
  setRenamingCatId: (id: string | null) => void
  setConfirmCatId: (id: string | null) => void
  setHeadings: (headings: Heading[]) => void
  setActiveHeadingId: (id: string | null) => void

  openTab: (id: string) => void
  closeTab: (id: string) => void
  setScrollPosition: (id: string, top: number) => void

  addFile: (file: DocFile) => void
  updateFile: (id: string, updates: Partial<DocFile>) => void
  deleteFile: (id: string) => boolean
  moveFile: (id: string, catId: string) => void

  addCategory: (name: string) => void
  toggleCat: (id: string) => void
  renameCategory: (id: string, name: string) => void
  deleteCategory: (id: string) => void
}

const DEFAULT_CATS: Category[] = [
  { id: 'uncat', name: '未分類', deletable: false, open: true },
]

export const useDocReaderStore = create<DocReaderState & DocReaderActions>()(
  persist(
    (set, get) => ({
      cats: DEFAULT_CATS,
      files: [],
      activeFileId: null,
      openTabs: [],
      scrollPositions: {},
      addingCategory: false,
      renamingCatId: null,
      confirmCatId: null,
      editing: false,
      headings: [],
      activeHeadingId: null,

      setEditing: (v) => set({ editing: v }),
      setActiveFileId: (id) => set({ activeFileId: id }),
      setAddingCategory: (v) => set({ addingCategory: v }),
      setRenamingCatId: (id) => set({ renamingCatId: id }),
      setConfirmCatId: (id) => set({ confirmCatId: id }),
      setHeadings: (headings) => set({ headings }),
      setActiveHeadingId: (id) => set({ activeHeadingId: id }),

      openTab: (id) =>
        set((s) => ({
          openTabs: s.openTabs.includes(id) ? s.openTabs : [...s.openTabs, id],
          activeFileId: id,
        })),

      closeTab: (id) =>
        set((s) => {
          const idx = s.openTabs.indexOf(id)
          if (idx === -1) return {}
          const newTabs = s.openTabs.filter((t) => t !== id)
          const newActive =
            s.activeFileId === id
              ? (newTabs[idx] ?? newTabs[idx - 1] ?? null)
              : s.activeFileId
          return { openTabs: newTabs, activeFileId: newActive }
        }),

      setScrollPosition: (id, top) =>
        set((s) =>
          s.openTabs.includes(id)
            ? { scrollPositions: { ...s.scrollPositions, [id]: top } }
            : {}
        ),

      addFile: (file) =>
        set((s) => ({
          files: [...s.files, file],
          openTabs: s.openTabs.includes(file.id) ? s.openTabs : [...s.openTabs, file.id],
          activeFileId: file.id,
          editing: false,
        })),

      updateFile: (id, updates) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),

      deleteFile: (id) => {
        let wasActive = false
        set((s) => {
          wasActive = s.activeFileId === id
          const idx = s.openTabs.indexOf(id)
          const newTabs = s.openTabs.filter((t) => t !== id)
          const newPositions = { ...s.scrollPositions }
          delete newPositions[id]
          const newActive = wasActive
            ? (newTabs[idx] ?? newTabs[idx - 1] ?? null)
            : s.activeFileId
          return {
            files: s.files.filter((f) => f.id !== id),
            openTabs: newTabs,
            scrollPositions: newPositions,
            activeFileId: newActive,
          }
        })
        return wasActive
      },

      moveFile: (id, catId) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, catId } : f)),
        })),

      addCategory: (name) => {
        const nm = name.trim()
        if (!nm) { set({ addingCategory: false }); return }
        const id = 'c' + Date.now()
        set((s) => ({
          cats: [...s.cats, { id, name: nm, deletable: true, open: true }],
          addingCategory: false,
        }))
      },

      toggleCat: (id) =>
        set((s) => ({
          cats: s.cats.map((c) => (c.id === id ? { ...c, open: c.open === false } : c)),
        })),

      renameCategory: (id, name) => {
        const nm = name.trim()
        if (!nm) { set({ renamingCatId: null }); return }
        set((s) => ({
          cats: s.cats.map((c) => (c.id === id ? { ...c, name: nm } : c)),
          renamingCatId: null,
        }))
      },

      deleteCategory: (id) =>
        set((s) => ({
          cats: s.cats.filter((c) => c.id !== id),
          files: s.files.map((f) => (f.catId === id ? { ...f, catId: 'uncat' } : f)),
          confirmCatId: null,
        })),
    }),
    {
      name: 'docreader_library',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        cats: s.cats,
        files: s.files,
        activeFileId: s.activeFileId,
        openTabs: s.openTabs,
        scrollPositions: s.scrollPositions,
      }),
    }
  )
)

export function uid() {
  return 'f' + Date.now() + '-' + Math.floor(Math.random() * 9999)
}
