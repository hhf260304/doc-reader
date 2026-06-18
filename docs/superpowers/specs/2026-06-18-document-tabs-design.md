# 文件分頁功能設計

**日期**：2026-06-18  
**狀態**：已核准，待實作

## 概述

在 DocReader 加入橫向分頁列，讓使用者能同時開啟多份文件並在分頁間切換，切換時自動還原各分頁上次的捲動位置。分頁狀態與捲動位置皆 persist 至 localStorage，重新整理後完整還原。

---

## 需求

- 可同時開啟多份文件
- 切換分頁時回到上次閱讀的位置（scrollTop）
- 分頁列與捲動位置在 reload 後都要還原
- 點擊 sidebar 中已開啟的文件，切換到該分頁（不重複開啟）
- 每個分頁有 × 關閉按鈕，關閉不刪除文件
- 所有分頁關閉後顯示 Demo 頁（activeFileId = null）

---

## 版面配置（方案 B）

分頁列放在主內容區頂端，sidebar 保持獨立：

```
┌──────────────────────────────────────────────────┐
│ Navbar                                           │
├──────────┬───────────────────────────────────────┤
│          │ [README.md ×] [安裝指南.md ×] [FAQ ×] │ ← TabBar
│ Sidebar  ├───────────────────────────────────────┤
│          │ MainContent                           │
│          │                                       │
├──────────┴───────────────────────────────────────┤
│                                          Outline │
└──────────────────────────────────────────────────┘
```

DOM 結構調整：

```
<div style="flex:1; display:flex; minHeight:0">
  <Sidebar />
  <div style="flex:1; display:flex; flexDirection:column; minWidth:0">
    <TabBar />        ← 新增
    <MainContent />
  </div>
  <Outline />
</div>
```

---

## Store 變更（`src/store/docreader.ts`）

### 新增 state 欄位

```ts
openTabs: string[]                       // 分頁順序（fileId 陣列）
scrollPositions: Record<string, number>  // 各分頁上次的 scrollTop
```

初始值：`openTabs: []`、`scrollPositions: {}`

### 新增 actions

| Action | 說明 |
|---|---|
| `openTab(id: string)` | 若 id 不在 openTabs → push；設 activeFileId = id |
| `closeTab(id: string)` | 從 openTabs 移除；若關掉的是 activeFileId，切換到右邊分頁（無則左邊，再無則 null） |
| `setScrollPosition(id: string, top: number)` | 更新 `scrollPositions[id]` |

### 修改既有 actions

- `deleteFile(id)`：同時從 `openTabs` 移除 id，並刪除 `scrollPositions[id]`
- `addFile(file)`：新增後呼叫 `openTab(file.id)`（取代直接設 `activeFileId`）

### Persist

```ts
partialize: (s) => ({
  cats: s.cats,
  files: s.files,
  activeFileId: s.activeFileId,
  openTabs: s.openTabs,
  scrollPositions: s.scrollPositions,
})
```

---

## 新元件：`TabBar`（`src/components/docreader/TabBar.tsx`）

props：
```ts
interface TabBarProps {
  onSwitchTab: (id: string) => void
  onCloseTab: (id: string) => void
}
```

行為：
- 從 store 讀 `openTabs`、`activeFileId`、`files`（取 name）
- 無分頁時回傳 `null`（不佔空間）
- 超出寬度時橫向 overflow scroll

樣式（與現有主題一致）：
- 底色 `var(--sidebar-bg)`
- 下邊線 `1px solid var(--border)`
- active tab：`var(--paper)` 底、amber（`var(--amber)`）2px 底線、`var(--brown)` 字色
- inactive tab：hover 時輕底色
- 檔名超長截斷加 `…`
- × 按鈕：active tab 固定顯示，inactive tab 僅 hover 時顯示（與 VS Code 一致）

---

## 捲動位置的存取時機

### 儲存

在 `DocReader.openFile()` 中，切換前**同步**儲存當前捲動：

```ts
const openFile = useCallback((id: string) => {
  // 1. 儲存舊分頁的 scrollTop
  if (activeFileId) {
    setScrollPosition(activeFileId, mainRef.current?.scrollTop ?? 0)
  }
  // 2. 切換分頁
  openTab(id)
  setEditing(false)
}, [activeFileId, setScrollPosition, openTab, setEditing])
```

### 還原

在 `DocReader` 新增 `useEffect`，監聽 `activeFileId` 變化：

```ts
useEffect(() => {
  if (activeFileId === null) return
  const pos = scrollPositions[activeFileId] ?? 0
  mainRef.current?.scrollTo({ top: pos })
}, [activeFileId])
```

**時序說明**：React 保證 children（MainContent）的 effect 先於 parent（DocReader）執行，所以 HTML 渲染完成後才還原 scrollTop，不需要 setTimeout / rAF。

---

## `closeTab` 的相鄰分頁邏輯

```
關閉 idx = openTabs.indexOf(id)
新 openTabs = openTabs.filter(t => t !== id)

若 id === activeFileId：
  新 activeFileId = 新 openTabs[idx] ?? 新 openTabs[idx - 1] ?? null
否則：
  activeFileId 不變
```

---

## 不在範圍內

- Demo 頁不作為可關閉的分頁（仍是 activeFileId === null 的 fallback）
- 分頁拖曳排序
- 分頁數量上限
- 鍵盤快速鍵切換分頁

---

## 檔案異動清單

| 檔案 | 異動類型 |
|---|---|
| `src/store/docreader.ts` | 修改：新增 state + actions |
| `src/components/docreader/TabBar.tsx` | 新增 |
| `src/components/docreader/DocReader.tsx` | 修改：openFile、新 useEffect、版面加 TabBar |
