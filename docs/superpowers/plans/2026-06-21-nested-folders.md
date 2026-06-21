# 巢狀資料夾 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 Category 資料夾可以最多三層巢狀，透過「拖到中心 = 放進去、拖到邊緣 = 排序」手勢操作。

**Architecture:** 在 `Category` 介面加 `parentId` 欄位（adjacency list），`cats` 陣列保持平面；`src/lib/tree.ts` 負責從平面陣列建出渲染用的樹；`Sidebar.tsx` 的 `CategoryRow` 改為遞迴，DnD 加自訂手勢偵測。

**Tech Stack:** Next.js (App Router)、Zustand、@dnd-kit/core v6、@dnd-kit/sortable v10、TypeScript

---

## 檔案地圖

| 動作 | 路徑 | 職責 |
|------|------|------|
| 新增 | `src/lib/tree.ts` | buildTree、getDepth、getSubtreeMaxDepth、getDescendants |
| 修改 | `src/store/docreader.ts` | Category.parentId、nestCategory、deleteCategory（遞迴）、reorderCats（同層守衛） |
| 修改 | `src/components/docreader/DeleteCatDialog.tsx` | 確認訊息顯示後代數量 |
| 修改 | `src/components/docreader/Sidebar.tsx` | 遞迴 CategoryRow、dropIntent 狀態、手勢偵測 |

---

## Task 1：Tree Helper Functions

**Files:**
- Create: `src/lib/tree.ts`

- [ ] **Step 1：建立 `src/lib/tree.ts`**

```ts
import type { Category, DocFile } from '@/store/docreader'

export interface CategoryNode {
  cat: Category
  children: CategoryNode[]
  files: DocFile[]
}

/** 從平面 cats 陣列建出根層樹（保留 cats 原始順序） */
export function buildTree(cats: Category[], files: DocFile[]): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>()
  for (const cat of cats) {
    nodeMap.set(cat.id, { cat, children: [], files: [] })
  }
  for (const file of files) {
    nodeMap.get(file.catId)?.files.push(file)
  }
  const roots: CategoryNode[] = []
  for (const cat of cats) {
    const node = nodeMap.get(cat.id)!
    if (!cat.parentId) {
      roots.push(node)
    } else {
      nodeMap.get(cat.parentId)?.children.push(node)
    }
  }
  return roots
}

/** 計算 id 在樹中的深度（根 = 1）*/
export function getDepth(cats: Category[], id: string): number {
  const cat = cats.find((c) => c.id === id)
  if (!cat?.parentId) return 1
  return 1 + getDepth(cats, cat.parentId)
}

/** 計算以 id 為根的子樹最大深度（葉節點 = 1）*/
export function getSubtreeMaxDepth(cats: Category[], id: string): number {
  const children = cats.filter((c) => c.parentId === id)
  if (children.length === 0) return 1
  return 1 + Math.max(...children.map((c) => getSubtreeMaxDepth(cats, c.id)))
}

/** 取得 id 所有後代 category ID（遞迴）*/
export function getDescendants(cats: Category[], id: string): string[] {
  const children = cats.filter((c) => c.parentId === id)
  return children.flatMap((c) => [c.id, ...getDescendants(cats, c.id)])
}
```

- [ ] **Step 2：TypeScript 編譯確認**

```bash
npx tsc --noEmit
```

Expected：無錯誤

- [ ] **Step 3：Commit**

```bash
git add src/lib/tree.ts
git commit -m "feat(tree): 新增巢狀資料夾 tree helper functions"
```

---

## Task 2：Store — 資料模型與 Actions

**Files:**
- Modify: `src/store/docreader.ts`

- [ ] **Step 1：在 `Category` 介面加 `parentId`**

在 `src/store/docreader.ts` 的 `Category` 介面加一個欄位：

```ts
export interface Category {
  id: string
  name: string
  deletable: boolean
  open: boolean
  parentId?: string | null   // null / undefined = 根層級
}
```

- [ ] **Step 2：在 `DocReaderActions` 加 `nestCategory`**

```ts
nestCategory: (id: string, parentId: string | null) => void
```

- [ ] **Step 3：實作 `nestCategory`（含深度守衛）**

在 store `(set, get) => ({...})` 裡加：

```ts
nestCategory: (id, parentId) =>
  set((s) => {
    const active = s.cats.find((c) => c.id === id)
    if (!active || !active.deletable) return {}
    if (parentId !== null) {
      const target = s.cats.find((c) => c.id === parentId)
      if (!target) return {}
      // 不能把自己放進自己或後代
      const descendants = getDescendants(s.cats, id)
      if (descendants.includes(parentId) || parentId === id) return {}
      // 深度守衛：parent 深度 + 自身子樹深度 ≤ 3
      const parentDepth = getDepth(s.cats, parentId)
      const subtreeDepth = getSubtreeMaxDepth(s.cats, id)
      if (parentDepth + subtreeDepth > 3) return {}
    }
    return {
      cats: s.cats.map((c) => (c.id === id ? { ...c, parentId } : c)),
    }
  }),
```

在檔案頂部加 import（store 內部直接呼叫 helper）：

```ts
import { getDepth, getSubtreeMaxDepth, getDescendants } from '@/lib/tree'
```

- [ ] **Step 4：修改 `deleteCategory` 改為遞迴刪除**

把現有的 `deleteCategory` 替換為：

```ts
deleteCategory: (id) =>
  set((s) => {
    const toDelete = new Set([id, ...getDescendants(s.cats, id)])
    return {
      cats: s.cats.filter((c) => !toDelete.has(c.id)),
      files: s.files.filter((f) => !toDelete.has(f.catId)),
      confirmCatId: null,
    }
  }),
```

- [ ] **Step 5：修改 `reorderCats` 加同層守衛**

把現有的 `reorderCats` 替換為：

```ts
reorderCats: (activeId, overId) =>
  set((s) => {
    const active = s.cats.find((c) => c.id === activeId)
    const over = s.cats.find((c) => c.id === overId)
    if (!active || !over) return {}
    // 同層守衛
    const activeParent = active.parentId ?? null
    const overParent = over.parentId ?? null
    if (activeParent !== overParent) return {}
    const from = s.cats.indexOf(active)
    const to = s.cats.indexOf(over)
    if (from === to) return {}
    const next = [...s.cats]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return { cats: next }
  }),
```

- [ ] **Step 6：TypeScript 編譯確認**

```bash
npx tsc --noEmit
```

Expected：無錯誤

- [ ] **Step 7：Commit**

```bash
git add src/store/docreader.ts
git commit -m "feat(store): 新增 nestCategory、更新 deleteCategory 遞迴刪除與 reorderCats 同層守衛"
```

---

## Task 3：DeleteCatDialog — 顯示後代數量

**Files:**
- Modify: `src/components/docreader/DeleteCatDialog.tsx`

- [ ] **Step 1：在 Dialog 裡算後代數量**

在 `src/components/docreader/DeleteCatDialog.tsx` 加 import 與計算：

```ts
import { getDescendants } from '@/lib/tree'
```

在 `DeleteCatDialog` 函式內，把 store 取用改為一次取出 `files`：

```ts
const { confirmCatId, cats, files, setConfirmCatId, deleteCategory } = useDocReaderStore()
const cat = confirmCatId ? cats.find((c) => c.id === confirmCatId) : null
const descendantIds = cat ? getDescendants(cats, cat.id) : []
const descendantCatCount = descendantIds.length
const affectedFileCount = cat
  ? files.filter((f) => [cat.id, ...descendantIds].includes(f.catId)).length
  : 0
```

- [ ] **Step 2：更新確認訊息文字**

把原本的 `<p>` 說明文字換為：

```tsx
<p style={{ margin: '8px 0 0', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13.5, lineHeight: 1.6, color: 'var(--muted)' }}>
  確定要刪除「<strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{cat.name}</strong>」嗎？
  {descendantCatCount > 0 && (
    <> 將連同 <strong style={{ color: 'var(--ink)' }}>{descendantCatCount} 個子資料夾</strong>、</>
  )}
  {affectedFileCount > 0 && (
    <><strong style={{ color: 'var(--ink)' }}>{affectedFileCount} 個檔案</strong> 一起刪除。</>
  )}
  {affectedFileCount === 0 && descendantCatCount === 0 && ' 此操作無法復原。'}
  {(affectedFileCount > 0 || descendantCatCount > 0) && '此操作無法復原。'}
</p>
```

- [ ] **Step 3：TypeScript 編譯確認**

```bash
npx tsc --noEmit
```

Expected：無錯誤

- [ ] **Step 4：Commit**

```bash
git add src/components/docreader/DeleteCatDialog.tsx
git commit -m "feat(ui): 刪除分類確認訊息顯示後代與檔案數量"
```

---

## Task 4：Sidebar — 遞迴 CategoryRow 與深度縮排

**Files:**
- Modify: `src/components/docreader/Sidebar.tsx`

- [ ] **Step 1：加 import**

在 `Sidebar.tsx` 頂部加：

```ts
import { buildTree, getDepth, getSubtreeMaxDepth, type CategoryNode } from '@/lib/tree'
```

- [ ] **Step 2：更新 `CategoryRow` 的 props 介面**

把 `CategoryRowProps` 改為：

```ts
interface CategoryRowProps {
  node: CategoryNode
  depth: number
  activeFileId: string | null
  onOpenFile: (id: string) => void
  dropTargetId: string | null
  dropIntent: 'nest' | 'reorder-above' | 'reorder-below' | null
}
```

- [ ] **Step 3：改寫 `CategoryRow` 支援遞迴 + 縮排 + 視覺反饋**

用以下實作取代現有 `CategoryRow`：

```tsx
function CategoryRow({ node, depth, activeFileId, onOpenFile, dropTargetId, dropIntent }: CategoryRowProps) {
  const { cat, children, files } = node
  const { toggleCat, setConfirmCatId, setRenamingCatId, renameCategory, renamingCatId } = useDocReaderStore()
  const isOpen = cat.open !== false
  const renameRef = useRef<HTMLInputElement>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
    disabled: !cat.deletable,
  })

  const isDropTarget = dropTargetId === cat.id
  const indent = depth * 14

  let headerBorder = '1px solid transparent'
  let headerBg = 'transparent'
  let topLine = false
  let bottomLine = false

  if (isDropTarget) {
    if (dropIntent === 'nest') {
      headerBorder = '1px solid var(--amber)'
      headerBg = 'color-mix(in srgb, var(--amber) 8%, transparent)'
    } else if (dropIntent === 'reorder-above') {
      topLine = true
    } else if (dropIntent === 'reorder-below') {
      bottomLine = true
    }
  }

  const fileIds = files.map((f) => f.id)
  const childIds = children.map((n) => n.cat.id)
  const allSortableIds = [...childIds, ...fileIds]

  return (
    <div
      ref={setNodeRef}
      data-cat
      data-cat-id={cat.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        marginTop: 8,
        borderRadius: 8,
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      {/* 排序指示線（上方） */}
      {topLine && (
        <div style={{ height: 2, background: 'var(--amber)', borderRadius: 1, margin: '0 4px' }} />
      )}

      <div
        data-cat-header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '4px 2px',
          paddingLeft: indent + 2,
          borderRadius: 7,
          border: headerBorder,
          background: headerBg,
          transition: 'border-color .12s, background .12s',
        }}
      >
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
              onClick={() => { if (!isDragging) toggleCat(cat.id) }}
              {...attributes}
              {...listeners}
              style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: cat.deletable ? 'grab' : 'default', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', padding: '2px 4px' }}
            >
              <span style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .18s', display: 'inline-flex' }}>
                <ChevronIcon />
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
              <span style={{ flexShrink: 0, color: 'var(--border)', fontWeight: 500 }}>
                {files.length + children.length}
              </span>
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

      {/* 排序指示線（下方） */}
      {bottomLine && (
        <div style={{ height: 2, background: 'var(--amber)', borderRadius: 1, margin: '0 4px' }} />
      )}

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 2 }}>
          <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
            {/* 子資料夾（遞迴） */}
            {children.map((child) => (
              <CategoryRow
                key={child.cat.id}
                node={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                onOpenFile={onOpenFile}
                dropTargetId={dropTargetId}
                dropIntent={dropIntent}
              />
            ))}
            {/* 檔案 */}
            {files.map((file) => (
              <SortableFileRow key={file.id} file={file} activeFileId={activeFileId} onOpenFile={onOpenFile} />
            ))}
          </SortableContext>
          {files.length === 0 && children.length === 0 && (
            <div style={{ padding: '6px 11px', paddingLeft: indent + 11, color: 'var(--muted)', fontSize: 12, opacity: 0.65, fontStyle: 'italic' }}>拖放檔案到此分類</div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4：TypeScript 編譯確認**

```bash
npx tsc --noEmit
```

Expected：無錯誤（此時 Sidebar 主體還沒接新 props，會有暫時 TS 錯誤，可先修正呼叫端）

- [ ] **Step 5：Commit**

```bash
git add src/components/docreader/Sidebar.tsx
git commit -m "feat(sidebar): CategoryRow 支援遞迴遞減與深度縮排"
```

---

## Task 5：Sidebar — DnD 手勢偵測與 onDragEnd 更新

**Files:**
- Modify: `src/components/docreader/Sidebar.tsx`

- [ ] **Step 1：在 `Sidebar` 加入手勢狀態與 pointer 追蹤**

在 `Sidebar` 函式內，加以下 state 與 ref（放在 `dragActiveId` 旁邊）：

```ts
const [dragActiveId, setDragActiveId] = useState<string | null>(null)
const [dropTargetId, setDropTargetId] = useState<string | null>(null)
const [dropIntent, setDropIntent] = useState<'nest' | 'reorder-above' | 'reorder-below' | null>(null)
const pointerRef = useRef({ x: 0, y: 0 })
```

在 return 的 `<aside>` 上加 `onPointerMove`：

```tsx
<aside
  id="dr-sidebar"
  onPointerMove={(e) => { pointerRef.current = { x: e.clientX, y: e.clientY } }}
  ...
>
```

- [ ] **Step 2：加 `nestCategory` 到 store 取用**

在 `Sidebar` 的 store 取用那行加 `nestCategory`：

```ts
const { cats, files, activeFileId, addingCategory, setAddingCategory, addCategory,
        reorderCats, reorderFiles, moveFile, nestCategory } = useDocReaderStore()
```

- [ ] **Step 3：實作 `handleDragMove`**

在 `handleDragStart` 後加入 `handleDragMove`：

```ts
const handleDragMove = ({ over }: import('@dnd-kit/core').DragMoveEvent) => {
  if (!over) {
    setDropTargetId(null)
    setDropIntent(null)
    return
  }
  const overId = String(over.id)
  const isCatTarget = cats.some((c) => c.id === overId)
  if (!isCatTarget) {
    setDropTargetId(null)
    setDropIntent(null)
    return
  }
  // 取得目標 header 元素的 bounding rect
  const headerEl = document.querySelector(`[data-cat-id="${overId}"] [data-cat-header]`)
  if (!headerEl) {
    setDropTargetId(null)
    setDropIntent(null)
    return
  }
  const rect = headerEl.getBoundingClientRect()
  const y = pointerRef.current.y
  const isTopEdge = y < rect.top + rect.height * 0.25
  const isBottomEdge = y > rect.bottom - rect.height * 0.25

  if (isTopEdge || isBottomEdge) {
    setDropTargetId(overId)
    setDropIntent(isTopEdge ? 'reorder-above' : 'reorder-below')
    return
  }

  // 中心：嘗試巢狀 — 做深度守衛（UI 層）
  if (dragActiveId) {
    const parentDepth = getDepth(cats, overId)
    const subtreeDepth = getSubtreeMaxDepth(cats, dragActiveId)
    const targetCat = cats.find((c) => c.id === overId)
    // 不可巢狀：深度超限、放進不可刪除的 cat、放進自身後代
    const descendants = getDescendants(cats, dragActiveId)
    const canNest =
      targetCat?.deletable &&
      overId !== dragActiveId &&
      !descendants.includes(overId) &&
      parentDepth + subtreeDepth <= 3

    if (canNest) {
      setDropTargetId(overId)
      setDropIntent('nest')
    } else {
      setDropTargetId(overId)
      setDropIntent('reorder-below')
    }
  }
}
```

- [ ] **Step 4：更新 `handleDragEnd`**

把現有 `handleDragEnd` 替換為：

```ts
const handleDragEnd = ({ active, over }: DragEndEvent) => {
  const intent = dropIntent
  const targetId = dropTargetId
  setDragActiveId(null)
  setDropTargetId(null)
  setDropIntent(null)

  if (!over || active.id === over.id) return

  const activeId = String(active.id)
  const overId = String(over.id)

  const isCat = (id: string) => cats.some((c) => c.id === id)
  const isFile = (id: string) => files.some((f) => f.id === id)

  if (isCat(activeId) && isCat(overId)) {
    if (intent === 'nest') {
      nestCategory(activeId, overId)
    } else {
      reorderCats(activeId, overId)
    }
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
        reorderFiles(activeId, overId)
      }
    } else if (isCat(overId)) {
      moveFile(activeId, overId)
    }
  }
}
```

- [ ] **Step 5：更新 `handleDragCancel`**

```ts
const handleDragCancel = () => {
  setDragActiveId(null)
  setDropTargetId(null)
  setDropIntent(null)
}
```

- [ ] **Step 6：把 `onDragMove` 接上 DndContext**

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragMove={handleDragMove}
  onDragEnd={handleDragEnd}
  onDragCancel={handleDragCancel}
>
```

- [ ] **Step 7：用 `buildTree` 取代原本的 `cats.map` 渲染**

把原本的 `SortableContext items={catIds}` 那段改為：

```tsx
{/* 用根層 catIds 做 sortable context */}
{(() => {
  const tree = buildTree(cats, files)
  const rootIds = tree.map((n) => n.cat.id)
  return (
    <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
      {tree.map((node) => (
        <CategoryRow
          key={node.cat.id}
          node={node}
          depth={0}
          activeFileId={activeFileId}
          onOpenFile={onOpenFile}
          dropTargetId={dropTargetId}
          dropIntent={dropIntent}
        />
      ))}
    </SortableContext>
  )
})()}
```

同時移除不再需要的 `const catIds = cats.map((c) => c.id)` 這行。

- [ ] **Step 8：TypeScript 編譯確認**

```bash
npx tsc --noEmit
```

Expected：無錯誤

- [ ] **Step 9：啟動 dev server 手動驗證**

```bash
npm run dev
```

驗證清單：
1. 現有資料夾正常顯示（不因 `parentId` 缺失而出錯）
2. 拖曳資料夾到另一個資料夾中心 → amber 框出現 → 放下後成為子資料夾
3. 拖曳資料夾到邊緣 → amber 插入線出現 → 放下後重新排序
4. 子資料夾顯示縮排（14px/層）
5. 第三層資料夾嘗試再拖入其他資料夾 → 深度守衛，amber 框不出現
6. `未分類` 無法被拖入任何資料夾（`deletable: false` 已被守衛排除）
7. 刪除有子資料夾的父資料夾 → 確認對話框顯示正確數量 → 刪除後全部消失

- [ ] **Step 10：Commit**

```bash
git add src/components/docreader/Sidebar.tsx
git commit -m "feat(sidebar): 巢狀資料夾 DnD 手勢偵測（中心放進去、邊緣排序）"
```

---

## 完成後

所有功能完成後，可選擇執行：

```bash
git log --oneline -6
```

確認所有 commit 都在，並執行 `npm run build` 確認 production build 無誤。
