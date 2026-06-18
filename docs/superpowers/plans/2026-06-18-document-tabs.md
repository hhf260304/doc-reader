# Document Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在主內容區頂端加入橫向分頁列，讓使用者可同時開啟多份文件，切換時還原各分頁的捲動位置，分頁狀態與捲動位置 persist 至 localStorage。

**Architecture:** 在現有 Zustand store 加入 `openTabs: string[]` 與 `scrollPositions: Record<string, number>`，新增 `TabBar` 元件渲染分頁列，並在 `DocReader` 的 `openFile` callback 與 `useEffect` 中處理捲動的存取時機。

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand 5 (with persist), inline styles + CSS classes in globals.css

---

## File Map

| 檔案 | 動作 | 說明 |
|---|---|---|
| `src/store/docreader.ts` | 修改 | 新增 openTabs、scrollPositions state 與 actions |
| `src/components/docreader/TabBar.tsx` | 新增 | 分頁列元件 |
| `src/app/globals.css` | 修改 | 加入 .dr-tab hover CSS |
| `src/components/docreader/DocReader.tsx` | 修改 | 加入 TabBar、調整 openFile、新增 scroll restore useEffect |
| `src/components/docreader/Sidebar.tsx` | 修改 | 移除 deleteFile 後多餘的 setActiveFileId(null) 呼叫 |

---

## Task 1：擴充 Store

**Files:**
- Modify: `src/store/docreader.ts`

- [ ] **Step 1：在 `DocReaderState` 加入新欄位**

  找到 `interface DocReaderState {`，在 `// Persisted` 區段加入兩個新欄位（在 `activeFileId` 後面）：

  ```ts
  interface DocReaderState {
    // Persisted
    cats: Category[]
    files: DocFile[]
    activeFileId: string | null
    openTabs: string[]                          // ← 新增
    scrollPositions: Record<string, number>     // ← 新增

    // UI (not persisted)
    addingCategory: boolean
    // ... 其餘不變
  }
  ```

- [ ] **Step 2：在 `DocReaderActions` 加入新 actions**

  找到 `interface DocReaderActions {`，加入三個新 action：

  ```ts
  interface DocReaderActions {
    // ... 現有 actions 不變

    openTab: (id: string) => void
    closeTab: (id: string) => void
    setScrollPosition: (id: string, top: number) => void

    // ... 其餘不變
  }
  ```

- [ ] **Step 3：在 `create(...)` 初始值加入新欄位**

  找到 `cats: DEFAULT_CATS,` 區塊，在 `activeFileId: null,` 後面加入：

  ```ts
  openTabs: [],
  scrollPositions: {},
  ```

- [ ] **Step 4：實作三個新 actions**

  在 `setActiveHeadingId: (id) => set({ activeHeadingId: id }),` 後面加入：

  ```ts
  openTab: (id) =>
    set((s) => ({
      openTabs: s.openTabs.includes(id) ? s.openTabs : [...s.openTabs, id],
      activeFileId: id,
    })),

  closeTab: (id) =>
    set((s) => {
      const idx = s.openTabs.indexOf(id)
      const newTabs = s.openTabs.filter((t) => t !== id)
      const newPositions = { ...s.scrollPositions }
      delete newPositions[id]
      const newActive =
        s.activeFileId === id
          ? (newTabs[idx] ?? newTabs[idx - 1] ?? null)
          : s.activeFileId
      return { openTabs: newTabs, scrollPositions: newPositions, activeFileId: newActive }
    }),

  setScrollPosition: (id, top) =>
    set((s) => ({ scrollPositions: { ...s.scrollPositions, [id]: top } })),
  ```

- [ ] **Step 5：修改 `addFile` — 同時加入 openTabs**

  把現有的 `addFile` 實作：

  ```ts
  addFile: (file) =>
    set((s) => ({
      files: [...s.files, file],
      activeFileId: file.id,
      editing: false,
    })),
  ```

  改為：

  ```ts
  addFile: (file) =>
    set((s) => ({
      files: [...s.files, file],
      openTabs: s.openTabs.includes(file.id) ? s.openTabs : [...s.openTabs, file.id],
      activeFileId: file.id,
      editing: false,
    })),
  ```

- [ ] **Step 6：修改 `deleteFile` — 連帶清理 openTabs 與 scrollPositions**

  把現有的 `deleteFile` 實作：

  ```ts
  deleteFile: (id) => {
    const wasActive = get().activeFileId === id
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      activeFileId: wasActive ? null : s.activeFileId,
    }))
    return wasActive
  },
  ```

  改為：

  ```ts
  deleteFile: (id) => {
    const { activeFileId, openTabs, scrollPositions } = get()
    const wasActive = activeFileId === id
    const idx = openTabs.indexOf(id)
    const newTabs = openTabs.filter((t) => t !== id)
    const newPositions = { ...scrollPositions }
    delete newPositions[id]
    const newActive = wasActive
      ? (newTabs[idx] ?? newTabs[idx - 1] ?? null)
      : activeFileId
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      openTabs: newTabs,
      scrollPositions: newPositions,
      activeFileId: newActive,
    }))
    return wasActive
  },
  ```

- [ ] **Step 7：修改 `partialize` — 加入新欄位**

  找到 `partialize: (s) => ({ cats: s.cats, files: s.files, activeFileId: s.activeFileId }),`，改為：

  ```ts
  partialize: (s) => ({
    cats: s.cats,
    files: s.files,
    activeFileId: s.activeFileId,
    openTabs: s.openTabs,
    scrollPositions: s.scrollPositions,
  }),
  ```

- [ ] **Step 8：型別檢查**

  ```bash
  cd /Users/user/Documents/個人/專案/doc-reader
  npx tsc --noEmit
  ```

  Expected：無錯誤輸出。

- [ ] **Step 9：Commit**

  ```bash
  git add src/store/docreader.ts
  git commit -m "feat(store): 新增 openTabs 與 scrollPositions 支援多分頁"
  ```

---

## Task 2：新增 TabBar 元件與 CSS

**Files:**
- Create: `src/components/docreader/TabBar.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1：建立 `TabBar.tsx`**

  建立新檔案 `src/components/docreader/TabBar.tsx`，內容如下：

  ```tsx
  'use client'

  import { useDocReaderStore } from '@/store/docreader'

  interface TabBarProps {
    onSwitchTab: (id: string) => void
    onCloseTab: (id: string) => void
  }

  export function TabBar({ onSwitchTab, onCloseTab }: TabBarProps) {
    const { openTabs, activeFileId, files } = useDocReaderStore()

    if (openTabs.length === 0) return null

    return (
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
            <div
              key={fileId}
              className="dr-tab"
              data-active={isActive ? 'true' : 'false'}
              onClick={() => onSwitchTab(fileId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 10px 0 14px',
                height: 36,
                cursor: 'pointer',
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
        })}
      </div>
    )
  }
  ```

- [ ] **Step 2：在 `globals.css` 加入 tab hover 樣式**

  在 `/* ===== Interactive hover states ===== */` 區段的最後一行（`.dr-scroll-top:hover` 之後）加入：

  ```css
  /* Tab bar */
  .dr-tab .dr-tab-close { opacity: 0; transition: opacity 0.12s; }
  .dr-tab:hover .dr-tab-close { opacity: 1; }
  .dr-tab[data-active="true"] .dr-tab-close { opacity: 1; }
  .dr-tab:hover { background: rgba(212,169,106,0.08) !important; }
  .dr-tab[data-active="true"]:hover { background: var(--paper) !important; }
  .dr-tab-close:hover { background: rgba(0,0,0,0.08) !important; color: var(--brown) !important; }
  ```

- [ ] **Step 3：型別檢查**

  ```bash
  npx tsc --noEmit
  ```

  Expected：無錯誤輸出。

- [ ] **Step 4：Commit**

  ```bash
  git add src/components/docreader/TabBar.tsx src/app/globals.css
  git commit -m "feat(ui): 新增 TabBar 元件與 hover 樣式"
  ```

---

## Task 3：接線 DocReader 與修正 Sidebar

**Files:**
- Modify: `src/components/docreader/DocReader.tsx`
- Modify: `src/components/docreader/Sidebar.tsx`

- [ ] **Step 1：在 DocReader 的 import 加入 TabBar**

  在 `import { Outline } from './Outline'` 後加入：

  ```ts
  import { TabBar } from './TabBar'
  ```

- [ ] **Step 2：從 store 解構新 actions**

  找到現有的 store 解構：

  ```ts
  const { activeFileId, files, setActiveFileId, setHeadings, setActiveHeadingId, setEditing, addFile } = useDocReaderStore()
  ```

  改為：

  ```ts
  const { activeFileId, files, setActiveFileId, setHeadings, setActiveHeadingId, setEditing, addFile, openTab, closeTab, setScrollPosition } = useDocReaderStore()
  ```

- [ ] **Step 3：修改 `openFile` callback — 儲存舊 scroll、開啟新分頁**

  找到現有的 `openFile`：

  ```ts
  const openFile = useCallback((id: string) => {
    setActiveFileId(id)
    setEditing(false)
    mainRef.current?.scrollTo({ top: 0 })
  }, [setActiveFileId, setEditing])
  ```

  改為：

  ```ts
  const openFile = useCallback((id: string) => {
    if (activeFileId) setScrollPosition(activeFileId, mainRef.current?.scrollTop ?? 0)
    openTab(id)
    setEditing(false)
  }, [activeFileId, setScrollPosition, openTab, setEditing])
  ```

- [ ] **Step 4：新增 `handleCloseTab` callback**

  在 `openFile` 定義之後加入：

  ```ts
  const handleCloseTab = useCallback((id: string) => {
    closeTab(id)
  }, [closeTab])
  ```

- [ ] **Step 5：新增 scroll restore useEffect**

  在現有的 scroll spy `useEffect`（監聽 `main.addEventListener('scroll', update)`）之後，加入：

  ```ts
  // Restore scroll position when active tab changes
  useEffect(() => {
    if (activeFileId === null) return
    const pos = useDocReaderStore.getState().scrollPositions[activeFileId] ?? 0
    mainRef.current?.scrollTo({ top: pos })
  }, [activeFileId]) // eslint-disable-line react-hooks/exhaustive-deps
  ```

  > 注意：intentionally 不把 `scrollPositions` 放入 dep array，避免每次 scroll save 都觸發 effect。改用 `getState()` 在 effect 執行當下讀取最新值。

- [ ] **Step 6：調整版面結構 — 用 column flex 容器包住 TabBar 與 MainContent**

  找到現有的版面結構：

  ```tsx
  <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
    <Sidebar
      onOpenDemo={openDemo}
      onOpenFile={openFile}
      onNewDoc={handleNewDoc}
      dragFileId={dragFileId}
    />

    {/* Mobile drawer backdrop */}
    {isMobile && drawerOpen && (
      <div
        onClick={() => setDrawerOpen(false)}
        style={{ position: 'fixed', inset: '52px 0 0 0', background: 'rgba(45,30,20,0.42)', zIndex: 35 }}
      />
    )}

    <MainContent dark={dark} mainRef={mainRef} />

    <OutlineWrapper onScrollTo={scrollTo} onScrollTop={scrollTop} />
  </div>
  ```

  改為：

  ```tsx
  <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
    <Sidebar
      onOpenDemo={openDemo}
      onOpenFile={openFile}
      onNewDoc={handleNewDoc}
      dragFileId={dragFileId}
    />

    {/* Mobile drawer backdrop */}
    {isMobile && drawerOpen && (
      <div
        onClick={() => setDrawerOpen(false)}
        style={{ position: 'fixed', inset: '52px 0 0 0', background: 'rgba(45,30,20,0.42)', zIndex: 35 }}
      />
    )}

    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <TabBar onSwitchTab={openFile} onCloseTab={handleCloseTab} />
      <MainContent dark={dark} mainRef={mainRef} />
    </div>

    <OutlineWrapper onScrollTo={scrollTo} onScrollTop={scrollTop} />
  </div>
  ```

- [ ] **Step 7：修正 Sidebar — 移除 deleteFile 後多餘的 setActiveFileId(null)**

  在 `src/components/docreader/Sidebar.tsx` 找到：

  ```tsx
  onClick={(e) => {
    e.stopPropagation()
    const wasActive = deleteFile(file.id)
    if (wasActive) setActiveFileId(null)
  }}
  ```

  改為：

  ```tsx
  onClick={(e) => {
    e.stopPropagation()
    deleteFile(file.id)
  }}
  ```

  > `deleteFile` 現在已自行計算正確的 `activeFileId`（切換到相鄰分頁），不再需要外部呼叫 `setActiveFileId(null)`。

  同時，移除 `Sidebar.tsx` 對 `setActiveFileId` 的 import（若不再使用）。找到：

  ```ts
  const { toggleCat, setConfirmCatId, setRenamingCatId, renameCategory, deleteFile, setActiveFileId, renamingCatId } = useDocReaderStore()
  ```

  改為：

  ```ts
  const { toggleCat, setConfirmCatId, setRenamingCatId, renameCategory, deleteFile, renamingCatId } = useDocReaderStore()
  ```

- [ ] **Step 8：型別檢查**

  ```bash
  npx tsc --noEmit
  ```

  Expected：無錯誤輸出。

- [ ] **Step 9：視覺驗證**

  ```bash
  npm run dev
  ```

  依序確認：
  1. 匯入一份文件 → 分頁列出現，顯示該檔案名稱
  2. 匯入第二份文件 → 分頁列出現兩個 tab
  3. 捲動到文件中段 → 點擊另一個 tab → 切換成功，捲動位置為 0（新文件）
  4. 切換回第一個 tab → scroll 回到剛才的位置
  5. Hover inactive tab → × 按鈕出現；active tab → × 固定可見
  6. 點 × 關閉 tab → 切換到相鄰 tab，scroll 還原
  7. Reload 頁面 → 分頁與捲動位置都還原
  8. 從 sidebar 刪除文件 → 對應 tab 消失，自動切換到相鄰 tab
  9. 所有 tab 關閉後 → 顯示 Demo 頁

- [ ] **Step 10：Commit**

  ```bash
  git add src/components/docreader/DocReader.tsx src/components/docreader/Sidebar.tsx
  git commit -m "feat(tabs): 接線 TabBar、捲動存取與版面調整"
  ```
