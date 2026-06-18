# 左側欄拖曳排序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓左側欄的分類與同分類內的檔案都能透過拖曳調整排序，跨分類移動檔案的現有行為也改由 dnd-kit 統一接管。

**Architecture:** 以 @dnd-kit/core + @dnd-kit/sortable 取代現有 HTML5 drag 實作。Store 新增 `reorderCats` / `reorderFiles` 兩個 action，Sidebar 加入 `DndContext`（分類層）與巢狀 `SortableContext`（檔案層），單一 `onDragEnd` 處理所有拖曳情境。`DocReader` 的 `dragFileId` ref 與 `SidebarProps.dragFileId` 一併移除。

**Tech Stack:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, Zustand, React 19, Next.js 16, TypeScript

---

## 檔案異動清單

| 動作 | 路徑 | 說明 |
|---|---|---|
| Modify | `src/store/docreader.ts` | 新增 `reorderCats`、`reorderFiles` action |
| Modify | `src/components/docreader/Sidebar.tsx` | 全面改寫：移除舊 HTML5 drag，引入 dnd-kit |
| Modify | `src/components/docreader/DocReader.tsx` | 移除 `dragFileId` ref 及對應 prop |

---

## Task 1: 安裝 @dnd-kit 套件

**Files:**
- 無檔案變更，只安裝套件

- [ ] **Step 1: 安裝套件**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected output 末行類似：
```
added 3 packages, ...
```

- [ ] **Step 2: 確認安裝成功**

```bash
node -e "require('@dnd-kit/core'); require('@dnd-kit/sortable'); require('@dnd-kit/utilities'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): 安裝 @dnd-kit/core、sortable、utilities"
```

---

## Task 2: 新增 store action

**Files:**
- Modify: `src/store/docreader.ts`

- [ ] **Step 1: 在 interface 末尾加入兩個新 action 簽名**

在 `DocReaderActions` interface 的最後一個 action `deleteCategory` 之後新增：

```ts
  reorderCats: (activeId: string, overId: string) => void
  reorderFiles: (activeId: string, overId: string) => void
```

最終 interface 結尾看起來像：

```ts
  deleteCategory: (id: string) => void
  reorderCats: (activeId: string, overId: string) => void
  reorderFiles: (activeId: string, overId: string) => void
}
```

- [ ] **Step 2: 在 create() 的 set/get 函式區塊裡加入實作**

在 `deleteCategory` 的實作之後，`})` 閉合前加入：

```ts
      reorderCats: (activeId, overId) =>
        set((s) => {
          const from = s.cats.findIndex((c) => c.id === activeId)
          const to   = s.cats.findIndex((c) => c.id === overId)
          if (from === -1 || to === -1 || from === to) return {}
          const next = [...s.cats]
          const [item] = next.splice(from, 1)
          next.splice(to, 0, item)
          return { cats: next }
        }),

      reorderFiles: (activeId, overId) =>
        set((s) => {
          const from = s.files.findIndex((f) => f.id === activeId)
          const to   = s.files.findIndex((f) => f.id === overId)
          if (from === -1 || to === -1 || from === to) return {}
          const next = [...s.files]
          const [item] = next.splice(from, 1)
          next.splice(to, 0, item)
          return { files: next }
        }),
```

> 注意：不使用 `@dnd-kit/sortable` 的 `arrayMove` helper，直接用 splice 以避免額外 import 污染 store 層。

- [ ] **Step 3: TypeScript 型別檢查**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 無錯誤（或僅有 store 以外的既有 warning）

- [ ] **Step 4: Commit**

```bash
git add src/store/docreader.ts
git commit -m "feat(store): 新增 reorderCats、reorderFiles action"
```

---

## Task 3: 重寫 Sidebar.tsx

**Files:**
- Modify: `src/components/docreader/Sidebar.tsx`

此 Task 將整份 Sidebar.tsx 改寫。以下為完整的新版內容，直接覆蓋舊檔：

- [ ] **Step 1: 以新版內容取代 Sidebar.tsx**

將 `src/components/docreader/Sidebar.tsx` 全部替換為：

```tsx
'use client'

import { useRef, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDocReaderStore, uid, type Category, type DocFile } from '@/store/docreader'

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg data-chev width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform .18s' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function SortableFileRow({
  file,
  activeFileId,
  onOpenFile,
}: {
  file: DocFile
  activeFileId: string | null
  onOpenFile: (id: string) => void
}) {
  const { deleteFile } = useDocReaderStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: file.id })

  return (
    <div
      ref={setNodeRef}
      data-libitem
      data-active={file.id === activeFileId ? 'true' : 'false'}
      onClick={() => onOpenFile(file.id)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 7,
        cursor: 'grab',
        fontSize: 13.5,
        borderLeft: '3px solid transparent',
      }}
      {...attributes}
      {...listeners}
    >
      <FileIcon />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); deleteFile(file.id) }}
        aria-label="刪除"
        className="dr-file-del"
        style={{ flexShrink: 0, width: 18, height: 18, display: 'none', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', borderRadius: 4 }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

interface CategoryRowProps {
  cat: Category
  files: DocFile[]
  activeFileId: string | null
  onOpenFile: (id: string) => void
}

function CategoryRow({ cat, files, activeFileId, onOpenFile }: CategoryRowProps) {
  const { toggleCat, setConfirmCatId, setRenamingCatId, renameCategory, renamingCatId } = useDocReaderStore()
  const isOpen = cat.open !== false
  const renameRef = useRef<HTMLInputElement>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id })
  const fileIds = files.map((f) => f.id)

  return (
    <div
      ref={setNodeRef}
      data-cat
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        marginTop: 8,
        borderRadius: 8,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 2px' }}>
        {renamingCatId === cat.id ? (
          <div style={{ display: 'flex', gap: 6, width: '100%', padding: '0 2px' }}>
            <input
              ref={renameRef}
              defaultValue={cat.name}
              placeholder="分類名稱…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameCategory(cat.id, e.currentTarget.value)
                if (e.key === 'Escape') setRenamingCatId(null)
              }}
              autoFocus
              style={{ flex: 1, minWidth: 0, height: 28, padding: '0 9px', background: 'var(--paper)', border: '1px solid var(--amber)', borderRadius: 6, color: 'var(--ink)', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12.5, outline: 'none' }}
            />
            <button
              onClick={() => renameRef.current && renameCategory(cat.id, renameRef.current.value)}
              style={{ flexShrink: 0, padding: '0 11px', height: 28, background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: 6, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >確定</button>
          </div>
        ) : (
          <>
            <button
              onClick={() => toggleCat(cat.id)}
              {...attributes}
              {...listeners}
              style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'grab', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', padding: '2px 4px' }}
            >
              <span style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .18s', display: 'inline-flex' }}>
                <ChevronIcon />
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
              <span style={{ flexShrink: 0, color: 'var(--border)', fontWeight: 500 }}>{files.length}</span>
            </button>
            {cat.deletable && (
              <>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setRenamingCatId(cat.id) }}
                  aria-label="重新命名"
                  className="dr-cat-action"
                  style={{ flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', borderRadius: 5 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setConfirmCatId(cat.id) }}
                  aria-label="刪除分類"
                  className="dr-cat-action dr-cat-delete"
                  style={{ flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', borderRadius: 5 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </>
            )}
          </>
        )}
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 2 }}>
          <SortableContext items={fileIds} strategy={verticalListSortingStrategy}>
            {files.map((file) => (
              <SortableFileRow key={file.id} file={file} activeFileId={activeFileId} onOpenFile={onOpenFile} />
            ))}
          </SortableContext>
          {files.length === 0 && (
            <div style={{ padding: '6px 11px', color: 'var(--muted)', fontSize: 12, opacity: 0.65, fontStyle: 'italic' }}>拖放檔案到此分類</div>
          )}
        </div>
      )}
    </div>
  )
}

function DragPreview({ id }: { id: string }) {
  const cats = useDocReaderStore((s) => s.cats)
  const files = useDocReaderStore((s) => s.files)
  const cat = cats.find((c) => c.id === id)
  const file = files.find((f) => f.id === id)

  if (cat) {
    return (
      <div style={{ padding: '4px 8px', background: 'var(--sidebar-bg)', border: '1px solid var(--amber)', borderRadius: 7, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', boxShadow: '0 4px 14px rgba(0,0,0,0.18)', whiteSpace: 'nowrap' }}>
        {cat.name}
      </div>
    )
  }

  if (file) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, fontSize: 13.5, background: 'var(--sidebar-bg)', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
        <FileIcon />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{file.name}</span>
      </div>
    )
  }

  return null
}

interface SidebarProps {
  onOpenDemo: () => void
  onOpenFile: (id: string) => void
  onNewDoc: () => void
}

export function Sidebar({ onOpenDemo, onOpenFile, onNewDoc }: SidebarProps) {
  const { cats, files, activeFileId, addingCategory, setAddingCategory, addCategory, reorderCats, reorderFiles, moveFile } = useDocReaderStore()
  const newCatRef = useRef<HTMLInputElement>(null)
  const [dragActiveId, setDragActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDragActiveId(String(active.id))
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragActiveId(null)
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const isCat = (id: string) => cats.some((c) => c.id === id)
    const isFile = (id: string) => files.some((f) => f.id === id)

    if (isCat(activeId) && isCat(overId)) {
      reorderCats(activeId, overId)
      return
    }

    if (isFile(activeId)) {
      if (isFile(overId)) {
        const activeCat = files.find((f) => f.id === activeId)!.catId
        const overCat = files.find((f) => f.id === overId)!.catId
        if (activeCat === overCat) {
          reorderFiles(activeId, overId)
        } else {
          moveFile(activeId, overCat)
        }
      } else if (isCat(overId)) {
        moveFile(activeId, overId)
      }
    }
  }

  const handleNewDoc = () => {
    const id = uid()
    const starter = '# 新文件\n\n在這裡開始撰寫你的 Markdown 內容。\n'
    useDocReaderStore.getState().addFile({ id, name: '未命名.md', content: starter, catId: 'uncat' })
    onNewDoc()
  }

  const handleImport = () => {
    const inp = document.getElementById('dr-file-input') as HTMLInputElement | null
    inp?.click()
  }

  const handleImportFolder = () => {
    const inp = document.getElementById('dr-folder-input') as HTMLInputElement | null
    inp?.click()
  }

  const catIds = cats.map((c) => c.id)

  return (
    <aside
      id="dr-sidebar"
      style={{
        width: 'var(--sb-w)', flex: '0 0 var(--sb-w)', background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)', overflowY: 'auto', overflowX: 'hidden',
        transition: 'width .26s cubic-bezier(.4,0,.2,1), flex-basis .26s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ width: 240, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>

        {/* Library header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 10px' }}>
          <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)' }}>文件庫</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { label: '新增文件', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="12" x2="12" y2="18" /><line x1="9" y1="15" x2="15" y2="15" /></svg>, onClick: handleNewDoc },
              { label: '匯入檔案', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>, onClick: handleImport },
              { label: '匯入資料夾', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="10" x2="12" y2="16" /><line x1="9" y1="13" x2="15" y2="13" /></svg>, onClick: handleImportFolder },
              {
                label: '新增分類', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="6" /><line x1="12" y1="11" x2="12" y2="15" /><line x1="10" y1="13" x2="14" y2="13" /></svg>,
                onClick: () => { setAddingCategory(true); setTimeout(() => newCatRef.current?.focus(), 50) }
              },
            ].map(({ label, icon, onClick }) => (
              <button key={label} onClick={onClick} aria-label={label} title={label} className="dr-icon-btn"
                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--muted)', cursor: 'pointer' }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* New category input */}
        {addingCategory && (
          <div style={{ display: 'flex', gap: 6, padding: '0 2px 10px' }}>
            <input
              ref={newCatRef}
              placeholder="分類名稱…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCategory(e.currentTarget.value)
                if (e.key === 'Escape') setAddingCategory(false)
              }}
              autoFocus
              style={{ flex: 1, minWidth: 0, height: 30, padding: '0 10px', background: 'var(--paper)', border: '1px solid var(--amber)', borderRadius: 7, color: 'var(--ink)', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, outline: 'none' }}
            />
            <button
              onClick={() => newCatRef.current && addCategory(newCatRef.current.value)}
              style={{ flexShrink: 0, padding: '0 12px', height: 30, background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: 7, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
            >新增</button>
          </div>
        )}

        {/* Categories with DnD */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={catIds} strategy={verticalListSortingStrategy}>
            {cats.map((cat) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                files={files.filter((f) => f.catId === cat.id)}
                activeFileId={activeFileId}
                onOpenFile={onOpenFile}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {dragActiveId ? <DragPreview id={dragActiveId} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>DocReader · v2.1.0</span>
          <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--muted)', textDecoration: 'none' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
            回報問題
          </a>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: TypeScript 型別檢查**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: 無新增的型別錯誤。

- [ ] **Step 3: Commit**

```bash
git add src/components/docreader/Sidebar.tsx
git commit -m "feat(sidebar): 以 dnd-kit 實作分類與檔案拖曳排序"
```

---

## Task 4: 從 DocReader 移除 dragFileId

**Files:**
- Modify: `src/components/docreader/DocReader.tsx`

- [ ] **Step 1: 移除 dragFileId ref 宣告**

找到第 25 行附近：
```ts
  const dragFileId = useRef<string | null>(null)
```
刪除這一行。

同時從第 24 行的 `useRef` import 中確認是否還有其他用途。若 `useRef` 僅用於 `mainRef` 與 `newCatRef`（在 Sidebar 中），則 DocReader 仍保留 `useRef`（`mainRef` 仍在用）。

- [ ] **Step 2: 移除 Sidebar 的 dragFileId prop**

找到 `<Sidebar` 的 JSX（第 232–236 行附近）：

```tsx
        <Sidebar
          onOpenDemo={openDemo}
          onOpenFile={openFile}
          onNewDoc={handleNewDoc}
          dragFileId={dragFileId}
        />
```

改為：

```tsx
        <Sidebar
          onOpenDemo={openDemo}
          onOpenFile={openFile}
          onNewDoc={handleNewDoc}
        />
```

- [ ] **Step 3: TypeScript 型別檢查**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: 無錯誤。

- [ ] **Step 4: Commit**

```bash
git add src/components/docreader/DocReader.tsx
git commit -m "refactor(docreader): 移除已廢棄的 dragFileId ref"
```

---

## Task 5: 建置驗證

**Files:** 無異動

- [ ] **Step 1: 執行 Next.js 建置**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` 或 `Route (app) ... First Load JS`，無 error。

- [ ] **Step 2: 啟動 dev server 手動驗證**

```bash
npm run dev
```

在瀏覽器開啟 `http://localhost:3000`，確認以下行為：

| 動作 | 預期結果 |
|---|---|
| 拖曳分類標題列上下移動 | 分類重排，相鄰分類平滑讓位 |
| 拖曳檔案在同分類內移動 | 檔案重排 |
| 拖曳檔案到另一個分類標題上 | 檔案移入該分類 |
| 拖曳檔案到另一個分類的某個檔案上 | 檔案移入，排在目標檔案位置 |
| 點擊分類標題列（不拖） | 正常展開/收合 |
| 點擊分類重新命名、刪除按鈕 | 不觸發拖曳，正常作用 |
| 點擊檔案刪除按鈕 | 不觸發拖曳，正常刪除 |
| 重新整理頁面 | 排序結果持久化（localStorage） |

- [ ] **Step 3: 停止 dev server（Ctrl+C）**
