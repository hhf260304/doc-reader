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
