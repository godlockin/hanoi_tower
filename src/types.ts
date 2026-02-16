export type Difficulty = 'easy' | 'medium' | 'hard' | 'master'

export interface Move {
  from: number
  to: number
}

export interface GameState {
  pegs: number[][] // Array of 3 pegs, each containing disk sizes (1 = smallest)
  difficulty: Difficulty
  diskCount: number
  moveCount: number
  elapsedTime: number // in seconds
  isPlaying: boolean
  isCompleted: boolean
  liftedDisk: { pegIndex: number; diskSize: number } | null
  validTargets: number[] // Pegs where the lifted disk can be placed
}

export interface BestRecord {
  bestTime: number | null // in seconds
  bestMoves: number | null
  completedCount: number
  lastCompletedAt: string | null // ISO date string
}

export type Language = 'zh' | 'en'

export interface I18n {
  title: string
  subtitle: string
  difficulty: string
  easy: string
  medium: string
  hard: string
  master: string
  time: string
  moves: string
  bestTime: string
  bestMoves: string
  optimalMoves: string
  undo: string
  hint: string
  reset: string
  langSwitch: string
  victoryTitle: string
  victoryMessage: string
  newRecord: string
  playAgain: string
  movesSuffix: string
  secondsSuffix: string
  cancel: string
  tutorialTitle: string
  tutorialStep1: string
  tutorialStep2: string
  tutorialStep3: string
  tutorialStep4: string
  tutorialStart: string
  tutorialSkip: string
  rulesTitle: string
  rulesContent: string[]
  close: string
}
