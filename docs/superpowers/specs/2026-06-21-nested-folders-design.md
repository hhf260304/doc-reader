# 巢狀資料夾設計文件

**日期：** 2026-06-21  
**狀態：** 已確認，待實作

---

## 需求摘要

使用者可以把資料夾（Category）拖移進另一個資料夾，形成最多三層的巢狀結構。例如把 CEC-SCM 資料夾拖進 PROJECT 資料夾裡。

### 約束條件

- 最多 **3 層**資料夾巢狀（根層 = 第 1 層）
- 拖移手勢：**中心放進去，邊緣排序**
- 刪除含子資料夾的父資料夾：**遞迴刪除**所有子資料夾與其檔案（附確認對話框）

---

## 一、資料模型

### Category 介面變動

```ts
export interface Category {
  id: string
  name: string
  deletable: boolean
  open: boolean
  parentId?: string | null   // 新增；null / undefined = 根層級
}
```

`cats` 陣列維持**平面結構**，不改為巢狀物件。`DocFile.catId` 不變，仍指向直屬的 Category。

### 相容性

既有 localStorage 中的 Category 沒有 `parentId`，`undefined` 直接視為根層，無需資料 migration。

### 深度計算 helpers

```ts
// 計算指定 category 在樹中的深度（根 = 1）
function getDepth(cats: Category[], id: string): number

// 計算以 id 為根的子樹最大深度
function getSubtreeMaxDepth(cats: Category[], id: string): number

// 取得所有後代 category ID（遞迴）
function getDescendants(cats: Category[], id: string): string[]
```

**深度驗證規則：** `getDepth(parent) + getSubtreeMaxDepth(dragged) ≤ 3`

---

## 二、Store 變動

### 新增 action

```ts
nestCategory(id: string, parentId: string | null): void
```

- 設定目標 category 的 `parentId`
- 執行深度驗證；超過 3 層則 no-op
- `parentId = null` 代表移回根層（取代 unnestCategory）

### 修改 action

**`deleteCategory(id)`**

1. 呼叫 `getDescendants(cats, id)` 取得所有後代 ID
2. 將後代 + 自身從 `cats` 刪除
3. 將所有屬於這些 category 的 `files` 一併刪除

**`reorderCats(activeId, overId)`**

加上同層守衛：兩者 `parentId` 不同時直接 no-op（跨層移動走 `nestCategory`）。

### DeleteCatDialog 調整

確認訊息改為：「將連同 N 個子資料夾、M 個檔案一起刪除，此操作無法復原。」

---

## 三、渲染

### buildTree helper

```ts
interface CategoryNode {
  cat: Category
  children: CategoryNode[]   // 子資料夾
  files: DocFile[]           // 直屬檔案
}

function buildTree(cats: Category[], files: DocFile[]): CategoryNode[]
```

建議放在 `src/lib/tree.ts`。

### CategoryRow 遞迴渲染

新增 `depth` prop（根 = 0），子資料夾透過 `paddingLeft: depth * 14` 縮排：

```
▼ PROJECT                      ← depth 0
  ▼ CEC-SCM                    ← depth 1，paddingLeft 14px
      📄 01_Java11.md
  ▼ 前端                        ← depth 1
      ▼ React                  ← depth 2，paddingLeft 28px
          📄 hooks.md
▼ 未分類                        ← depth 0
    📄 筆記.md
```

**深度守衛 UI：** 拖移時若目標資料夾會造成超過三層，不顯示「放進去」的 amber 高亮，自動降為排序模式。

---

## 四、拖移手勢

### 意圖偵測

在 `onDragMove` 中取得滑鼠座標與 over 元素的 bounding rect，依位置判斷意圖：

```
pointer.y < rect.top + rect.height * 0.25    → reorder（插入上方）
pointer.y > rect.bottom - rect.height * 0.25  → reorder（插入下方）
否則                                           → nest（放進去）
```

### 狀態追蹤

在 `Sidebar` 新增：

```ts
const [dropIntent, setDropIntent] = useState<'nest' | 'reorder' | null>(null)
const [dropTargetId, setDropTargetId] = useState<string | null>(null)
```

於 `onDragMove` 即時更新，供視覺反饋與 `onDragEnd` 決策使用。

### 視覺反饋

| 狀態 | 顯示 |
|------|------|
| reorder 上方 | 目標 row 上緣顯示 2px amber 橫線 |
| reorder 下方 | 目標 row 下緣顯示 2px amber 橫線 |
| nest | 目標 row 加 amber 框線 + 淡 amber 背景 |
| 超過深度上限 | 不顯示 nest 反饋，自動降為 reorder |

### onDragEnd 邏輯

```
if (intent === 'nest' && isCat(activeId) && isCat(overId)):
  nestCategory(activeId, overId)
else if (intent === 'reorder' && isCat(activeId) && isCat(overId)):
  reorderCats(activeId, overId)
else if (isFile(activeId)):
  // 現有檔案拖移邏輯不變
```

### 已展開資料夾的處理

若目標資料夾已展開，「放進去」等同於插入子列表末端。

---

## 五、不可巢狀的資料夾

`deletable: false` 的資料夾（目前只有「未分類」）**不能**被拖移進其他資料夾，也不能作為其他資料夾的巢狀目標（維持根層固定）。拖移守衛需排除這類 category。

---

## 六、範圍外（不在本次實作）

- 搜尋結果跨資料夾展開（保持現狀）
- 拖移時懸停自動展開目標資料夾
- 鍵盤無障礙巢狀操作
