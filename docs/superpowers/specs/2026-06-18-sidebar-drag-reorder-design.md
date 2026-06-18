# 左側欄拖曳排序設計

**日期**：2026-06-18  
**功能**：左側欄同層元素（分類、檔案）可拖移調整順序

---

## 需求摘要

- 分類（Category）可在同層互相拖動重排
- 同一分類內的檔案（DocFile）可在分類內拖動重排
- 跨分類移動檔案的現有行為保留，改由 dnd-kit 統一接管

---

## 技術選型

使用 **@dnd-kit/core** + **@dnd-kit/sortable**，理由：

- React 生態主流排序拖曳解決方案，積極維護
- `SortableContext` 自動處理位移動畫
- 支援鍵盤存取、觸控、pointer events
- TypeScript 支援完整
- 現有 HTML5 drag（`onDragOver` / `onDrop`）可完全移除，由 dnd-kit 統一接管

---

## Store 變更

在 `src/store/docreader.ts` 新增兩個 action：

```ts
reorderCats(activeId: string, overId: string): void
reorderFiles(activeId: string, overId: string): void
```

### reorderCats

```ts
reorderCats: (activeId, overId) =>
  set((s) => {
    const from = s.cats.findIndex((c) => c.id === activeId)
    const to   = s.cats.findIndex((c) => c.id === overId)
    if (from === -1 || to === -1 || from === to) return {}
    return { cats: arrayMove(s.cats, from, to) }
  })
```

### reorderFiles

```ts
reorderFiles: (activeId, overId) =>
  set((s) => {
    const from = s.files.findIndex((f) => f.id === activeId)
    const to   = s.files.findIndex((f) => f.id === overId)
    if (from === -1 || to === -1 || from === to) return {}
    return { files: arrayMove(s.files, from, to) }
  })
```

`arrayMove` 從 `@dnd-kit/sortable` 匯入。

現有 `moveFile(id, catId)` 不變，仍用於跨分類移動。

---

## 元件架構

```
<DndContext
  sensors={[PointerSensor, KeyboardSensor]}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext items={catIds} strategy={verticalListSortingStrategy}>
    {cats.map(cat =>
      <CategoryRow key={cat.id} ...>
        <SortableContext items={fileIds} strategy={verticalListSortingStrategy}>
          {files.map(file => <FileRow key={file.id} ... />)}
        </SortableContext>
      </CategoryRow>
    )}
  </SortableContext>

  <DragOverlay>
    {activeId ? <DragPreview id={activeId} /> : null}
  </DragOverlay>
</DndContext>
```

- `DndContext` 包在整個分類列表外層（`Sidebar` 元件內）
- `CategoryRow` 的分類標題列用 `useSortable(cat.id)` 取得拖曳 handle
- `FileRow`（原 `[data-libitem]` div）用 `useSortable(file.id)` 取得拖曳屬性

---

## onDragEnd 邏輯

```ts
function handleDragEnd({ active, over }: DragEndEvent) {
  if (!over || active.id === over.id) return

  const activeId = String(active.id)
  const overId   = String(over.id)

  const isCat  = (id: string) => cats.some((c) => c.id === id)
  const isFile = (id: string) => files.some((f) => f.id === id)

  if (isCat(activeId) && isCat(overId)) {
    // 分類重排
    reorderCats(activeId, overId)
    return
  }

  if (isFile(activeId)) {
    if (isFile(overId)) {
      const activeCat = files.find((f) => f.id === activeId)!.catId
      const overCat   = files.find((f) => f.id === overId)!.catId
      if (activeCat === overCat) {
        // 同分類內重排
        reorderFiles(activeId, overId)
      } else {
        // 跨分類：移動到目標檔案所在分類
        moveFile(activeId, overCat)
      }
    } else if (isCat(overId)) {
      // 拖到分類標題：移動到該分類
      moveFile(activeId, overId)
    }
  }
}
```

---

## 視覺反饋

| 效果 | 實作方式 |
|---|---|
| 相鄰元素平滑讓位 | `verticalListSortingStrategy` 自動處理 CSS transform |
| 拖曳中的半透明複本 | `<DragOverlay>` 包裝 `<DragPreview>` 元件 |
| 被拖曳原位佔位 | `useSortable` 傳回的 `isDragging` 控制 `opacity: 0` |
| 現有分類 hover 高亮 | 移除舊的 `onDragOver` inline style，改由 dnd-kit over 狀態控制 |

---

## 移除的舊程式碼

- `CategoryRow` 上的 `onDragOver` / `onDragLeave` / `onDrop` handler
- `[data-libitem]` 上的 `draggable` / `onDragStart`
- `SidebarProps.dragFileId: MutableRefObject<string | null>`（及其在 `DocReader` 的 ref）

---

## 不在此次範圍

- 觸控裝置長按拖曳（可後續用 `TouchSensor` 加入）
- 跨分類時顯示「插入到哪個位置」的細粒度指示線（目前移到分類末尾）
