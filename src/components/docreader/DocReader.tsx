'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useDocReaderStore, uid } from '@/store/docreader'
import { LIGHT_VARS, DARK_VARS } from './constants'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { MainContent } from './MainContent'
import { Outline } from './Outline'
import { TabBar } from './TabBar'
import { DeleteCatDialog } from './DeleteCatDialog'
import { DEMO_HEADINGS } from './constants'

function OutlineWrapper({ onScrollTo, onScrollTop }: { onScrollTo: (id: string) => void; onScrollTop: () => void }) {
  const { headings } = useDocReaderStore()
  return <Outline headings={headings} onScrollTo={onScrollTo} onScrollTop={onScrollTop} />
}

export function DocReader() {
  const [dark, setDark] = useState(false)
  const [sbCollapsed, setSbCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const mainRef = useRef<HTMLElement | null>(null)

  const { activeFileId, files, setActiveFileId, setHeadings, setActiveHeadingId, setEditing, addFile, openTab, closeTab, setScrollPosition } = useDocReaderStore()

  const themeVars = dark ? DARK_VARS : LIGHT_VARS
  const sbWidth = isMobile ? '240px' : (sbCollapsed ? '0px' : '240px')

  // Responsive handling
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setDrawerOpen(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Cmd+K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        document.getElementById('dr-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Drag-drop file import
  useEffect(() => {
    const overlay = document.getElementById('dr-drop')
    let depth = 0

    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return
      e.preventDefault(); depth++
      if (overlay) overlay.style.display = 'flex'
    }
    const onOver = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault()
    }
    const onLeave = () => {
      depth--
      if (depth <= 0 && overlay) { overlay.style.display = 'none'; depth = 0 }
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault(); depth = 0
      if (overlay) overlay.style.display = 'none'
      const f = e.dataTransfer?.files?.[0]
      if (f) importFile(f)
    }

    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll spy
  useEffect(() => {
    const main = mainRef.current
    if (!main) return

    const update = () => {
      const links = Array.from(document.querySelectorAll<HTMLElement>('[data-outline]'))
      if (!links.length) return
      const mr = main.getBoundingClientRect()
      let current = links[0].getAttribute('data-target') ?? ''
      for (const l of links) {
        const id = l.getAttribute('data-target') ?? ''
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top - mr.top <= 150) current = id
      }
      setActiveHeadingId(current)
    }

    main.addEventListener('scroll', update, { passive: true })
    update()
    return () => main.removeEventListener('scroll', update)
  }, [setActiveHeadingId])

  // Restore scroll position when active tab changes
  useEffect(() => {
    if (activeFileId === null) return
    const pos = useDocReaderStore.getState().scrollPositions[activeFileId] ?? 0
    mainRef.current?.scrollTo({ top: pos })
  }, [activeFileId]) // eslint-disable-line react-hooks/exhaustive-deps

  const importFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const id = uid()
      const content = String(reader.result ?? '')
      addFile({ id, name: file.name, content, catId: 'uncat' })
    }
    reader.readAsText(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) importFile(f)
    e.target.value = ''
  }

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files ?? [])
    const docs = allFiles.filter((f) => /\.(md|markdown|txt)$/i.test(f.name))
    if (!docs.length) { e.target.value = ''; return }

    const rel = docs[0].webkitRelativePath || ''
    const folderName = rel.split('/')[0] || '匯入資料夾'
    const catId = 'c' + Date.now()
    const newFiles: { id: string; name: string; content: string; catId: string }[] = []
    let pending = docs.length

    docs.forEach((file, idx) => {
      const reader = new FileReader()
      reader.onload = () => {
        newFiles.push({ id: uid() + idx, name: file.name, content: String(reader.result ?? ''), catId })
        if (--pending === 0) {
          const st = useDocReaderStore.getState()
          const cats = [...st.cats, { id: catId, name: folderName, deletable: true, open: true }]
          useDocReaderStore.setState({
            cats,
            files: [...st.files, ...newFiles],
            openTabs: [...st.openTabs, ...newFiles.map((f) => f.id)],
            activeFileId: newFiles[0]?.id ?? st.activeFileId,
          })
        }
      }
      reader.readAsText(file)
    })
    e.target.value = ''
  }

  const openFile = useCallback((id: string) => {
    if (activeFileId) setScrollPosition(activeFileId, mainRef.current?.scrollTop ?? 0)
    openTab(id)
    setEditing(false)
  }, [activeFileId, setScrollPosition, openTab, setEditing])

  const handleCloseTab = useCallback((id: string) => {
    closeTab(id)
  }, [closeTab])

  const openDemo = useCallback(() => {
    if (activeFileId) setScrollPosition(activeFileId, mainRef.current?.scrollTop ?? 0)
    setActiveFileId(null)
    setEditing(false)
    setHeadings(DEMO_HEADINGS)
    setActiveHeadingId(DEMO_HEADINGS[0]?.id ?? null)
    mainRef.current?.scrollTo({ top: 0 })
  }, [activeFileId, setScrollPosition, setActiveFileId, setEditing, setHeadings, setActiveHeadingId])

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    const main = mainRef.current
    if (!el || !main) return
    const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 28
    main.scrollTo({ top, behavior: 'smooth' })
  }, [])

  const scrollTop = useCallback(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleNewDoc = useCallback(() => {
    setEditing(true)
  }, [setEditing])

  return (
    <div
      id="dr-root"
      data-sb-open={drawerOpen ? 'true' : 'false'}
      style={{
        ...themeVars,
        '--sb-w': sbWidth,
        fontFamily: "'IBM Plex Sans', sans-serif",
        background: 'var(--paper)',
        color: 'var(--ink)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        WebkitFontSmoothing: 'antialiased',
      } as React.CSSProperties}
    >
      <Navbar
        dark={dark}
        onToggleTheme={() => setDark(!dark)}
        onToggleSidebar={() => {
          if (isMobile) setDrawerOpen(!drawerOpen)
          else setSbCollapsed(!sbCollapsed)
        }}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar
          onOpenDemo={openDemo}
          onOpenFile={openFile}
          onNewDoc={handleNewDoc}
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

      {/* File inputs */}
      <input id="dr-file-input" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={handleFileInput} style={{ display: 'none' }} />
      {/* @ts-expect-error webkitdirectory is not in React types */}
      <input id="dr-folder-input" type="file" webkitdirectory="" directory="" multiple onChange={handleFolderInput} style={{ display: 'none' }} />

      <DeleteCatDialog />
    </div>
  )
}
