import type { GameState, Difficulty } from './types'
import { t, formatTime } from './i18n'
import { getRecord } from './storage'

// Disk colors - unified warm gradient palette
const DISK_COLORS = [
  '#fbbf24', // amber-400
  '#f59e0b', // amber-500
  '#d97706', // amber-600
  '#b45309', // amber-700
  '#92400e', // amber-800
  '#ea580c', // orange-600
  '#c2410c', // orange-700
  '#9a3412', // orange-800
  '#7c2d12', // orange-900
]

export class Renderer {
  private container: HTMLElement
  private gameBoard: HTMLElement | null = null
  private pegs: HTMLElement[] = []
  private statsEl: HTMLElement | null = null
  private bestRecordEl: HTMLElement | null = null
  private liftedDiskEl: HTMLElement | null = null
  private tutorialStep: number = 0
  private showTutorial: boolean = true
  private hasSeenTutorial: boolean = false

  constructor(container: HTMLElement) {
    this.container = container
    // Check if user has seen tutorial before
    this.hasSeenTutorial = localStorage.getItem('hanoi-tutorial-seen') === 'true'
    this.showTutorial = !this.hasSeenTutorial
  }

  render(gameState: GameState): void {
    if (!this.gameBoard) {
      this.createBaseStructure()
    }
    this.updatePegs(gameState)
    this.updateLiftedDisk(gameState)
    this.updateStats(gameState)
    this.updateBestRecord(gameState.difficulty)
    this.updateTutorial(gameState)
  }

  private createBaseStructure(): void {
    this.container.innerHTML = ''

    // Header with language switch
    const header = document.createElement('div')
    header.className = 'header'
    header.innerHTML = `
      <div class="header-top">
        <button class="lang-switch" title="Switch Language">${t('langSwitch')}</button>
        <button class="help-btn" title="Game Rules">?</button>
      </div>
      <h1>${t('title')}</h1>
    `
    this.container.appendChild(header)

    // Stats bar (compact)
    this.statsEl = document.createElement('div')
    this.statsEl.className = 'stats-bar'
    this.container.appendChild(this.statsEl)

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
    }

    // Difficulty selector (segmented control)
    const diffSelector = document.createElement('div')
    diffSelector.className = 'difficulty-bar'
    diffSelector.innerHTML = `
      ${['easy', 'medium', 'hard', 'master'].map(d => `
        <button data-difficulty="${d}" class="diff-btn ${d === 'easy' ? 'active' : ''}">${t(d as Difficulty)}</button>
      `).join('')}
    `
    this.container.appendChild(diffSelector)

    // Best record
    this.bestRecordEl = document.createElement('div')
    this.bestRecordEl.className = 'best-record'
    this.container.appendChild(this.bestRecordEl)

    // Bottom controls
    const bottomControls = document.createElement('div')
    bottomControls.className = 'bottom-controls'
    bottomControls.innerHTML = `
      <button class="control-btn undo-btn" disabled title="${t('undo')}">
        <span class="icon">↩</span>
        <span class="label">${t('undo')}</span>
      </button>
      <button class="control-btn hint-btn" title="${t('hint')}">
        <span class="icon">💡</span>
        <span class="label">${t('hint')}</span>
      </button>
      <button class="control-btn reset-btn" title="${t('reset')}">
        <span class="icon">↻</span>
        <span class="label">${t('reset')}</span>
      </button>
    `
    this.container.appendChild(bottomControls)

    // Tutorial overlay
    if (this.showTutorial) {
      this.createTutorialOverlay()
    }

    // Rules modal (hidden by default)
    this.createRulesModal()

    // Victory modal (hidden by default)
    this.createVictoryModal()
  }

  private createTutorialOverlay(): void {
    const overlay = document.createElement('div')
    overlay.className = 'tutorial-overlay'
    overlay.innerHTML = `
      <div class="tutorial-content">
        <h2>${t('tutorialTitle')}</h2>
        <div class="tutorial-steps">
          <div class="tutorial-step ${this.tutorialStep === 0 ? 'active' : ''}" data-step="0">
            <div class="step-number">1</div>
            <div class="step-text">${t('tutorialStep1')}</div>
          </div>
          <div class="tutorial-step ${this.tutorialStep === 1 ? 'active' : ''}" data-step="1">
            <div class="step-number">2</div>
            <div class="step-text">${t('tutorialStep2')}</div>
          </div>
          <div class="tutorial-step ${this.tutorialStep === 2 ? 'active' : ''}" data-step="2">
            <div class="step-number">3</div>
            <div class="step-text">${t('tutorialStep3')}</div>
          </div>
          <div class="tutorial-step ${this.tutorialStep === 3 ? 'active' : ''}" data-step="3">
            <div class="step-number">4</div>
            <div class="step-text">${t('tutorialStep4')}</div>
          </div>
        </div>
        <div class="tutorial-actions">
          <button class="tutorial-btn secondary tutorial-skip">${t('tutorialSkip')}</button>
          <button class="tutorial-btn primary tutorial-next">${t('tutorialStart')}</button>
        </div>
      </div>
    `
    this.container.appendChild(overlay)
  }

  private createRulesModal(): void {
    const modal = document.createElement('div')
    modal.className = 'rules-modal hidden'
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content rules-content">
        <h2>${t('rulesTitle')}</h2>
        <ul class="rules-list">
          ${(t('rulesContent') as string[]).map((rule: string) => `<li>${rule}</li>`).join('')}
        </ul>
        <button class="modal-close">${t('close')}</button>
      </div>
    `
    this.container.appendChild(modal)
  }

  private createVictoryModal(): void {
    const modal = document.createElement('div')
    modal.className = 'victory-modal hidden'
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content victory-content">
        <div class="victory-icon">🏆</div>
        <h2>${t('victoryTitle')}</h2>
        <p class="victory-message"></p>
        <div class="new-record-badge hidden">${t('newRecord')}</div>
        <div class="fireworks"></div>
        <button class="play-again-btn">${t('playAgain')}</button>
      </div>
    `
    this.container.appendChild(modal)
  }

  private updateTutorial(_gameState: GameState): void {
    if (!this.showTutorial) return

    const steps = this.container.querySelectorAll('.tutorial-step')
    steps.forEach((step, index) => {
      step.classList.toggle('active', index === this.tutorialStep)
    })

    const nextBtn = this.container.querySelector('.tutorial-next') as HTMLButtonElement
    if (nextBtn) {
      nextBtn.textContent = this.tutorialStep === 3 ? t('tutorialStart') as string : '下一步'
    }
  }

  setTutorialStep(step: number): void {
    this.tutorialStep = step
    if (step > 3) {
      this.closeTutorial()
    } else {
      this.updateTutorial(this.getCurrentState())
    }
  }

  closeTutorial(): void {
    this.showTutorial = false
    this.hasSeenTutorial = true
    localStorage.setItem('hanoi-tutorial-seen', 'true')
    const overlay = this.container.querySelector('.tutorial-overlay')
    overlay?.classList.add('hidden')
  }

  showRules(): void {
    const modal = this.container.querySelector('.rules-modal')
    modal?.classList.remove('hidden')
  }

  hideRules(): void {
    const modal = this.container.querySelector('.rules-modal')
    modal?.classList.add('hidden')
  }

  private updatePegs(state: GameState): void {
    const { pegs, liftedDisk, diskCount, validTargets } = state

    this.pegs.forEach((pegEl, pegIndex) => {
      // Update visual states
      pegEl.classList.toggle('lifting-from', liftedDisk?.pegIndex === pegIndex)
      pegEl.classList.toggle('valid-target', validTargets.includes(pegIndex) && liftedDisk?.pegIndex !== pegIndex)
      pegEl.classList.toggle('invalid-target', liftedDisk !== null && !validTargets.includes(pegIndex))

      const diskStack = pegEl.querySelector('.disk-stack') as HTMLElement
      diskStack.innerHTML = ''

      // Calculate dimensions
      const maxDiskWidth = Math.min(100, 320 / diskCount)
      const minDiskWidth = Math.max(30, maxDiskWidth * 0.5)
      const widthStep = (maxDiskWidth - minDiskWidth) / (diskCount - 1 || 1)
      const diskHeight = Math.max(20, 160 / diskCount)

      pegs[pegIndex].forEach((diskSize, diskIndex) => {
        // Skip the lifted disk
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
    disk.style.bottom = `${diskIndex * (diskHeight + 4)}px`
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

    // Calculate dimensions
    const maxDiskWidth = Math.min(100, 320 / state.diskCount)
    const minDiskWidth = Math.max(30, maxDiskWidth * 0.5)
    const widthStep = (maxDiskWidth - minDiskWidth) / (state.diskCount - 1 || 1)
    const diskHeight = Math.max(20, 160 / state.diskCount)

    // Create lifted disk element
    const liftedDisk = document.createElement('div')
    liftedDisk.className = 'disk lifted'
    liftedDisk.dataset.size = String(diskSize)
    liftedDisk.style.backgroundColor = DISK_COLORS[(diskSize - 1) % DISK_COLORS.length]
    liftedDisk.style.width = `${minDiskWidth + (diskSize - 1) * widthStep}px`
    liftedDisk.style.height = `${diskHeight}px`
    liftedDisk.style.zIndex = '100'

    // Position it floating above
    const diskStack = pegEl.querySelector('.disk-stack') as HTMLElement
    const stackHeight = state.pegs[pegIndex].length * (diskHeight + 4)
    liftedDisk.style.bottom = `${stackHeight + 30}px`

    diskStack.appendChild(liftedDisk)
    this.liftedDiskEl = liftedDisk
  }

  private updateStats(state: GameState): void {
    if (!this.statsEl) return

    this.statsEl.innerHTML = `
      <div class="stat-box">
        <span class="stat-icon">⏱️</span>
        <span class="stat-value time">${formatTime(state.elapsedTime)}</span>
      </div>
      <div class="stat-box">
        <span class="stat-icon">🔄</span>
        <span class="stat-value moves">${state.moveCount}</span>
        <span class="stat-separator">/</span>
        <span class="stat-value optimal">${Math.pow(2, state.diskCount) - 1}</span>
      </div>
    `
  }

  private updateBestRecord(difficulty: Difficulty): void {
    if (!this.bestRecordEl) return

    const record = getRecord(difficulty)

    this.bestRecordEl.innerHTML = `
      <div class="record-box">
        <span class="record-label">${t('bestTime')}</span>
        <span class="record-value">${record.bestTime !== null ? formatTime(record.bestTime) : '-'}</span>
      </div>
      <div class="record-box">
        <span class="record-label">${t('bestMoves')}</span>
        <span class="record-value">${record.bestMoves !== null ? record.bestMoves : '-'}</span>
      </div>
    `
  }

  showHint(from: number, to: number): void {
    const fromPeg = this.pegs[from]
    const toPeg = this.pegs[to]

    fromPeg?.classList.add('hint-source')
    toPeg?.classList.add('hint-target')

    setTimeout(() => {
      fromPeg?.classList.remove('hint-source')
      toPeg?.classList.remove('hint-target')
    }, 2000)
  }

  showVictory(gameState: GameState, isNewRecord: boolean): void {
    const modal = this.container.querySelector('.victory-modal')
    const message = modal?.querySelector('.victory-message')
    const badge = modal?.querySelector('.new-record-badge')

    if (message) {
      const difficultyLabel = t(gameState.difficulty)
      const timeStr = formatTime(gameState.elapsedTime)
      const movesStr = String(gameState.moveCount)

      message.innerHTML = (t('victoryMessage') as string)
        .replace('{difficulty}', `<strong>${difficultyLabel}</strong>`)
        .replace('{moves}', `<strong>${movesStr}</strong>`)
        .replace('{time}', `<strong>${timeStr}</strong>`)
    }

    badge?.classList.toggle('hidden', !isNewRecord)
    modal?.classList.remove('hidden')

    this.triggerFireworks()
  }

  hideVictory(): void {
    const modal = this.container.querySelector('.victory-modal')
    modal?.classList.add('hidden')
  }

  private triggerFireworks(): void {
    const fireworks = this.container.querySelector('.victory-modal .fireworks')
    if (!fireworks) return

    fireworks.innerHTML = ''

    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const firework = document.createElement('div')
        firework.className = 'firework'
        firework.style.left = `${20 + Math.random() * 60}%`
        firework.style.top = `${20 + Math.random() * 60}%`
        firework.style.backgroundColor = DISK_COLORS[Math.floor(Math.random() * DISK_COLORS.length)]
        fireworks.appendChild(firework)

        setTimeout(() => firework.remove(), 1500)
      }, i * 80)
    }
  }

  setUndoEnabled(enabled: boolean): void {
    const undoBtn = this.container.querySelector('.undo-btn') as HTMLButtonElement
    if (undoBtn) undoBtn.disabled = !enabled
  }

  private getCurrentState(): GameState {
    return {
      pegs: [[], [], []],
      difficulty: 'easy',
      diskCount: 3,
      moveCount: 0,
      elapsedTime: 0,
      isPlaying: false,
      isCompleted: false,
      liftedDisk: null,
      validTargets: []
    }
  }
}
