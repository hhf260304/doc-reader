import type { CSSProperties } from 'react'

export const LIGHT_VARS: CSSProperties = {
  '--paper': '#FAF8F4',
  '--sidebar-bg': '#EDE8DF',
  '--brown': '#3D2B1F',
  '--ink': '#2D1E14',
  '--amber': '#D4A96A',
  '--amber-soft': '#F4E7D3',
  '--muted': '#7A6A5A',
  '--code-bg': '#EDE8DF',
  '--code-ink': '#92400E',
  '--border': '#E2DACE',
  '--info-bg': '#E8F0F8',
  '--info-ink': '#1A4A6B',
  '--warn-bg': '#FEF3DC',
  '--warn-ink': '#7A4F1A',
  '--ok-bg': '#EAF3DE',
  '--ok-ink': '#27500A',
  '--danger': '#B3261E',
} as CSSProperties

export const DARK_VARS: CSSProperties = {
  '--paper': '#221C16',
  '--sidebar-bg': '#1B1611',
  '--brown': '#F2E8DA',
  '--ink': '#E7DCCD',
  '--amber': '#D4A96A',
  '--amber-soft': '#3A2C1A',
  '--muted': '#A18E7B',
  '--code-bg': '#2A2118',
  '--code-ink': '#E0A86A',
  '--border': '#372C21',
  '--info-bg': '#16303F',
  '--info-ink': '#A9D2EC',
  '--warn-bg': '#3A2C12',
  '--warn-ink': '#E8C481',
  '--ok-bg': '#21300F',
  '--ok-ink': '#B6D98C',
  '--danger': '#B3261E',
} as CSSProperties

export const DEMO_HEADINGS = [
  { id: 'sec-intro', text: '簡介', level: 1 },
  { id: 'sec-prereq', text: '前置需求', level: 2 },
  { id: 'sec-install', text: '安裝步驟', level: 2 },
  { id: 'sec-step1', text: '步驟一：npm 安裝', level: 3 },
  { id: 'sec-step2', text: '步驟二：初始化設定', level: 3 },
  { id: 'sec-step3', text: '步驟三：執行專案', level: 3 },
  { id: 'sec-config', text: '設定選項', level: 2 },
  { id: 'sec-next', text: '下一步', level: 2 },
]
