import type { GameState, Difficulty } from './types'
import { t, formatTime } from './i18n'
import { getRecord } from './storage'

// Disk colors (from small to large)
const DISK_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#64748b', // slate
]

export class Renderer {
  private container: HTMLElement
  private gameBoard: HTMLElement | null = null
  private pegs: HTMLElement[] = []
  private disks: HTMLElement[][] = [[], [], []]
  private statsEl: HTMLElement | null = null
  private bestRecordEl: HTMLElement | null = null
  private hintPeg: number | null = null
  private liftedDiskEl: HTMLElement | null = null

  constructor(container: HTMLElement) {
    this.container = container
  }

  render(gameState: GameState): void {
    if (!this.gameBoard) {
      this.createBaseStructure()
    }
    this.updatePegs(gameState)
    this.updateLiftedDisk(gameState)
    this.updateStats(gameState)
    this.updateBestRecord(gameState.difficulty)
  }

  private createBaseStructure(): void {
    this.container.innerHTML = ''

    // Header
    const header = document.createElement('div')
    header.className = 'header'
    header.innerHTML = `
      <h1>${t('title')}</h1>
      <p class="subtitle">${t('subtitle')}</p>
    `
    this.container.appendChild(header)

    // Controls
    const controls = document.createElement('div')
    controls.className = 'controls'
    controls.innerHTML = `
      <div class="difficulty-selector">
        <label>${t('difficulty')}</label>
        <div class="difficulty-buttons">
          ${['easy', 'medium', 'hard', 'master'].map(d => `
            <button data-difficulty="${d}" class="diff-btn">${t(d as Difficulty)}</button>
          `).join('')}
        </div>
      </div>
      <button class="lang-switch">${t('langSwitch')}</button>
    `
    this.container.appendChild(controls)

    // Stats
    this.statsEl = document.createElement('div')
    this.statsEl.className = 'stats'
    this.container.appendChild(this.statsEl)

    // Best record
    this.bestRecordEl = document.createElement('div')
    this.bestRecordEl.className = 'best-record'
    this.container.appendChild(this.bestRecordEl)

    // Game board
    this.gameBoard = document.createElement('div')
    this.gameBoard.className = 'game-board'
    this.container.appendChild(this.gameBoard)

    // Create 3 pegs
    for (let i = 0; i < 3; i++) {
      const peg = document.createElement('div')
      peg.className = 'peg-container'
      peg.dataset.index = String(i)

      const pegRod = document.createElement('div')
      pegRod.className = 'peg-rod'

      const pegBase = document.createElement('div')
      pegBase.className = 'peg-base'

      const diskStack = document.createElement('div')
      diskStack.className = 'disk-stack'

      peg.appendChild(pegRod)
      peg.appendChild(pegBase)
      peg.appendChild(diskStack)

      this.gameBoard.appendChild(peg)
      this.pegs.push(peg)
      this.disks[i] = []
    }

    // Bottom controls
    const bottomControls = document.createElement('div')
    bottomControls.className = 'bottom-controls'
    bottomControls.innerHTML = `
      <button class="control-btn undo-btn" disabled>${t('undo')}</button>
      <button class="control-btn hint-btn">${t('hint')}</button>
      <button class="control-btn reset-btn">${t('reset')}</button>
    `
    this.container.appendChild(bottomControls)

    // Victory modal (hidden by default)
    const modal = document.createElement('div')
    modal.className = 'victory-modal hidden'
    modal.innerHTML = `
      <div class="modal-content">
        <h2>${t('victoryTitle')}</h2>
        <div class="fireworks"></div>
        <p class="victory-message"></p>
        <div class="new-record-badge hidden">${t('newRecord')}</div>
        <button class="play-again-btn">${t('playAgain')}</button>
      </div>
    `
    this.container.appendChild(modal)
  }

  private updatePegs(state: GameState): void {
    const { pegs, liftedDisk, diskCount } = state

    this.pegs.forEach((pegEl, pegIndex) => {
      // Update hint state
      pegEl.classList.toggle('hint', this.hintPeg === pegIndex)

      const diskStack = pegEl.querySelector('.disk-stack') as HTMLElement
      diskStack.innerHTML = ''

      // Calculate scale factor based on disk count
      const maxDiskWidth = Math.min(80, 280 / diskCount)
      const minDiskWidth = Math.max(20, maxDiskWidth * 0.4)
      const widthStep = (maxDiskWidth - minDiskWidth) / (diskCount - 1 || 1)
      const diskHeight = Math.max(16, 120 / diskCount)

      pegs[pegIndex].forEach((diskSize, diskIndex) => {
        // Skip the lifted disk - it will be rendered separately
        if (liftedDisk && liftedDisk.pegIndex === pegIndex && diskIndex === pegs[pegIndex].length - 1) {
          return
        }

        const disk = this.createDiskElement(diskSize, diskIndex, minDiskWidth, widthStep, diskHeight, pegIndex)
        diskStack.appendChild(disk)
      })
    })

    // Update difficulty buttons
    this.container.querySelectorAll('.diff-btn').forEach(btn => {
      const btnEl = btn as HTMLElement
      btnEl.classList.toggle('active', btnEl.dataset.difficulty === state.difficulty)
    })
  }

  private createDiskElement(
    diskSize: number,
    diskIndex: number,
    minDiskWidth: number,
    widthStep: number,
    diskHeight: number,
    pegIndex: number
  ): HTMLElement {
    const disk = document.createElement('div')
    disk.className = 'disk'
    disk.dataset.size = String(diskSize)
    disk.dataset.peg = String(pegIndex)
    disk.style.backgroundColor = DISK_COLORS[(diskSize - 1) % DISK_COLORS.length]
    disk.style.width = `${minDiskWidth + (diskSize - 1) * widthStep}px`
    disk.style.height = `${diskHeight}px`
    disk.style.bottom = `${diskIndex * (diskHeight + 2)}px`
    disk.style.zIndex = String(diskSize)

    return disk
  }

  private updateLiftedDisk(state: GameState): void {
    // Remove old lifted disk element
    if (this.liftedDiskEl) {
      this.liftedDiskEl.remove()
      this.liftedDiskEl = null
    }

    if (!state.liftedDisk) return

    const { pegIndex, diskSize } = state.liftedDisk
    const pegEl = this.pegs[pegIndex]
    if (!pegEl) return

    // Calculate dimensions same as regular disks
    const maxDiskWidth = Math.min(80, 280 / state.diskCount)
    const minDiskWidth = Math.max(20, maxDiskWidth * 0.4)
    const widthStep = (maxDiskWidth - minDiskWidth) / (state.diskCount - 1 || 1)
    const diskHeight = Math.max(16, 120 / state.diskCount)

    // Create lifted disk element
    const liftedDisk = document.createElement('div')
    liftedDisk.className = 'disk lifted'
    liftedDisk.dataset.size = String(diskSize)
    liftedDisk.style.backgroundColor = DISK_COLORS[(diskSize - 1) % DISK_COLORS.length]
    liftedDisk.style.width = `${minDiskWidth + (diskSize - 1) * widthStep}px`
    liftedDisk.style.height = `${diskHeight}px`
    liftedDisk.style.zIndex = '100'

    // Position it above the peg
    const diskStack = pegEl.querySelector('.disk-stack') as HTMLElement
    const stackHeight = state.pegs[pegIndex].length * (diskHeight + 2)
    liftedDisk.style.bottom = `${stackHeight + 20}px`

    diskStack.appendChild(liftedDisk)
    this.liftedDiskEl = liftedDisk

    // Highlight the source peg
    pegEl.classList.add('lifting-from')
  }

  private updateStats(state: GameState): void {
    if (!this.statsEl) return

    this.statsEl.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">${t('time')}</span>
        <span class="stat-value time-value">${formatTime(state.elapsedTime)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">${t('moves')}</span>
        <span class="stat-value moves-value">${state.moveCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">${t('optimalMoves')}</span>
        <span class="stat-value optimal-value">${Math.pow(2, state.diskCount) - 1}</span>
      </div>
    `
  }

  private updateBestRecord(difficulty: Difficulty): void {
    if (!this.bestRecordEl) return

    const record = getRecord(difficulty)

    this.bestRecordEl.innerHTML = `
      <div class="record-item">
        <span class="record-label">${t('bestTime')}</span>
        <span class="record-value">${record.bestTime !== null ? formatTime(record.bestTime) : '-'}</span>
      </div>
      <div class="record-item">
        <span class="record-label">${t('bestMoves')}</span>
        <span class="record-value">${record.bestMoves !== null ? record.bestMoves + t('movesSuffix') : '-'}</span>
      </div>
    `
  }

  showHint(from: number, to: number): void {
    // Highlight target peg
    this.hintPeg = to
    this.render({
      ...this.getCurrentStateFromDOM(),
      liftedDisk: { pegIndex: from, diskSize: 1 }
    } as GameState)

    // Clear hint after 1.5 seconds
    setTimeout(() => {
      this.hintPeg = null
      this.render({
        ...this.getCurrentStateFromDOM(),
        liftedDisk: null
      } as GameState)
    }, 1500)
  }

  showVictory(gameState: GameState, isNewRecord: boolean): void {
    const modal = this.container.querySelector('.victory-modal')
    const message = modal?.querySelector('.victory-message')
    const badge = modal?.querySelector('.new-record-badge')

    if (message) {
      const difficultyLabel = t(gameState.difficulty)
      const timeStr = formatTime(gameState.elapsedTime)
      const movesStr = String(gameState.moveCount) + t('movesSuffix')

      message.innerHTML = t('victoryMessage')
        .replace('{difficulty}', difficultyLabel)
        .replace('{moves}', movesStr)
        .replace('{time}', timeStr)
    }

    badge?.classList.toggle('hidden', !isNewRecord)
    modal?.classList.remove('hidden')

    // Trigger fireworks
    this.triggerFireworks()
  }

  hideVictory(): void {
    const modal = this.container.querySelector('.victory-modal')
    modal?.classList.add('hidden')
  }

  private triggerFireworks(): void {
    const fireworks = this.container.querySelector('.fireworks')
    if (!fireworks) return

    fireworks.innerHTML = ''

    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const firework = document.createElement('div')
        firework.className = 'firework'
        firework.style.left = `${Math.random() * 100}%`
        firework.style.top = `${Math.random() * 100}%`
        firework.style.backgroundColor = DISK_COLORS[Math.floor(Math.random() * DISK_COLORS.length)]
        firework.style.animationDelay = `${Math.random() * 0.5}s`
        fireworks.appendChild(firework)

        setTimeout(() => firework.remove(), 1000)
      }, i * 100)
    }
  }

  setUndoEnabled(enabled: boolean): void {
    const undoBtn = this.container.querySelector('.undo-btn') as HTMLButtonElement
    if (undoBtn) undoBtn.disabled = !enabled
  }

  private getCurrentStateFromDOM(): Partial<GameState> {
    // Helper to reconstruct state from DOM for hint rendering
    return {
      pegs: [[], [], []],
      difficulty: 'easy',
      diskCount: 3,
      moveCount: 0,
      elapsedTime: 0,
      isPlaying: false,
      isCompleted: false,
      liftedDisk: null
    }
  }
}
