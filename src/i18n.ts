import type { I18n } from './types'

const translations: Record<'zh' | 'en', I18n> = {
  zh: {
    title: '汉诺塔',
    subtitle: '挑战你的智慧',
    difficulty: '难度',
    easy: '简单',
    medium: '中等',
    hard: '困难',
    master: '大师',
    time: '时间',
    moves: '步数',
    bestTime: '最佳用时',
    bestMoves: '最佳步数',
    optimalMoves: '最少步数',
    undo: '撤销',
    hint: '提示',
    reset: '重置',
    langSwitch: 'EN',
    victoryTitle: '恭喜通关！',
    victoryMessage: '你用 {moves} 步完成了 {difficulty} 难度，用时 {time}！',
    newRecord: '新纪录！',
    playAgain: '再玩一次',
    movesSuffix: '步',
    secondsSuffix: '秒',
    cancel: '取消选择'
  },
  en: {
    title: 'Hanoi Tower',
    subtitle: 'Challenge Your Mind',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    master: 'Master',
    time: 'Time',
    moves: 'Moves',
    bestTime: 'Best Time',
    bestMoves: 'Best Moves',
    optimalMoves: 'Optimal',
    undo: 'Undo',
    hint: 'Hint',
    reset: 'Reset',
    langSwitch: '中文',
    victoryTitle: 'Victory!',
    victoryMessage: 'You completed {difficulty} in {moves} moves with time {time}!',
    newRecord: 'New Record!',
    playAgain: 'Play Again',
    movesSuffix: ' moves',
    secondsSuffix: 's',
    cancel: 'Cancel'
  }
}

let currentLang: 'zh' | 'en' = 'zh'

export function setLanguage(lang: 'zh' | 'en'): void {
  currentLang = lang
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
}

export function getLanguage(): 'zh' | 'en' {
  return currentLang
}

export function toggleLanguage(): 'zh' | 'en' {
  currentLang = currentLang === 'zh' ? 'en' : 'zh'
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en'
  return currentLang
}

export function t(key: keyof I18n): string {
  return translations[currentLang][key]
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}${t('secondsSuffix')}`
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
