'use client'

import { useDocReaderStore } from '@/store/docreader'
import type { Heading } from '@/lib/markdown'

interface OutlineProps {
  headings: Heading[]
  onScrollTo: (id: string) => void
  onScrollTop: () => void
}

export function Outline({ headings, onScrollTo, onScrollTop }: OutlineProps) {
  const { activeHeadingId } = useDocReaderStore()

  return (
    <aside
      id="dr-outline"
      style={{ width: 200, flex: '0 0 200px', padding: '48px 20px 0 4px', overflowY: 'auto' }}
    >
      <div>
        <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, paddingLeft: 14 }}>
          本頁目錄
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13 }}>
          {headings.map((h) => {
            const isActive = h.id === activeHeadingId
            const indent = h.level >= 3 ? 28 : 14
            const fs = h.level >= 3 ? '12.5px' : '13px'
            return (
              <a
                key={h.id}
                data-outline
                data-target={h.id}
                href="#"
                onClick={(e) => { e.preventDefault(); onScrollTo(h.id) }}
                style={{
                  padding: `6px 0 6px ${indent}px`,
                  borderLeft: `2px solid ${isActive ? 'var(--amber)' : 'transparent'}`,
                  color: isActive ? 'var(--brown)' : 'var(--muted)',
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  fontSize: fs,
                  transition: 'color .12s, border-color .12s',
                }}
              >
                {h.text}
              </a>
            )
          })}
          {headings.length === 0 && (
            <div style={{ padding: '6px 0 6px 14px', color: 'var(--muted)', fontSize: 12.5 }}>（無標題）</div>
          )}
        </nav>
        <button
          onClick={onScrollTop}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 18, marginLeft: 14, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12.5, color: 'var(--muted)' }}
          className="dr-scroll-top"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
          回到頂部
        </button>
      </div>
    </aside>
  )
}
