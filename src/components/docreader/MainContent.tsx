'use client'

import { useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useDocReaderStore, uid } from '@/store/docreader'
import { parseMarkdown, attachCopyHandlers, extractHeadings } from '@/lib/markdown'
import { DEMO_HEADINGS } from './constants'
import { Editor } from './Editor'

interface MainContentProps {
  dark: boolean
  mainRef: React.RefObject<HTMLElement | null>
}

/* ---- Demo content (static HTML matching original design) ---- */
function DemoContent() {
  const codeRef1 = useRef<HTMLDivElement>(null)
  const codeRef2 = useRef<HTMLDivElement>(null)
  const codeRef3 = useRef<HTMLDivElement>(null)

  const attachCopy = (el: HTMLElement | null, code: string) => {
    if (!el) return
    const btn = el.querySelector<HTMLButtonElement>('.dr-copy-btn')
    if (!btn || btn.dataset.wired) return
    btn.dataset.wired = '1'
    btn.addEventListener('click', () => {
      if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {})
      btn.textContent = '✓ 已複製'; btn.style.color = 'var(--ok-ink)'; btn.style.borderColor = 'var(--ok-ink)'
      setTimeout(() => { btn.textContent = '複製'; btn.style.color = ''; btn.style.borderColor = '' }, 1800)
    })
  }
  useEffect(() => {
    attachCopy(codeRef1.current, 'npm install -g docreader')
    attachCopy(codeRef2.current, `module.exports = {\n  title: 'My Docs',\n  theme: 'warm',\n  basePath: '/docs',\n  port: 3000,\n  search: true,\n}`)
    attachCopy(codeRef3.current, 'docreader serve --open')
  }, [])

  const CodeBlock = ({ lang, code, ref: blockRef }: { lang: string; code: string; ref: React.RefObject<HTMLDivElement | null> }) => (
    <div ref={blockRef} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'rgba(122,106,90,0.08)', borderBottom: '1px solid var(--border)', fontFamily: "'IBM Plex Sans',sans-serif" }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>{lang}</span>
        <button className="dr-copy-btn" data-label="複製" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--muted)', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12, cursor: 'pointer' }}>複製</button>
      </div>
      <pre style={{ margin: 0, padding: 16, background: 'var(--code-bg)', overflowX: 'auto' }}><code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, lineHeight: 1.6, color: 'var(--code-ink)' }}>{code}</code></pre>
    </div>
  )

  const InfoBox = ({ type, children }: { type: 'info' | 'warn' | 'ok'; children: React.ReactNode }) => {
    const map = {
      info: { bg: 'var(--info-bg)', ink: 'var(--info-ink)', border: 'rgba(26,74,107,0.15)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg> },
      warn: { bg: 'var(--warn-bg)', ink: 'var(--warn-ink)', border: 'rgba(122,79,26,0.16)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
      ok: { bg: 'var(--ok-bg)', ink: 'var(--ok-ink)', border: 'rgba(39,80,10,0.15)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    }
    const { bg, ink, border, icon } = map[type]
    return (
      <div style={{ display: 'flex', gap: 14, padding: '14px 18px', background: bg, border: `1px solid ${border}`, borderRadius: 10, color: ink, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 14.5, lineHeight: 1.7 }}>
        {icon}
        <div>{children}</div>
      </div>
    )
  }

  const StepH3 = ({ num, children }: { num: number; children: React.ReactNode }) => (
    <h3 id={`sec-step${num}`} style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '32px 0 14px', fontFamily: "'Newsreader',serif", fontSize: 19, fontWeight: 600, color: 'var(--brown)', scrollMarginTop: 24 }}>
      <span style={{ flexShrink: 0, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--amber)', color: '#fff', borderRadius: '50%', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 600 }}>{num}</span>
      {children}
    </h3>
  )

  const ic = (name: string) => <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, padding: '1px 6px', background: 'var(--code-bg)', borderRadius: 5, color: 'var(--code-ink)' }}>{name}</code>

  return (
    <div id="dr-demo">
      <div id="sec-intro">
        <h1 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontSize: 36, fontWeight: 600, lineHeight: 1.18, color: 'var(--brown)', letterSpacing: '-0.015em', scrollMarginTop: 24 }}>安裝與設定</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12.5, color: 'var(--muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>最後更新於 2026 年 6 月 12 日
          </span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>閱讀時間約 5 分鐘</span>
        </div>
        <p style={{ margin: '26px 0 0', fontSize: 18, lineHeight: 1.85, color: 'var(--ink)' }}>DocReader 是一套專為開發者與技術團隊打造的 Markdown 文件瀏覽器。本章節將帶你完成從安裝到啟動的完整流程，只需要幾分鐘，就能在本機跑起第一份文件站台。</p>
      </div>

      <h2 id="sec-prereq" style={{ margin: '48px 0 16px', fontFamily: "'Newsreader',serif", fontSize: 25, fontWeight: 600, color: 'var(--brown)', scrollMarginTop: 24 }}>前置需求</h2>
      <InfoBox type="info">
        <strong style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>在開始之前</strong>
        請確認系統已安裝以下工具：
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <li><strong>Node.js 18.0</strong> 或更新版本（建議使用 LTS）</li>
          <li><strong>npm 9</strong>、<strong>pnpm 8</strong> 或 <strong>yarn 1.22</strong> 任一套件管理器</li>
          <li>熟悉終端機與基本的命令列操作</li>
        </ul>
      </InfoBox>

      <h2 id="sec-install" style={{ margin: '48px 0 6px', fontFamily: "'Newsreader',serif", fontSize: 25, fontWeight: 600, color: 'var(--brown)', scrollMarginTop: 24 }}>安裝步驟</h2>
      <p style={{ margin: '0 0 8px', fontSize: 17, lineHeight: 1.8, color: 'var(--ink)' }}>依序執行下列三個步驟，即可完成安裝並啟動本機預覽伺服器。</p>

      <StepH3 num={1}>使用 npm 安裝</StepH3>
      <p style={{ margin: '0 0 14px', fontSize: 17, lineHeight: 1.8, color: 'var(--ink)' }}>透過套件管理器將 DocReader 安裝為全域指令工具：</p>
      <CodeBlock lang="bash" code="npm install -g docreader" ref={codeRef1} />

      <StepH3 num={2}>初始化設定</StepH3>
      <p style={{ margin: '0 0 14px', fontSize: 17, lineHeight: 1.8, color: 'var(--ink)' }}>在專案根目錄建立 {ic('docreader.config.js')}，填入基本設定：</p>
      <CodeBlock lang="js" code={`module.exports = {\n  title: 'My Docs',\n  theme: 'warm',\n  basePath: '/docs',\n  port: 3000,\n  search: true,\n}`} ref={codeRef2} />

      <StepH3 num={3}>執行專案</StepH3>
      <p style={{ margin: '0 0 14px', fontSize: 17, lineHeight: 1.8, color: 'var(--ink)' }}>啟動本機預覽伺服器，並自動於瀏覽器開啟：</p>
      <CodeBlock lang="bash" code="docreader serve --open" ref={codeRef3} />
      <div style={{ marginTop: 16 }}>
        <InfoBox type="ok"><strong style={{ fontWeight: 600 }}>完成！</strong> 伺服器啟動後，瀏覽器將自動開啟 {ic('http://localhost:3000')}，即可看到你的文件站台。</InfoBox>
      </div>

      <h2 id="sec-config" style={{ margin: '48px 0 8px', fontFamily: "'Newsreader',serif", fontSize: 25, fontWeight: 600, color: 'var(--brown)', scrollMarginTop: 24 }}>設定選項</h2>
      <p style={{ margin: '0 0 18px', fontSize: 17, lineHeight: 1.8, color: 'var(--ink)' }}>下表列出 {ic('docreader.config.js')} 支援的主要設定欄位：</p>
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: 'var(--sidebar-bg)', textAlign: 'left' }}>
              {['參數名稱', '型別', '預設值', '說明'].map((h) => <th key={h} style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--brown)', borderBottom: '1px solid var(--border)' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody style={{ color: 'var(--ink)' }}>
            {[
              [ic('title'), ic('string'), ic("'DocReader'"), '文件網站標題，顯示於分頁與頁首'],
              [ic('theme'), <span key="t" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: 'var(--code-ink)' }}>&apos;warm&apos; | &apos;dark&apos;</span>, ic("'warm'"), '介面主題色系'],
              [ic('basePath'), ic('string'), ic("'/'"), '文件部署的根路徑'],
              [ic('port'), ic('number'), ic('3000'), '本機預覽伺服器埠號'],
              [ic('search'), ic('boolean'), ic('true'), '是否啟用全文搜尋功能'],
            ].map((row, i, arr) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: '11px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', color: j > 0 ? 'var(--muted)' : 'var(--ink)' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 20 }}>
        <InfoBox type="warn"><strong style={{ fontWeight: 600 }}>注意：</strong>修改 {ic('port')} 後需重新啟動伺服器才會生效。若埠號已被占用，DocReader 會自動改用下一個可用的埠號。</InfoBox>
      </div>

      <h2 id="sec-next" style={{ margin: '48px 0 16px', fontFamily: "'Newsreader',serif", fontSize: 25, fontWeight: 600, color: 'var(--brown)', scrollMarginTop: 24 }}>下一步</h2>
      <div style={{ display: 'flex', gap: 16 }}>
        {[{ dir: '← 上一頁', label: '第一個專案', align: 'left' }, { dir: '下一頁 →', label: '常見問題', align: 'right' }].map(({ dir, label, align }) => (
          <a key={label} href="#" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, alignItems: align === 'right' ? 'flex-end' : 'flex-start', textAlign: align === 'right' ? 'right' : 'left', padding: '16px 18px', border: '1px solid var(--border)', borderRadius: 12, textDecoration: 'none', background: 'var(--paper)' }}>
            <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12, color: 'var(--muted)' }}>{dir}</span>
            <span style={{ fontFamily: "'Newsreader',serif", fontSize: 17, fontWeight: 600, color: 'var(--brown)' }}>{label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

export function MainContent({ dark, mainRef }: MainContentProps) {
  const { activeFileId, files, editing, setEditing, setHeadings, setActiveHeadingId } = useDocReaderStore()
  const renderedRef = useRef<HTMLDivElement>(null)
  const activeFile = files.find((f) => f.id === activeFileId)

  // Render markdown for file view
  useEffect(() => {
    if (activeFileId === null || !renderedRef.current) return
    const content = activeFile?.content ?? ''
    const html = parseMarkdown(content, dark)
    renderedRef.current.innerHTML = html
    attachCopyHandlers(renderedRef.current)
    const hs = extractHeadings(renderedRef.current)
    setHeadings(hs)
    setActiveHeadingId(hs[0]?.id ?? null)
  }, [activeFileId, activeFile?.content, dark])

  // Set demo headings
  useEffect(() => {
    if (activeFileId === null && !editing) {
      setHeadings(DEMO_HEADINGS)
      setActiveHeadingId(DEMO_HEADINGS[0]?.id ?? null)
    }
  }, [activeFileId, editing])

  const handleSaved = useCallback((content: string, name: string, fileId: string) => {
    const html = parseMarkdown(content, dark)
    if (renderedRef.current) {
      renderedRef.current.innerHTML = html
      attachCopyHandlers(renderedRef.current)
      const hs = extractHeadings(renderedRef.current)
      setHeadings(hs)
      setActiveHeadingId(hs[0]?.id ?? null)
    }
    mainRef.current?.scrollTo({ top: 0 })
  }, [dark, mainRef, setHeadings, setActiveHeadingId])

  const handleCancelled = useCallback(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [mainRef])

  const filename = activeFile?.name?.replace(/\.(md|markdown|txt)$/i, '') ?? '安裝與設定'

  return (
    <main
      ref={mainRef as React.RefObject<HTMLElement>}
      id="dr-main"
      style={{ flex: 1, overflowY: 'auto', minWidth: 0, position: 'relative' }}
    >
      {/* Reading view */}
      <div
        id="dr-content"
        style={{ maxWidth: 720, margin: '0 auto', padding: '48px 56px 120px', fontFamily: "'Newsreader',serif", display: editing ? 'none' : 'block' }}
      >
        {/* Edit button */}
        {!editing && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button
              id="dr-edit-btn"
              onClick={() => setEditing(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', background: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 8, color: '#fff', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              編輯
            </button>
          </div>
        )}

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, marginBottom: 8 }}>
          <a href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }}>首頁</a>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--brown)', fontWeight: 500 }}>{filename}</span>
        </div>

        {/* Content */}
        {activeFileId === null ? (
          <DemoContent />
        ) : (
          <div ref={renderedRef} id="dr-rendered" className="dr-rendered" />
        )}
      </div>

      {/* Editor overlay */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Editor dark={dark} onSaved={handleSaved} onCancelled={handleCancelled} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop overlay */}
      <div id="dr-drop" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'none', alignItems: 'center', justifyContent: 'center', background: 'rgba(250,248,244,0.86)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '44px 60px', border: '2px dashed var(--amber)', borderRadius: 18, background: 'var(--paper)', boxShadow: '0 16px 40px rgba(45,30,20,0.16)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: 22, fontWeight: 600, color: 'var(--brown)' }}>放開以匯入 Markdown</div>
          <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, color: 'var(--muted)' }}>支援 .md / .markdown / .txt</div>
        </div>
      </div>
    </main>
  )
}
