import type { GameState, Move, Difficulty } from './types'

const DISK_COUNTS: Record<Difficulty, number> = {
  easy: 3,
  medium: 5,
  hard: 7,
  master: 9
}

export class HanoiGame {
  private state: GameState
  private moveHistory: Move[] = []
  private optimalSolution: Move[] = []
  private onStateChange?: (state: GameState) => void

  constructor(difficulty: Difficulty = 'easy') {
    this.state = this.initializeState(difficulty)
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
      liftedDisk: null
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

  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback
  }

  getState(): GameState {
    return { ...this.state }
  }

  getOptimalMoves(): number {
    return Math.pow(2, this.state.diskCount) - 1
  }

  /** Click on a disk to lift it (must be top disk) */
  liftDisk(pegIndex: number): boolean {
    const { pegs, isCompleted, liftedDisk } = this.state

    if (isCompleted) return false
    if (liftedDisk) return false // Already lifting a disk
    if (pegs[pegIndex].length === 0) return false // No disk to lift

    const diskSize = pegs[pegIndex][pegs[pegIndex].length - 1]

    this.state.liftedDisk = { pegIndex, diskSize }
    this.notifyStateChange()
    return true
  }

  /** Click on a peg to place the lifted disk */
  placeDisk(targetPegIndex: number): 'placed' | 'invalid' | 'completed' | 'cancelled' {
    const { pegs, liftedDisk } = this.state

    if (!liftedDisk) return 'invalid'

    const { pegIndex: fromPeg, diskSize } = liftedDisk

    // If clicking the same peg, cancel the lift
    if (fromPeg === targetPegIndex) {
      this.state.liftedDisk = null
      this.notifyStateChange()
      return 'cancelled'
    }

    const topDiskTarget = pegs[targetPegIndex][pegs[targetPegIndex].length - 1]

    // Check if move is valid (can place on empty peg or on larger disk)
    if (topDiskTarget === undefined || diskSize < topDiskTarget) {
      // Execute move
      pegs[fromPeg].pop()
      pegs[targetPegIndex].push(diskSize)

      this.moveHistory.push({ from: fromPeg, to: targetPegIndex })
      this.state.moveCount++
      this.state.liftedDisk = null

      // Start timer on first move
      if (!this.state.isPlaying && this.state.moveCount === 1) {
        this.state.isPlaying = true
      }

      // Check win condition (all disks on last peg)
      if (pegs[2].length === this.state.diskCount) {
        this.state.isCompleted = true
        this.state.isPlaying = false
        this.notifyStateChange()
        return 'completed'
      }

      this.notifyStateChange()
      return 'placed'
    }

    // Invalid move - target peg has smaller disk, just cancel the lift
    this.state.liftedDisk = null
    this.notifyStateChange()
    return 'invalid'
  }

  undo(): boolean {
    if (this.moveHistory.length === 0) return false

    const lastMove = this.moveHistory.pop()!
    const { from, to } = lastMove
    const disk = this.state.pegs[to].pop()!
    this.state.pegs[from].push(disk)
    this.state.moveCount--
    this.state.liftedDisk = null

    // If undoing the last move, stop the game
    if (this.state.moveCount === 0) {
      this.state.isPlaying = false
      this.state.elapsedTime = 0
    }

    this.notifyStateChange()
    return true
  }

  getHint(): { from: number; to: number } | null {
    if (this.state.isCompleted) return null

    // Find the next optimal move based on current state
    const currentMoves = this.moveHistory.length
    if (currentMoves < this.optimalSolution.length) {
      return this.optimalSolution[currentMoves]
    }
    return null
  }

  reset(): void {
    this.state = this.initializeState(this.state.difficulty)
    this.moveHistory = []
    this.calculateOptimalSolution()
    this.notifyStateChange()
  }

  changeDifficulty(difficulty: Difficulty): void {
    this.state = this.initializeState(difficulty)
    this.moveHistory = []
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
