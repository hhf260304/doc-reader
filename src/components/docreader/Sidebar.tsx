'use client'

import { useRef, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
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
import { buildTree, getDepth, getSubtreeMaxDepth, getDescendants, type CategoryNode } from '@/lib/tree'

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
        transform: CSS.Translate.toString(transform),
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
  node: CategoryNode
  depth: number
  activeFileId: string | null
  onOpenFile: (id: string) => void
  dropTargetId: string | null
  dropIntent: 'nest' | 'reorder-above' | 'reorder-below' | null
}

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
  const { cats, files, activeFileId, addingCategory, setAddingCategory, addCategory,
          reorderCats, reorderFiles, moveFile, nestCategory } = useDocReaderStore()
  const newCatRef = useRef<HTMLInputElement>(null)
  const [dragActiveId, setDragActiveId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dropIntent, setDropIntent] = useState<'nest' | 'reorder-above' | 'reorder-below' | null>(null)
  const pointerRef = useRef({ x: 0, y: 0 })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDragActiveId(String(active.id))
  }

  const handleDragMove = ({ over }: DragMoveEvent) => {
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

  const handleDragCancel = () => {
    setDragActiveId(null)
    setDropTargetId(null)
    setDropIntent(null)
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

  return (
    <aside
      id="dr-sidebar"
      onPointerMove={(e) => { pointerRef.current = { x: e.clientX, y: e.clientY } }}
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
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
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
