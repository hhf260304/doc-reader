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
      const parentNode = nodeMap.get(cat.parentId)
      if (parentNode) {
        parentNode.children.push(node)
      } else {
        roots.push(node)
      }
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
