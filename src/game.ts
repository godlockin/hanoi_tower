import type { GameState, Move, Difficulty } from './types'

const DISK_COUNTS: Record<Difficulty, number> = {
  easy: 3,
  medium: 4,
  hard: 5,
  harder: 6,
  expert: 7,
  master: 8,
  grandmaster: 9
}

export class HanoiGame {
  private state: GameState
  private moveHistory: Move[] = []
  private redoHistory: Move[] = []
  private optimalSolution: Move[] = []
  private onStateChange?: (state: GameState) => void

  constructor(difficulty: Difficulty = 'easy', restoredState?: Partial<GameState>) {
    if (restoredState) {
      this.state = {
        ...this.initializeState(difficulty),
        ...restoredState,
        liftedDisk: null,
        validTargets: [],
        lastAction: null
      }
    } else {
      this.state = this.initializeState(difficulty)
    }
    this.calculateOptimalSolution()
  }

  private initializeState(difficulty: Difficulty): GameState {
    const diskCount = DISK_COUNTS[difficulty]
    const pegs: number[][] = [[], [], []]

    // Initialize first peg with all disks (largest at bottom)
    for (let i = diskCount; i >= 1; i--) {
      pegs[0].push(i)
    }

    return {
      pegs,
      difficulty,
      diskCount,
      moveCount: 0,
      elapsedTime: 0,
      isPlaying: false,
      isCompleted: false,
      liftedDisk: null,
      validTargets: [],
      lastAction: null
    }
  }

  private calculateOptimalSolution(): void {
    this.optimalSolution = []
    this.solveHanoi(this.state.diskCount, 0, 2, 1)
  }

  private solveHanoi(n: number, from: number, to: number, aux: number): void {
    if (n === 0) return
    this.solveHanoi(n - 1, from, aux, to)
    this.optimalSolution.push({ from, to })
    this.solveHanoi(n - 1, aux, to, from)
  }

  private calculateValidTargets(): number[] {
    if (!this.state.liftedDisk) return []

    const { pegIndex: fromPeg, diskSize } = this.state.liftedDisk
    const validTargets: number[] = []

    for (let i = 0; i < 3; i++) {
      if (i === fromPeg) {
        validTargets.push(i)
        continue
      }

      const topDisk = this.state.pegs[i][this.state.pegs[i].length - 1]
      if (topDisk === undefined || diskSize < topDisk) {
        validTargets.push(i)
      }
    }

    return validTargets
  }

  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback
  }

  getState(): GameState {
    return { ...this.state }
  }

  getOptimalMoves(): number {
    return Math.pow(2, this.state.diskCount) - 1
  }

  getStarRating(): number {
    const optimal = this.getOptimalMoves()
    const current = this.state.moveCount
    const ratio = current / optimal

    if (ratio <= 1.1) return 3
    if (ratio <= 1.5) return 2
    return 1
  }

  liftDisk(pegIndex: number): { success: boolean; error?: string } {
    const { pegs, isCompleted, liftedDisk } = this.state

    if (isCompleted) return { success: false, error: 'game_completed' }
    if (liftedDisk) return { success: false, error: 'already_lifting' }
    if (pegs[pegIndex].length === 0) return { success: false, error: 'empty_peg' }

    const diskSize = pegs[pegIndex][pegs[pegIndex].length - 1]

    this.state.liftedDisk = { pegIndex, diskSize }
    this.state.validTargets = this.calculateValidTargets()
    this.state.lastAction = 'lift'
    this.notifyStateChange()
    return { success: true }
  }

  placeDisk(targetPegIndex: number): { result: 'placed' | 'invalid' | 'completed' | 'cancelled'; error?: string } {
    const { pegs, liftedDisk } = this.state

    if (!liftedDisk) return { result: 'invalid', error: 'no_disk_lifted' }

    const { pegIndex: fromPeg, diskSize } = liftedDisk

    if (fromPeg === targetPegIndex) {
      this.state.liftedDisk = null
      this.state.validTargets = []
      this.state.lastAction = 'cancel'
      this.notifyStateChange()
      return { result: 'cancelled' }
    }

    const topDiskTarget = pegs[targetPegIndex][pegs[targetPegIndex].length - 1]

    if (topDiskTarget === undefined || diskSize < topDiskTarget) {
      pegs[fromPeg].pop()
      pegs[targetPegIndex].push(diskSize)

      this.moveHistory.push({ from: fromPeg, to: targetPegIndex })
      this.state.moveCount++

      // Clear redo history on new move
      this.redoHistory = []
      this.state.liftedDisk = null
      this.state.validTargets = []
      this.state.lastAction = 'place'

      if (!this.state.isPlaying && this.state.moveCount === 1) {
        this.state.isPlaying = true
      }

      if (pegs[2].length === this.state.diskCount) {
        this.state.isCompleted = true
        this.state.isPlaying = false
        this.state.lastAction = 'complete'
        this.notifyStateChange()
        return { result: 'completed' }
      }

      this.notifyStateChange()
      return { result: 'placed' }
    }

    this.state.lastAction = 'invalid'
    this.notifyStateChange()
    return { result: 'invalid', error: 'invalid_move' }
  }

  clearLastAction(): void {
    this.state.lastAction = null
  }

  undo(): boolean {
    if (this.moveHistory.length === 0) return false

    const lastMove = this.moveHistory.pop()!
    const { from, to } = lastMove
    const disk = this.state.pegs[to].pop()!
    this.state.pegs[from].push(disk)
    this.state.moveCount--

    // Save to redo history
    this.redoHistory.push(lastMove)

    this.state.liftedDisk = null
    this.state.validTargets = []
    this.state.lastAction = 'undo'

    if (this.state.moveCount === 0) {
      this.state.isPlaying = false
      this.state.elapsedTime = 0
    }

    this.notifyStateChange()
    return true
  }

  redo(): boolean {
    if (this.redoHistory.length === 0) return false

    const nextMove = this.redoHistory.pop()!
    const { from, to } = nextMove
    const disk = this.state.pegs[from].pop()!
    this.state.pegs[to].push(disk)
    this.state.moveCount++

    // Save back to move history
    this.moveHistory.push(nextMove)

    this.state.liftedDisk = null
    this.state.validTargets = []
    this.state.lastAction = 'place'

    if (!this.state.isPlaying && this.state.moveCount === 1) {
      this.state.isPlaying = true
    }

    if (this.state.pegs[2].length === this.state.diskCount) {
      this.state.isCompleted = true
      this.state.isPlaying = false
      this.state.lastAction = 'complete'
    }

    this.notifyStateChange()
    return true
  }

  canRedo(): boolean {
    return this.redoHistory.length > 0
  }

  // Get current state for persistence
  getPersistableState(): {
    difficulty: Difficulty
    pegs: number[][]
    moveCount: number
    elapsedTime: number
    moveHistory: Move[]
  } {
    return {
      difficulty: this.state.difficulty,
      pegs: this.state.pegs.map(peg => [...peg]), // Deep copy
      moveCount: this.state.moveCount,
      elapsedTime: this.state.elapsedTime,
      moveHistory: [...this.moveHistory]
    }
  }

  getHint(): { from: number; to: number } | null {
    if (this.state.isCompleted) return null

    const currentMoves = this.moveHistory.length
    if (currentMoves < this.optimalSolution.length) {
      return this.optimalSolution[currentMoves]
    }
    return null
  }

  setMoveHistory(history: Move[]): void {
    this.moveHistory = history
  }

  reset(): void {
    this.state = this.initializeState(this.state.difficulty)
    this.moveHistory = []
    this.redoHistory = []
    this.calculateOptimalSolution()
    this.notifyStateChange()
  }

  changeDifficulty(difficulty: Difficulty): void {
    this.state = this.initializeState(difficulty)
    this.moveHistory = []
    this.redoHistory = []
    this.calculateOptimalSolution()
    this.notifyStateChange()
  }

  tick(): void {
    if (this.state.isPlaying && !this.state.isCompleted) {
      this.state.elapsedTime++
      this.notifyStateChange()
    }
  }

  private notifyStateChange(): void {
    this.onStateChange?.({ ...this.state })
  }
}
