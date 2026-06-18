export type Palette = {
  kw: string; str: string; num: string; prop: string; com: string; fn: string
}

const LIGHT: Palette = {
  kw: '#A0410A', str: '#4D7C2F', num: '#1F5C8B', prop: '#7A4F1A', com: '#A89684', fn: '#B45309',
}
const DARK: Palette = {
  kw: '#E8964A', str: '#9CCB6B', num: '#7FB5E0', prop: '#D9B074', com: '#8A7B6A', fn: '#F0B36B',
}

export const getPalette = (dark: boolean): Palette => dark ? DARK : LIGHT

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function span(t: string, c: string, italic = false) {
  return `<span style="color:${c}${italic ? ';font-style:italic' : ''}">${t}</span>`
}

export function hlJs(raw: string, P: Palette): string {
  const e = esc(raw)
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(module|exports|const|let|var|require|true|false|null|return|import|from|export|default|new|function|async|await|if|else)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*:)/g
  return e.replace(re, (_m, com, str, kw, num, prop) => {
    if (com) return span(com, P.com, true)
    if (str) return span(str, P.str)
    if (kw) return span(kw, P.kw)
    if (num) return span(num, P.num)
    if (prop) return span(prop, P.prop)
    return _m
  })
}

export function hlBash(raw: string, P: Palette): string {
  const e = esc(raw)
  const re = /(#[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(--?[A-Za-z][\w-]*)|(^|\n)([ \t]*)([A-Za-z][\w./-]*)/g
  return e.replace(re, (_m, com, str, flag, nl, ws, cmd) => {
    if (com) return span(com, P.com, true)
    if (str) return span(str, P.str)
    if (flag) return span(flag, P.kw)
    if (cmd) return (nl || '') + (ws || '') + span(cmd, P.fn)
    return _m
  })
}

const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'console', 'zsh', 'shellsession'])

export function hlCode(raw: string, lang: string, P: Palette): string {
  return SHELL_LANGS.has(lang.toLowerCase()) ? hlBash(raw, P) : hlJs(raw, P)
}
