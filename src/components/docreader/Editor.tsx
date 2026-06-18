'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useDocReaderStore, uid } from '@/store/docreader'
import { parseMarkdown, attachCopyHandlers, DEMO_MD } from '@/lib/markdown'

interface EditorProps {
  dark: boolean
  onSaved: (content: string, name: string, fileId: string) => void
  onCancelled: () => void
}

type FmtBtn = { label: string; title: string; action: () => void }

function surround(ta: HTMLTextAreaElement, pre: string, post: string, placeholder: string) {
  const s = ta.selectionStart, e = ta.selectionEnd
  let sel = ta.value.slice(s, e) || placeholder
  ta.setRangeText(pre + sel + post, s, e, 'end')
  ta.selectionStart = s + pre.length
  ta.selectionEnd = s + pre.length + sel.length
  ta.focus()
}

function linePrefix(ta: HTMLTextAreaElement, makePrefix: (i: number) => string) {
  const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd
  const ls = v.lastIndexOf('\n', s - 1) + 1
  let le = v.indexOf('\n', e)
  if (le === -1) le = v.length
  const block = v.slice(ls, le)
  const out = block.split('\n').map((l, i) => makePrefix(i) + l).join('\n')
  ta.setRangeText(out, ls, le, 'end')
  ta.selectionStart = ls
  ta.selectionEnd = ls + out.length
  ta.focus()
}

function insertBlock(ta: HTMLTextAreaElement, text: string) {
  const s = ta.selectionStart, e = ta.selectionEnd
  const before = ta.value.slice(0, s)
  const needNl = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
  ta.setRangeText(needNl + text, s, e, 'end')
  ta.focus()
}

export function Editor({ dark, onSaved, onCancelled }: EditorProps) {
  const { activeFileId, files, setEditing } = useDocReaderStore()
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fnRef = useRef<HTMLInputElement>(null)
  const pvRef = useRef<HTMLDivElement>(null)
  const pvTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showPreviewRef = useRef(false)

  const updatePreview = useCallback(() => {
    if (pvTimerRef.current) clearTimeout(pvTimerRef.current)
    pvTimerRef.current = setTimeout(() => {
      if (!pvRef.current || !taRef.current) return
      const html = parseMarkdown(taRef.current.value, dark)
      pvRef.current.innerHTML = html
      attachCopyHandlers(pvRef.current)
    }, 180)
  }, [dark])

  useEffect(() => {
    const ta = taRef.current, fn = fnRef.current
    if (!ta || !fn) return
    const id = activeFileId
    let content = '', name = ''
    if (id) {
      const f = files.find((x) => x.id === id)
      content = f?.content ?? ''; name = f?.name ?? ''
    } else {
      content = DEMO_MD; name = '安裝與設定.md'
    }
    ta.value = content
    fn.value = name
    ta.focus()
    ta.setSelectionRange(ta.value.length, ta.value.length)
    updatePreview()
  }, []) // run once on mount

  // Re-highlight when theme changes
  useEffect(() => { updatePreview() }, [dark, updatePreview])

  const save = useCallback(() => {
    const ta = taRef.current, fn = fnRef.current
    const content = ta?.value ?? ''
    let name = fn?.value.trim() ?? ''
    if (!name) name = '未命名.md'
    if (!/\.(md|markdown|txt)$/i.test(name)) name += '.md'

    const st = useDocReaderStore.getState()
    const id = st.activeFileId

    if (id) {
      st.updateFile(id, { content, name })
      setEditing(false)
      onSaved(content, name, id)
    } else {
      const newId = uid()
      // ensure uncat is open
      const cats = st.cats.map((c) => c.id === 'uncat' ? { ...c, open: true } : c)
      useDocReaderStore.setState({ cats })
      st.addFile({ id: newId, name, content, catId: 'uncat' })
      setEditing(false)
      onSaved(content, name, newId)
    }
  }, [onSaved, setEditing])

  const cancel = useCallback(() => {
    setEditing(false)
    onCancelled()
  }, [onCancelled, setEditing])

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); surround(ta, '**', '**', '粗體文字'); updatePreview(); return }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); surround(ta, '*', '*', '斜體文字'); updatePreview(); return }
    if (e.key === 'Tab') {
      e.preventDefault()
      const s = ta.selectionStart, en = ta.selectionEnd
      ta.setRangeText('  ', s, en, 'end')
      ta.selectionStart = ta.selectionEnd = s + 2
    }
  }, [save, updatePreview])

  const btnStyle: React.CSSProperties = {
    flexShrink: 0, height: 30, minWidth: 30, padding: '0 8px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--muted)', cursor: 'pointer',
  }

  const fmtBtns: FmtBtn[] = [
    { label: 'H1', title: '標題 1', action: () => { taRef.current && linePrefix(taRef.current, () => '# '); updatePreview() } },
    { label: 'H2', title: '標題 2', action: () => { taRef.current && linePrefix(taRef.current, () => '## '); updatePreview() } },
    { label: 'H3', title: '標題 3', action: () => { taRef.current && linePrefix(taRef.current, () => '### '); updatePreview() } },
  ]

  return (
    <div id="dr-editor" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--paper)', zIndex: 10 }}>
      {/* Top bar */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '11px 20px', borderBottom: '1px solid var(--border)', background: 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          <input
            ref={fnRef}
            placeholder="檔名.md"
            style={{ width: 240, maxWidth: '42vw', height: 32, padding: '0 11px', background: 'var(--sidebar-bg)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--ink)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, outline: 'none' }}
            className="dr-fname-input"
          />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} />
            編輯模式
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <button
            onClick={() => {
              showPreviewRef.current = !showPreviewRef.current
              const pane = document.getElementById('dr-pane-preview')
              const edit = document.getElementById('dr-pane-edit')
              if (pane) pane.style.display = showPreviewRef.current ? 'block' : 'none'
              if (edit) edit.style.display = showPreviewRef.current ? 'none' : 'flex'
              if (showPreviewRef.current) updatePreview()
            }}
            id="dr-pv-toggle"
            style={{ display: 'none', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
            預覽
          </button>
          <button onClick={cancel} style={{ height: 34, padding: '0 15px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--ink)', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>取消</button>
          <button onClick={save} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 16px', background: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 8, color: '#fff', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
            儲存
          </button>
        </div>
      </div>

      {/* Format toolbar */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 20px', borderBottom: '1px solid var(--border)', background: 'var(--sidebar-bg)', overflowX: 'auto' }}>
        {fmtBtns.map(({ label, title, action }) => (
          <button key={label} onClick={action} title={title} style={{ ...btnStyle, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 600 }}>{label}</button>
        ))}
        <span style={{ flexShrink: 0, width: 1, height: 18, background: 'var(--border)', margin: '0 3px' }} />
        <button onClick={() => { taRef.current && surround(taRef.current, '**', '**', '粗體文字'); updatePreview() }} title="粗體 (Ctrl+B)" style={{ ...btnStyle, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 14, fontWeight: 700 }}>B</button>
        <button onClick={() => { taRef.current && surround(taRef.current, '*', '*', '斜體文字'); updatePreview() }} title="斜體 (Ctrl+I)" style={{ ...btnStyle, fontFamily: "'Newsreader',serif", fontSize: 15, fontStyle: 'italic', fontWeight: 600 }}>I</button>
        <button onClick={() => { taRef.current && surround(taRef.current, '`', '`', 'code'); updatePreview() }} title="行內程式碼" style={{ ...btnStyle, fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>&lt;/&gt;</button>
        <button onClick={() => { taRef.current && surround(taRef.current, '[', '](https://)', '連結文字'); updatePreview() }} title="連結" style={btnStyle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        </button>
        <span style={{ flexShrink: 0, width: 1, height: 18, background: 'var(--border)', margin: '0 3px' }} />
        <button onClick={() => { taRef.current && linePrefix(taRef.current, () => '> '); updatePreview() }} title="引用" style={btnStyle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" /></svg>
        </button>
        <button onClick={() => { taRef.current && linePrefix(taRef.current, () => '- '); updatePreview() }} title="項目清單" style={btnStyle}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
        </button>
        <button onClick={() => { taRef.current && linePrefix(taRef.current, (i) => `${i + 1}. `); updatePreview() }} title="數字清單" style={{ ...btnStyle, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 500, minWidth: 34, padding: '0 9px' }}>1.</button>
        <button onClick={() => { taRef.current && insertBlock(taRef.current, '```js\n\n```\n'); updatePreview() }} title="程式碼區塊" style={{ ...btnStyle, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, minWidth: 34, padding: '0 9px' }}>```</button>
      </div>

      {/* Split panes */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div id="dr-pane-edit" style={{ flex: 1, minWidth: 0, display: 'flex', borderRight: '1px solid var(--border)' }}>
          <textarea
            ref={taRef}
            spellCheck={false}
            placeholder="# 從這裡開始撰寫 Markdown…"
            onInput={updatePreview}
            onKeyDown={handleKey}
            style={{ flex: 1, width: '100%', border: 'none', outline: 'none', resize: 'none', padding: '30px 34px', background: 'var(--paper)', color: 'var(--ink)', fontFamily: "'JetBrains Mono',monospace", fontSize: 14.5, lineHeight: 1.78, tabSize: 2, overflowY: 'auto' }}
          />
        </div>
        <div id="dr-pane-preview" style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: 'var(--paper)', display: 'block' }}>
          <div ref={pvRef} id="dr-edit-preview" style={{ maxWidth: 680, margin: '0 auto', padding: '32px 44px 90px', fontFamily: "'Newsreader',serif" }} />
        </div>
      </div>
    </div>
  )
}
