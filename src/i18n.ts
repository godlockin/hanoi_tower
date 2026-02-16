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
    cancel: '取消选择',
    tutorialTitle: '新手指引',
    tutorialStep1: '点击最上面的盘子，将其提起',
    tutorialStep2: '可放置的柱子会高亮显示',
    tutorialStep3: '点击高亮的柱子，放下盘子',
    tutorialStep4: '目标：把所有盘子移到最右边的柱子',
    tutorialStart: '开始游戏',
    tutorialSkip: '跳过',
    rulesTitle: '游戏规则',
    rulesContent: [
      '每次只能移动一个盘子',
      '只能移动最上面的盘子',
      '大盘子不能放在小盘子上面',
      '目标：把所有盘子移到最右边的柱子'
    ],
    close: '关闭'
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
    cancel: 'Cancel',
    tutorialTitle: 'Tutorial',
    tutorialStep1: 'Click the top disk to lift it',
    tutorialStep2: 'Valid target pegs will be highlighted',
    tutorialStep3: 'Click a highlighted peg to place the disk',
    tutorialStep4: 'Goal: Move all disks to the rightmost peg',
    tutorialStart: 'Start Game',
    tutorialSkip: 'Skip',
    rulesTitle: 'Game Rules',
    rulesContent: [
      'Move only one disk at a time',
      'Only move the top disk of a peg',
      'Never place a larger disk on a smaller one',
      'Goal: Move all disks to the rightmost peg'
    ],
    close: 'Close'
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

export function t(key: keyof I18n): string | string[] {
  return translations[currentLang][key]
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}${t('secondsSuffix')}`
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
