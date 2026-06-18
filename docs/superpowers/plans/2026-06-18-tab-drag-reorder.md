# Tab 拖移排序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓使用者可以用滑鼠拖移 TabBar 分頁，改變 `openTabs` 的排列順序。

**Architecture:** 在 Zustand store 新增 `reorderTabs` action；在 `TabBar.tsx` 用 `@dnd-kit/sortable` 的 `horizontalListSortingStrategy` 包裝現有 Tab，拖移結束時呼叫 `reorderTabs`。視覺效果採就地位移（shift-in-place），無 DragOverlay。

**Tech Stack:** `@dnd-kit/core ^6.3.1`、`@dnd-kit/sortable ^10.0.0`、`@dnd-kit/utilities ^3.2.2`（均已安裝）、Zustand（已用於 store）

---

## 受影響檔案

| 檔案 | 動作 |
|------|------|
| `src/store/docreader.ts` | 修改：新增 `reorderTabs` 到 interface 與實作 |
| `src/components/docreader/TabBar.tsx` | 修改：加入 dnd-kit 排序、抽出 `SortableTab` 內部元件 |

---

### Task 1：Store 新增 `reorderTabs`

**Files:**
- Modify: `src/store/docreader.ts`

- [ ] **Step 1：在 `DocReaderActions` interface 新增方法簽名**

  開啟 `src/store/docreader.ts`，找到第 61 行附近的 `reorderFiles` 那行，在其後加入：

  ```ts
  reorderTabs: (activeId: string, overId: string) => void
  ```

  完整介面區段結果（第 38–62 行）：

  ```ts
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
    reorderCats: (activeId: string, overId: string) => void
    reorderFiles: (activeId: string, overId: string) => void
    reorderTabs: (activeId: string, overId: string) => void
  }
  ```

- [ ] **Step 2：在 store 實作中加入 `reorderTabs`**

  找到 `reorderFiles` 的實作（第 197–209 行附近），在其後加入：

  ```ts
  reorderTabs: (activeId, overId) =>
    set((s) => {
      const from = s.openTabs.indexOf(activeId)
      const to   = s.openTabs.indexOf(overId)
      if (from === -1 || to === -1 || from === to) return {}
      const next = [...s.openTabs]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return { openTabs: next }
    }),
  ```

- [ ] **Step 3：確認 TypeScript 無錯誤**

  ```bash
  npx tsc --noEmit
  ```

  預期：無錯誤輸出。

- [ ] **Step 4：Commit**

  ```bash
  git add src/store/docreader.ts
  git commit -m "feat(store): 新增 reorderTabs action"
  ```

---

### Task 2：TabBar 加入 dnd-kit 水平排序

**Files:**
- Modify: `src/components/docreader/TabBar.tsx`

- [ ] **Step 1：更新 import**

  將檔案頂部的 import 替換為以下內容（原本只有 `useDocReaderStore`）：

  ```ts
  'use client'

  import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
  } from '@dnd-kit/core'
  import {
    SortableContext,
    horizontalListSortingStrategy,
    useSortable,
  } from '@dnd-kit/sortable'
  import { CSS } from '@dnd-kit/utilities'
  import { useDocReaderStore } from '@/store/docreader'
  ```

- [ ] **Step 2：抽出 `SortableTab` 內部元件**

  在 `TabBar` function 定義之前，加入以下元件（完整程式碼，包含所有既有樣式）：

  ```tsx
  interface SortableTabProps {
    fileId: string
    isActive: boolean
    name: string
    onSwitchTab: (id: string) => void
    onCloseTab: (id: string) => void
  }

  function SortableTab({ fileId, isActive, name, onSwitchTab, onCloseTab }: SortableTabProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fileId })

    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="dr-tab"
        data-active={isActive ? 'true' : 'false'}
        onClick={() => onSwitchTab(fileId)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 10px 0 14px',
          height: 36,
          cursor: isDragging ? 'grabbing' : 'pointer',
          flexShrink: 0,
          maxWidth: 180,
          background: isActive ? 'var(--paper)' : 'transparent',
          borderRight: '1px solid var(--border)',
          borderBottom: isActive ? '2px solid var(--amber)' : '2px solid transparent',
          color: isActive ? 'var(--brown)' : 'var(--muted)',
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 12.5,
          fontWeight: isActive ? 600 : 400,
          userSelect: 'none',
          transform: CSS.Translate.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
          zIndex: isDragging ? 10 : undefined,
          position: 'relative',
        }}
      >
        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {name}
        </span>
        <button
          className="dr-tab-close"
          onClick={(e) => { e.stopPropagation(); onCloseTab(fileId) }}
          aria-label="關閉分頁"
          style={{
            flexShrink: 0,
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            color: 'var(--muted)',
            padding: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    )
  }
  ```

- [ ] **Step 3：重寫 `TabBar` function 主體**

  將整個 `TabBar` function 替換為：

  ```tsx
  export function TabBar({ onSwitchTab, onCloseTab }: TabBarProps) {
    const { openTabs, activeFileId, files, reorderTabs } = useDocReaderStore()

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    )

    const handleDragEnd = (e: DragEndEvent) => {
      if (e.over && e.active.id !== e.over.id) {
        reorderTabs(String(e.active.id), String(e.over.id))
      }
    }

    if (openTabs.length === 0) return null

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={openTabs} strategy={horizontalListSortingStrategy}>
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              overflowX: 'auto',
              background: 'var(--sidebar-bg)',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
              scrollbarWidth: 'none',
            }}
          >
            {openTabs.map((fileId) => {
              const file = files.find((f) => f.id === fileId)
              if (!file) return null
              const isActive = fileId === activeFileId
              const name = file.name.replace(/\.(md|markdown|txt)$/i, '')

              return (
                <SortableTab
                  key={fileId}
                  fileId={fileId}
                  isActive={isActive}
                  name={name}
                  onSwitchTab={onSwitchTab}
                  onCloseTab={onCloseTab}
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    )
  }
  ```

- [ ] **Step 4：確認 TypeScript 無錯誤**

  ```bash
  npx tsc --noEmit
  ```

  預期：無錯誤輸出。

- [ ] **Step 5：手動驗證**

  啟動 dev server：
  ```bash
  npm run dev
  ```

  依序確認：
  1. 開啟 2 個以上分頁，Tab 正常顯示
  2. 拖移某個 Tab 左右位移，放開後順序改變
  3. 純點擊 Tab（不拖移）仍能正常切換
  4. 點擊關閉按鈕（×）仍能關閉分頁
  5. 重新整理頁面，Tab 順序與拖移後一致（localStorage 持久化）

- [ ] **Step 6：Commit**

  ```bash
  git add src/components/docreader/TabBar.tsx
  git commit -m "feat(tabbar): 以 dnd-kit 實作 Tab 水平拖移排序"
  ```
