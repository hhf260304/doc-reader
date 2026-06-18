import { marked, Renderer } from 'marked'
import { getPalette, hlCode } from './highlight'

export const DEMO_MD = `# 安裝與設定

DocReader 是一套專為開發者與技術團隊打造的 Markdown 文件瀏覽器。本章節將帶你完成從安裝到啟動的完整流程，只需要幾分鐘，就能在本機跑起第一份文件站台。開始之前，請先確認你的開發環境符合下方的前置需求。

## 前置需求

> **在開始之前** — 請確認系統已安裝以下工具：
>
> - **Node.js 18.0** 或更新版本（建議使用 LTS）
> - **npm 9**、**pnpm 8** 或 **yarn 1.22** 任一套件管理器
> - 熟悉終端機與基本的命令列操作

## 安裝步驟

依序執行下列三個步驟，即可完成安裝並啟動本機預覽伺服器。

### 步驟一：使用 npm 安裝

透過套件管理器將 DocReader 安裝為全域指令工具：

\`\`\`bash
npm install -g docreader
\`\`\`

### 步驟二：初始化設定

在專案根目錄建立 \`docreader.config.js\`，填入基本設定：

\`\`\`js
module.exports = {
  title: 'My Docs',
  theme: 'warm',
  basePath: '/docs',
  port: 3000,
  search: true,
}
\`\`\`

### 步驟三：執行專案

啟動本機預覽伺服器，並自動於瀏覽器開啟：

\`\`\`bash
docreader serve --open
\`\`\`

> **完成！** 伺服器啟動後，瀏覽器將自動開啟 \`http://localhost:3000\`，即可看到你的文件站台。

## 設定選項

下表列出 \`docreader.config.js\` 支援的主要設定欄位：

| 參數名稱 | 型別 | 預設值 | 說明 |
| --- | --- | --- | --- |
| \`title\` | \`string\` | \`'DocReader'\` | 文件網站標題，顯示於分頁與頁首 |
| \`theme\` | \`'warm' \\| 'dark'\` | \`'warm'\` | 介面主題色系 |
| \`basePath\` | \`string\` | \`'/'\` | 文件部署的根路徑 |
| \`port\` | \`number\` | \`3000\` | 本機預覽伺服器埠號 |
| \`search\` | \`boolean\` | \`true\` | 是否啟用全文搜尋功能 |

> **注意：** 修改 \`port\` 後需重新啟動伺服器才會生效。若埠號已被占用，DocReader 會自動改用下一個可用的埠號。
`

export interface Heading {
  id: string
  text: string
  level: number
}

// SVG icons for callout boxes
const INFO_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>`
const WARN_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
const OK_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`

function buildRenderer(dark: boolean) {
  const P = getPalette(dark)
  const r = new Renderer()
  let headingIndex = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r.heading = function (token: any) {
    const text = token.text as string
    const level = token.depth as number
    const id = `imp-${headingIndex++}`
    const slug = text.replace(/<[^>]+>/g, '')
    return `<h${level} id="${id}" style="scroll-margin-top:24px;">${slug}</h${level}>\n`
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r.blockquote = function (token: any) {
    const raw = token.text as string
    // Render inner content via marked
    headingIndex = headingIndex // keep counter
    const innerHtml = marked.parse(raw, { renderer: r, gfm: true }) as string

    let bg, ink, border, icon
    if (raw.includes('完成') || raw.includes('✓') || raw.includes('成功')) {
      bg = 'var(--ok-bg)'; ink = 'var(--ok-ink)'; border = 'rgba(39,80,10,0.15)'; icon = OK_ICON
    } else if (raw.includes('注意') || raw.includes('Warning') || raw.includes('⚠')) {
      bg = 'var(--warn-bg)'; ink = 'var(--warn-ink)'; border = 'rgba(122,79,26,0.16)'; icon = WARN_ICON
    } else {
      bg = 'var(--info-bg)'; ink = 'var(--info-ink)'; border = 'rgba(26,74,107,0.15)'; icon = INFO_ICON
    }

    return `<div style="display:flex;gap:14px;padding:14px 18px;background:${bg};border:1px solid ${border};border-radius:10px;color:${ink};font-family:'IBM Plex Sans',sans-serif;font-size:14.5px;line-height:1.7;margin:18px 0;">${icon}<div>${innerHtml}</div></div>\n`
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r.code = function (token: any) {
    const text = token.text as string
    const lang = ((token.lang as string) || 'code').toLowerCase()
    const highlighted = hlCode(text, lang, P)
    const escapedForAttr = text.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    return `<div data-code-block="1" data-raw="${escapedForAttr}" data-lang="${lang}" style="border:1px solid var(--border);border-radius:8px;overflow:hidden;margin:18px 0;">
<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:rgba(122,106,90,0.08);border-bottom:1px solid var(--border);font-family:'IBM Plex Sans',sans-serif;">
<span style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);">${lang}</span>
<button class="dr-copy-btn" data-label="複製" style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--muted);font-family:'IBM Plex Sans',sans-serif;font-size:12px;cursor:pointer;">複製</button>
</div>
<pre style="margin:0;padding:16px;background:var(--code-bg);overflow-x:auto;"><code style="font-family:'JetBrains Mono',monospace;font-size:14px;line-height:1.6;color:var(--code-ink);">${highlighted}</code></pre>
</div>\n`
  }

  return { renderer: r, getHeadingIndex: () => headingIndex }
}

export function parseMarkdown(text: string, dark: boolean): string {
  const { renderer } = buildRenderer(dark)
  return marked.parse(text, { renderer, gfm: true }) as string
}

export function attachCopyHandlers(container: HTMLElement) {
  const buttons = container.querySelectorAll<HTMLButtonElement>('.dr-copy-btn')
  buttons.forEach((btn) => {
    if (btn.dataset.wired) return
    btn.dataset.wired = '1'
    btn.addEventListener('click', () => {
      const block = btn.closest<HTMLElement>('[data-code-block]')
      const raw = block?.dataset.raw ?? ''
      if (navigator.clipboard) navigator.clipboard.writeText(raw).catch(() => {})
      const label = btn.getAttribute('data-label') || '複製'
      btn.textContent = '✓ 已複製'
      btn.style.color = 'var(--ok-ink)'
      btn.style.borderColor = 'var(--ok-ink)'
      const t = setTimeout(() => {
        btn.textContent = label
        btn.style.color = ''
        btn.style.borderColor = ''
      }, 1800)
      ;(btn as HTMLButtonElement & { _t?: ReturnType<typeof setTimeout> })._t = t
    })
  })
}

export function extractHeadings(container: HTMLElement): Heading[] {
  return Array.from(container.querySelectorAll<HTMLElement>('h1,h2,h3')).map((h) => ({
    id: h.id,
    text: h.textContent ?? '',
    level: parseInt(h.tagName[1]),
  }))
}
