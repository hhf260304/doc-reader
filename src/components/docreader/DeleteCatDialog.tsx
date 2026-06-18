'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useDocReaderStore } from '@/store/docreader'

export function DeleteCatDialog() {
  const { confirmCatId, cats, setConfirmCatId, deleteCategory } = useDocReaderStore()
  const cat = confirmCatId ? cats.find((c) => c.id === confirmCatId) : null

  return (
    <AnimatePresence>
      {cat && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setConfirmCatId(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(45,30,20,0.46)' }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 392, maxWidth: '100%', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 24px 60px rgba(45,30,20,0.32)', padding: 24 }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, background: 'rgba(179,38,30,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontSize: 19, fontWeight: 600, color: 'var(--brown)' }}>刪除分類</h3>
                <p style={{ margin: '8px 0 0', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13.5, lineHeight: 1.6, color: 'var(--muted)' }}>
                  確定要刪除「<strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{cat.name}</strong>」嗎？此分類中的文件會移至「未分類」，分類本身將被刪除。
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button
                onClick={() => setConfirmCatId(null)}
                style={{ padding: '0 16px', height: 36, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--ink)', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
              >取消</button>
              <button
                onClick={() => deleteCategory(confirmCatId!)}
                style={{ padding: '0 16px', height: 36, background: 'var(--danger)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
              >刪除分類</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
