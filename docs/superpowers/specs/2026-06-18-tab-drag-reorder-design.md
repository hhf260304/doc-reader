# Tab 拖移排序設計文件

**日期：** 2026-06-18  
**範圍：** `src/components/docreader/TabBar.tsx`、`src/store/docreader.ts`

---

## 目標

讓使用者能以滑鼠拖移 TabBar 中的分頁，改變 `openTabs` 的排列順序。

---

## 設計決策

- **視覺風格：** 就地位移（shift-in-place）。拖移時其他 Tab 平滑讓開，無幽靈覆蓋層。
- **實作方案：** dnd-kit（`@dnd-kit/core` + `@dnd-kit/sortable`），與側欄現有排序行為一致。
- **排列方向：** 水平（`horizontalListSortingStrategy`）。

---

## 架構

### 1. Store — 新增 `reorderTabs` action

**檔案：** `src/store/docreader.ts`

在 `DocReaderActions` 介面加入：

```ts
reorderTabs: (activeId: string, overId: string) => void
```

實作：

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

`openTabs` 已在 `partialize` 中被持久化，所以排序結果自動存入 localStorage，無需額外修改。

### 2. TabBar — 加入 dnd-kit 排序能力

**檔案：** `src/components/docreader/TabBar.tsx`

**外層結構：**

```
DndContext
  ├── sensors: [PointerSensor { activationConstraint: { distance: 5 } }]
  ├── collisionDetection: closestCenter
  └── onDragEnd: (e) => { if (e.over) reorderTabs(e.active.id, e.over.id) }
      └── SortableContext
            ├── items: openTabs
            ├── strategy: horizontalListSortingStrategy
            └── {openTabs.map(id => <SortableTab key={id} ... />)}
```

**SortableTab 元件（內部元件）：**

從 `useSortable(fileId)` 取得 `{ attributes, listeners, setNodeRef, transform, transition, isDragging }`，套用至 tab 的根 `<div>`：

```ts
style={{
  transform: CSS.Translate.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
  // ...其他既有樣式
}}
```

`listeners` 掛在根 `<div>`，關閉按鈕沿用現有 `e.stopPropagation()`，不受影響。

---

## 邊界情況

| 情況 | 處理方式 |
|------|----------|
| 拖移距離 < 5px（點擊） | `activationConstraint: { distance: 5 }` 確保短距離視為 click，不觸發拖移 |
| 拖到相同位置 | `from === to` 提早 return，不更新 state |
| 單一 tab | `SortableContext` 正常運作，只是沒有位移效果 |
| Tab 溢出水平捲動 | 現有 `overflowX: auto` 不受影響；跨捲動區拖移暫不支援 |

---

## 不在範圍內

- Tab 之間的 DragOverlay 幽靈層
- 跨越捲動邊界的自動捲動
- 觸控裝置特別優化（dnd-kit PointerSensor 本身支援觸控，夠用）

---

## 受影響檔案

| 檔案 | 變更類型 |
|------|----------|
| `src/store/docreader.ts` | 新增 `reorderTabs` action |
| `src/components/docreader/TabBar.tsx` | 重構為 dnd-kit SortableContext |
