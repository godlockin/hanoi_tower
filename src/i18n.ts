import type { I18n } from './types'

const translations: Record<'zh' | 'en', I18n> = {
  zh: {
    title: '汉诺塔',
    subtitle: '挑战智慧',
    difficulty: '难度',
    easy: '入门',
    medium: '简单',
    hard: '中等',
    harder: '困难',
    expert: '专家',
    master: '大师',
    grandmaster: '宗师',
    time: '时间',
    moves: '步数',
    bestTime: '最佳',
    bestMoves: '最少步数',
    optimalMoves: '最优',
    stars: '星级',
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
    cancel: '取消',
    tutorialTitle: '新手指引',
    tutorialStep1: '点击最上面的盘子提起',
    tutorialStep2: '绿色高亮的柱子可以放置',
    tutorialStep3: '点击目标柱子放下盘子',
    tutorialStep4: '目标：把所有盘子移到最右边',
    tutorialStart: '开始游戏',
    tutorialSkip: '跳过',
    tutorialDemo: '演示',
    tutorialDemoLift: '提起盘子...',
    tutorialDemoPlace: '放置盘子...',
    tutorialDemoHint: '看演示学习如何移动盘子',
    rulesTitle: '游戏规则',
    rulesContent: [
      '每次只能移动一个盘子',
      '只能移动最上面的盘子',
      '大盘子不能放在小盘子上',
      '目标：把所有盘子移到最右边'
    ],
    close: '关闭',
    starRating: '星级评定',
    perfect: '完美',
    good: '良好',
    completed: '完成',
    confirmReset: '确定要重置游戏吗？当前进度将丢失。',
    confirmDifficultyChange: '切换难度将重置游戏，确定要继续吗？',
    errorInvalidMove: '不能放在那里！大盘子不能放在小盘子上。',
    undoDisabledHint: '还没有可以撤销的移动',
    redoDisabledHint: '没有可以重做的移动',
    difficultyLockedHint: '需要上一难度获得2星以上才能解锁',
    hintCooldownHint: '提示冷却中，请稍后再试',
    redo: '重做',
    nextLevel: '下一关',
    liftHint: '点击最上面的盘子提起',
    placeHint: '点击绿色高亮的柱子放置',
    peg: '柱子',
    disksOnPeg: '柱子上的盘子'
  },
  en: {
    title: 'Hanoi Tower',
    subtitle: 'Challenge Your Mind',
    difficulty: 'Difficulty',
    easy: 'Beginner',
    medium: 'Easy',
    hard: 'Medium',
    harder: 'Hard',
    expert: 'Expert',
    master: 'Master',
    grandmaster: 'Grandmaster',
    time: 'Time',
    moves: 'Moves',
    bestTime: 'Best',
    bestMoves: 'Fewest Moves',
    optimalMoves: 'Optimal',
    stars: 'Stars',
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
    tutorialStep2: 'Green highlighted pegs are valid targets',
    tutorialStep3: 'Click a highlighted peg to place the disk',
    tutorialStep4: 'Goal: Move all disks to the rightmost peg',
    tutorialStart: 'Start Game',
    tutorialSkip: 'Skip',
    tutorialDemo: 'Demo',
    tutorialDemoLift: 'Lifting disk...',
    tutorialDemoPlace: 'Placing disk...',
    tutorialDemoHint: 'Watch the demo to learn how to move disks',
    rulesTitle: 'Game Rules',
    rulesContent: [
      'Move only one disk at a time',
      'Only move the top disk of a peg',
      'Never place a larger disk on a smaller one',
      'Goal: Move all disks to the rightmost peg'
    ],
    close: 'Close',
    starRating: 'Star Rating',
    perfect: 'Perfect',
    good: 'Good',
    completed: 'Completed',
    confirmReset: 'Reset the game? Current progress will be lost.',
    confirmDifficultyChange: 'Changing difficulty will reset the game. Continue?',
    errorInvalidMove: 'Cannot place there! Large disks cannot be placed on smaller ones.',
    undoDisabledHint: 'No moves to undo yet',
    redoDisabledHint: 'No moves to redo',
    difficultyLockedHint: 'Complete previous difficulty with 2+ stars to unlock',
    hintCooldownHint: 'Hint on cooldown, please wait',
    redo: 'Redo',
    nextLevel: 'Next Level',
    liftHint: 'Click the top disk to lift',
    placeHint: 'Click green peg to place',
    peg: 'Peg',
    disksOnPeg: 'Disks on peg'
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
