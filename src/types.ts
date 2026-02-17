export type Difficulty = 'easy' | 'medium' | 'hard' | 'harder' | 'expert' | 'master' | 'grandmaster'

export interface Move {
  from: number
  to: number
}

export interface GameState {
  pegs: number[][]
  difficulty: Difficulty
  diskCount: number
  moveCount: number
  elapsedTime: number
  isPlaying: boolean
  isCompleted: boolean
  liftedDisk: { pegIndex: number; diskSize: number } | null
  validTargets: number[]
  lastAction: 'lift' | 'place' | 'invalid' | 'cancel' | 'undo' | 'complete' | null
}

export interface BestRecord {
  bestTime: number | null
  bestMoves: number | null
  bestStars: number
  completedCount: number
  lastCompletedAt: string | null
}

export type Language = 'zh' | 'en'

export interface I18n {
  title: string
  subtitle: string
  difficulty: string
  easy: string
  medium: string
  hard: string
  harder: string
  expert: string
  master: string
  grandmaster: string
  time: string
  moves: string
  bestTime: string
  bestMoves: string
  optimalMoves: string
  stars: string
  undo: string
  redo: string
  nextLevel: string
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
  tutorialDemo: string
  tutorialDemoLift: string
  tutorialDemoPlace: string
  tutorialDemoHint: string
  rulesTitle: string
  rulesContent: string[]
  close: string
  starRating: string
  perfect: string
  good: string
  completed: string
  confirmReset: string
  confirmDifficultyChange: string
  errorInvalidMove: string
  undoDisabledHint: string
  redoDisabledHint: string
  difficultyLockedHint: string
  hintCooldownHint: string
  liftHint: string
  placeHint: string
  peg: string
  disksOnPeg: string
}
