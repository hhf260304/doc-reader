'use client'

interface NavbarProps {
  dark: boolean
  onToggleTheme: () => void
  onToggleSidebar: () => void
}

export function Navbar({ dark, onToggleTheme, onToggleSidebar }: NavbarProps) {
  return (
    <header style={{
      height: 52, flex: '0 0 52px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 20, padding: '0 18px',
      background: 'var(--paper)', borderBottom: '1px solid var(--border)', zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <button
          onClick={onToggleSidebar}
          aria-label="切換側邊欄"
          className="dr-icon-btn"
          style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D2B1F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H17l3 3v13.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5z" fill="#D4A96A" fillOpacity="0.28" />
            <path d="M8 8.5h7M8 12h7M8 15.5h4" />
          </svg>
          <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 19, fontWeight: 600, color: 'var(--brown)', letterSpacing: '-0.01em' }}>DocReader</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onToggleTheme}
          id="dr-theme"
          aria-label="切換主題"
          className="dr-icon-btn"
          style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer' }}
        >
          {dark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
              <line x1="4.9" y1="4.9" x2="7" y2="7" /><line x1="17" y1="17" x2="19.1" y2="19.1" />
              <line x1="4.9" y1="19.1" x2="7" y2="17" /><line x1="17" y1="7" x2="19.1" y2="4.9" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        <a href="#" aria-label="GitHub" className="dr-icon-btn" style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="12" r="3" />
            <path d="M6 9v6" /><path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
        </a>
      </div>
    </header>
  )
}
