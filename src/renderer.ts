import type { GameState, Difficulty, I18n } from './types'
import { t, formatTime } from './i18n'
import { getRecord, isDifficultyUnlocked, getTheme, getAllRecords, getTotalStats } from './storage'

// Vibrant, distinguishable color palette for disks
const DISK_COLORS = [
  '#fbbf24', // amber-400 (smallest)
  '#f87171', // red-400
  '#a78bfa', // violet-400
  '#34d399', // emerald-400
  '#60a5fa', // blue-400
  '#f472b6', // pink-400
  '#22d3ee', // cyan-400
  '#a3e635', // lime-400
  '#fb923c', // orange-400 (largest)
]

export class Renderer {
  private container: HTMLElement
  private gameBoard: HTMLElement | null = null
  private pegs: HTMLElement[] = []
  private statsEl: HTMLElement | null = null
  private bestRecordEl: HTMLElement | null = null
  private liftedDiskEl: HTMLElement | null = null
  private statusHintEl: HTMLElement | null = null
  private errorToastEl: HTMLElement | null = null
  private liveRegion: HTMLElement | null = null
  private tutorialStep: number = 0
  private shouldShowTutorial: boolean = true
  private hasSeenTutorial: boolean = false
  private pendingAction: (() => void) | null = null
  private fireworksTimeouts: number[] = []

  constructor(container: HTMLElement) {
    this.container = container
    this.hasSeenTutorial = localStorage.getItem('hanoi-tutorial-seen') === 'true'
    this.shouldShowTutorial = !this.hasSeenTutorial
  }

  render(gameState: GameState): void {
    if (!this.gameBoard) {
      this.createBaseStructure()
    }

    // Only update changed parts for performance
    this.updatePegs(gameState)
    this.updateLiftedDisk(gameState)
    this.updateStatusHint(gameState)
    this.updateStats(gameState)
    this.updateBestRecord(gameState.difficulty)
    this.updateTutorial(gameState)
    this.handleActionFeedback(gameState)
  }

  private updateStatusHint(state: GameState): void {
    if (!this.statusHintEl) return

    if (state.isCompleted) {
      this.statusHintEl.textContent = t('victoryMessage') as string
      this.statusHintEl.className = 'status-hint victory'
    } else if (state.liftedDisk) {
      const hintText = t('placeHint') as string || `点击绿色高亮的柱子放置盘子 ${state.liftedDisk.diskSize}`
      this.statusHintEl.textContent = hintText
      this.statusHintEl.className = 'status-hint placing'
    } else {
      const hintText = t('liftHint') as string || '点击最上面的盘子提起'
      this.statusHintEl.textContent = hintText
      this.statusHintEl.className = 'status-hint'
    }
  }

  private createBaseStructure(): void {
    this.container.innerHTML = ''

    // Header
    const header = document.createElement('div')
    header.className = 'header'
    const currentTheme = getTheme()
    header.innerHTML = `
      <div class="header-top">
        <button class="theme-toggle" title="Toggle Theme" aria-label="Toggle Theme">${currentTheme === 'dark' ? '🌙' : '☀️'}</button>
        <button class="audio-toggle" title="Toggle Sound" aria-label="Toggle Sound" aria-pressed="true">🔊</button>
        <button class="lang-switch" title="Switch Language" aria-label="${t('langSwitch')}">${t('langSwitch')}</button>
        <button class="stats-btn" title="Statistics" aria-label="Statistics">📊</button>
        <button class="help-btn" title="Game Rules" aria-label="${t('rulesTitle')}">?</button>
      </div>
      <h1>${t('title')}</h1>
    `
    this.container.appendChild(header)

    // Difficulty selector - 2 rows for 7 levels
    const diffSelector = document.createElement('div')
    diffSelector.className = 'difficulty-bar'
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'harder', 'expert', 'master', 'grandmaster']

    const renderDiffBtn = (d: Difficulty) => {
      const isUnlocked = isDifficultyUnlocked(d)
      const record = getRecord(d)
      const stars = record.bestStars > 0 ? '★'.repeat(record.bestStars) : ''
      return `
        <button data-difficulty="${d}" class="diff-btn ${d === 'easy' ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}" ${!isUnlocked ? 'disabled' : ''}>
          ${t(d as Difficulty)}${stars ? `<span class="diff-stars">${stars}</span>` : ''}
          ${!isUnlocked ? '<span class="lock-icon">🔒</span>' : ''}
        </button>
      `
    }

    diffSelector.innerHTML = `
      <div class="difficulty-row">
        ${difficulties.slice(0, 4).map(renderDiffBtn).join('')}
      </div>
      <div class="difficulty-row">
        ${difficulties.slice(4).map(renderDiffBtn).join('')}
      </div>
    `
    this.container.appendChild(diffSelector)

    // Game board area
    const gameArea = document.createElement('div')
    gameArea.className = 'game-area'

    // Game board
    this.gameBoard = document.createElement('div')
    this.gameBoard.className = 'game-board'
    gameArea.appendChild(this.gameBoard)

    // Create pegs with ARIA labels
    for (let i = 0; i < 3; i++) {
      const peg = document.createElement('div')
      peg.className = 'peg-container'
      peg.dataset.index = String(i)
      peg.setAttribute('role', 'button')
      peg.setAttribute('aria-label', `${t('peg') || 'Peg'} ${i + 1}`)
      peg.setAttribute('tabindex', '0')

      const pegRod = document.createElement('div')
      pegRod.className = 'peg-rod'

      const pegBase = document.createElement('div')
      pegBase.className = 'peg-base'

      const diskStack = document.createElement('div')
      diskStack.className = 'disk-stack'
      diskStack.setAttribute('role', 'list')
      diskStack.setAttribute('aria-label', `${t('disksOnPeg') || 'Disks on peg'} ${i + 1}`)

      peg.appendChild(pegRod)
      peg.appendChild(pegBase)
      peg.appendChild(diskStack)

      // Create peg label
      const pegLabel = document.createElement('div')
      pegLabel.className = 'peg-key-label'
      pegLabel.textContent = String(i + 1)
      peg.appendChild(pegLabel)

      // Make peg a drop zone
      peg.addEventListener('dragover', (e) => {
        e.preventDefault()
        peg.classList.add('drag-over')
      })

      peg.addEventListener('dragleave', () => {
        peg.classList.remove('drag-over')
      })

      peg.addEventListener('drop', (e) => {
        e.preventDefault()
        peg.classList.remove('drag-over')
        const diskSize = e.dataTransfer?.getData('text/plain')
        if (diskSize) {
          peg.dispatchEvent(new CustomEvent('disk-drop', {
            detail: { diskSize: parseInt(diskSize), pegIndex: i },
            bubbles: true
          }))
        }
      })

      this.gameBoard.appendChild(peg)
      this.pegs.push(peg)
    }

    // Status hint bar
    this.statusHintEl = document.createElement('div')
    this.statusHintEl.className = 'status-hint'
    gameArea.appendChild(this.statusHintEl)

    this.container.appendChild(gameArea)

    // Live region for screen reader announcements
    this.liveRegion = document.createElement('div')
    this.liveRegion.className = 'sr-only'
    this.liveRegion.setAttribute('aria-live', 'polite')
    this.liveRegion.setAttribute('aria-atomic', 'true')
    this.container.appendChild(this.liveRegion)

    // Stats bar ( consolidated )
    this.statsEl = document.createElement('div')
    this.statsEl.className = 'stats-bar'
    this.container.appendChild(this.statsEl)

    // Bottom controls
    const bottomControls = document.createElement('div')
    bottomControls.className = 'bottom-controls'
    bottomControls.innerHTML = `
      <button class="control-btn undo-btn" disabled title="${t('undo')}">
        <span class="icon">↩</span>
        <span class="label">${t('undo')}</span>
      </button>
      <button class="control-btn redo-btn" disabled title="${t('redo')}">
        <span class="icon">↪</span>
        <span class="label">${t('redo')}</span>
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

    // Best record (collapsed by default)
    this.bestRecordEl = document.createElement('div')
    this.bestRecordEl.className = 'best-record'
    this.container.appendChild(this.bestRecordEl)

    // Error toast
    this.errorToastEl = document.createElement('div')
    this.errorToastEl.className = 'error-toast'
    this.container.appendChild(this.errorToastEl)

    // Tutorial overlay
    if (this.shouldShowTutorial) {
      this.createTutorialOverlay()
    }

    // Rules modal
    this.createRulesModal()

    // Victory modal
    this.createVictoryModal()

    // Confirm modal
    this.createConfirmModal()

    // Statistics modal
    this.createStatsModal()
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
        <div class="tutorial-demo-hint">${t('tutorialDemoHint')}</div>
        <div class="tutorial-actions">
          <button class="tutorial-btn secondary tutorial-skip">${t('tutorialSkip')}</button>
          <button class="tutorial-btn secondary tutorial-demo">${t('tutorialDemo')}</button>
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
          ${(t('rulesContent') as string[]).map(rule => `<li>${rule}</li>`).join('')}
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
        <div class="star-result"></div>
        <p class="victory-message"></p>
        <div class="new-record-badge hidden">${t('newRecord')}</div>
        <div class="fireworks"></div>
        <div class="victory-actions">
          <button class="play-again-btn secondary">${t('playAgain')}</button>
          <button class="next-level-btn primary">${t('nextLevel')}</button>
        </div>
      </div>
    `
    this.container.appendChild(modal)
  }

  private createConfirmModal(): void {
    const modal = document.createElement('div')
    modal.className = 'confirm-modal hidden'
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content confirm-content">
        <p class="confirm-message"></p>
        <div class="confirm-actions">
          <button class="confirm-btn secondary confirm-cancel">${t('cancel')}</button>
          <button class="confirm-btn primary confirm-ok">${t('close')}</button>
        </div>
      </div>
    `
    this.container.appendChild(modal)
  }

  private createStatsModal(): void {
    const modal = document.createElement('div')
    modal.className = 'stats-modal hidden'
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content stats-content">
        <h2>Statistics</h2>
        <div class="stats-summary"></div>
        <div class="stats-grid"></div>
        <button class="modal-close stats-close">${t('close')}</button>
      </div>
    `
    this.container.appendChild(modal)
  }

  showStats(): void {
    const modal = this.container.querySelector('.stats-modal')
    const summaryEl = modal?.querySelector('.stats-summary')
    const gridEl = modal?.querySelector('.stats-grid')

    if (!modal || !summaryEl || !gridEl) return

    const records = getAllRecords()
    const totals = getTotalStats()
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'harder', 'expert', 'master', 'grandmaster']

    // Summary section
    summaryEl.innerHTML = `
      <div class="summary-item">
        <span class="summary-value">${totals.totalGames}</span>
        <span class="summary-label">Games Completed</span>
      </div>
      <div class="summary-item">
        <span class="summary-value">${totals.averageStars.toFixed(1)}</span>
        <span class="summary-label">Avg Stars</span>
      </div>
    `

    // Grid section
    gridEl.innerHTML = difficulties.map(diff => {
      const record = records[diff] || { completedCount: 0, bestStars: 0, bestTime: null, bestMoves: null }
      const stars = record.bestStars > 0 ? '★'.repeat(record.bestStars) : '-'
      return `
        <div class="stats-row ${isDifficultyUnlocked(diff) ? '' : 'locked'}">
          <span class="stats-diff">${t(diff)}</span>
          <span class="stats-count">${record.completedCount}x</span>
          <span class="stats-best-stars">${stars}</span>
          <span class="stats-best-time">${record.bestTime !== null ? formatTime(record.bestTime) : '-'}</span>
          <span class="stats-best-moves">${record.bestMoves !== null ? record.bestMoves : '-'}</span>
        </div>
      `
    }).join('')

    modal.classList.remove('hidden')
  }

  hideStats(): void {
    const modal = this.container.querySelector('.stats-modal')
    modal?.classList.add('hidden')
  }

  private updateTutorial(_gameState: GameState): void {
    if (!this.shouldShowTutorial) return

    const steps = this.container.querySelectorAll('.tutorial-step')
    steps.forEach((step, index) => {
      step.classList.toggle('active', index === this.tutorialStep)
    })

    const nextBtn = this.container.querySelector('.tutorial-next') as HTMLButtonElement
    if (nextBtn) {
      nextBtn.textContent = this.tutorialStep === 3 ? t('tutorialStart') as string : '→'
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
    this.shouldShowTutorial = false
    this.hasSeenTutorial = true
    localStorage.setItem('hanoi-tutorial-seen', 'true')
    const overlay = this.container.querySelector('.tutorial-overlay')
    overlay?.classList.add('hidden')
  }

  showTutorial(): void {
    this.shouldShowTutorial = true
    this.tutorialStep = 0
    const overlay = this.container.querySelector('.tutorial-overlay')
    if (overlay) {
      overlay.classList.remove('hidden')
      // Reset steps
      const steps = overlay.querySelectorAll('.tutorial-step')
      steps.forEach((step, index) => {
        step.classList.toggle('active', index === 0)
      })
      // Reset next button
      const nextBtn = overlay.querySelector('.tutorial-next') as HTMLButtonElement
      if (nextBtn) {
        nextBtn.textContent = t('tutorialStart') as string
        nextBtn.dataset.step = '0'
      }
    }
  }

  showRules(): void {
    const modal = this.container.querySelector('.rules-modal')
    modal?.classList.remove('hidden')
  }

  hideRules(): void {
    const modal = this.container.querySelector('.rules-modal')
    modal?.classList.add('hidden')
  }

  showConfirm(message: string, onConfirm: () => void): void {
    const modal = this.container.querySelector('.confirm-modal')
    const messageEl = modal?.querySelector('.confirm-message')
    if (messageEl) messageEl.textContent = message

    this.pendingAction = onConfirm
    modal?.classList.remove('hidden')
  }

  hideConfirm(): void {
    const modal = this.container.querySelector('.confirm-modal')
    modal?.classList.add('hidden')
    this.pendingAction = null
  }

  showTooltip(element: HTMLElement, message: string): void {
    // Remove existing tooltip
    const existingTooltip = document.querySelector('.tooltip-hint')
    existingTooltip?.remove()

    const tooltip = document.createElement('div')
    tooltip.className = 'tooltip-hint'
    tooltip.textContent = message
    document.body.appendChild(tooltip)

    const rect = element.getBoundingClientRect()
    tooltip.style.left = `${rect.left + rect.width / 2}px`
    tooltip.style.top = `${rect.bottom + 8}px`

    // Show tooltip
    requestAnimationFrame(() => {
      tooltip.classList.add('show')
    })

    // Hide after delay
    setTimeout(() => {
      tooltip.classList.remove('show')
      setTimeout(() => tooltip.remove(), 300)
    }, 2000)
  }

  confirmAction(): void {
    if (this.pendingAction) {
      this.pendingAction()
      this.pendingAction = null
    }
    this.hideConfirm()
  }

  // Cache for disk elements to avoid recreating them
  private diskElements: Map<string, HTMLElement> = new Map()
  private lastDiskCount: number = 0

  private updatePegs(state: GameState): void {
    const { pegs, liftedDisk, diskCount, validTargets } = state

    // Pre-calculate dimensions once
    const maxDiskWidth = Math.min(90, 280 / diskCount)
    const minDiskWidth = Math.max(28, maxDiskWidth * 0.45)
    const widthStep = (maxDiskWidth - minDiskWidth) / (diskCount - 1 || 1)
    const diskHeight = Math.max(18, 144 / diskCount)

    // Clear cache if difficulty changed
    if (this.lastDiskCount !== diskCount) {
      this.diskElements.clear()
      this.lastDiskCount = diskCount
    }

    this.pegs.forEach((pegEl, pegIndex) => {
      // Update visual states
      pegEl.classList.toggle('lifting-from', liftedDisk?.pegIndex === pegIndex)
      pegEl.classList.toggle('valid-target', validTargets.includes(pegIndex) && liftedDisk?.pegIndex !== pegIndex)
      pegEl.classList.toggle('invalid-target', liftedDisk !== null && !validTargets.includes(pegIndex))

      const diskStack = pegEl.querySelector('.disk-stack') as HTMLElement

      // Get expected disk configuration for this peg
      const visibleDisks = pegs[pegIndex].filter((_, diskIndex) => {
        // Skip lifted disk
        if (liftedDisk && liftedDisk.pegIndex === pegIndex && diskIndex === pegs[pegIndex].length - 1) {
          return false
        }
        return true
      })

      // Smart diff: reuse existing disks, only add/remove changed ones
      const existingDisks = Array.from(diskStack.children) as HTMLElement[]
      const existingSizes = existingDisks.map(d => parseInt(d.dataset.size || '0'))
      const expectedSizes = visibleDisks

      // Check if rebuild needed
      const needsRebuild = existingSizes.length !== expectedSizes.length ||
        !existingSizes.every((size, i) => size === expectedSizes[i])

      if (needsRebuild) {
        // Instead of innerHTML='', we'll diff and update
        const newDiskElements: HTMLElement[] = []

        expectedSizes.forEach((diskSize, diskIndex) => {
          const cacheKey = `${diskSize}-${diskCount}`
          let disk = this.diskElements.get(cacheKey)

          if (!disk) {
            disk = this.createDiskElement(diskSize, diskIndex, minDiskWidth, widthStep, diskHeight, pegIndex, diskCount)
            this.diskElements.set(cacheKey, disk.cloneNode(true) as HTMLElement)
          } else {
            // Clone from cache and update position
            disk = disk.cloneNode(true) as HTMLElement
            disk.style.bottom = `${diskIndex * (diskHeight + 3)}px`
            disk.dataset.peg = String(pegIndex)
          }

          newDiskElements.push(disk)
        })

        // Efficient DOM update
        diskStack.innerHTML = ''
        newDiskElements.forEach(disk => {
          diskStack.appendChild(disk)
          // Add place animation for newly placed disks
          disk.classList.add('placing')
          setTimeout(() => disk.classList.remove('placing'), 300)
        })
      }
    })

    // Update difficulty button states
    this.container.querySelectorAll('.diff-btn').forEach(btn => {
      const btnEl = btn as HTMLElement
      const isActive = btnEl.dataset.difficulty === state.difficulty
      btnEl.classList.toggle('active', isActive)
      btnEl.setAttribute('aria-pressed', String(isActive))
    })
  }

  private createDiskElement(
    diskSize: number,
    diskIndex: number,
    minDiskWidth: number,
    widthStep: number,
    diskHeight: number,
    pegIndex: number,
    diskCount: number
  ): HTMLElement {
    const disk = document.createElement('div')
    disk.className = 'disk'
    disk.dataset.size = String(diskSize)
    disk.dataset.peg = String(pegIndex)
    disk.setAttribute('role', 'listitem')
    disk.setAttribute('aria-label', `Disk ${diskSize}`)
    disk.setAttribute('tabindex', '0')

    // Use color based on disk size for consistency across difficulties
    const colorIndex = (diskSize - 1) % DISK_COLORS.length
    disk.style.backgroundColor = DISK_COLORS[colorIndex]
    disk.style.width = `${minDiskWidth + (diskSize - 1) * widthStep}px`
    disk.style.height = `${diskHeight}px`
    disk.style.bottom = `${diskIndex * (diskHeight + 3)}px`
    disk.style.zIndex = String(diskSize)

    // Add visible number for accessibility (helps colorblind users)
    if (diskCount > 5) {
      const label = document.createElement('span')
      label.className = 'disk-label'
      label.textContent = String(diskSize)
      disk.appendChild(label)
    }

    // Make disk draggable (only top disk of each peg)
    const isTopDisk = diskIndex === diskCount - 1 || diskIndex === 0
    if (isTopDisk) {
      disk.draggable = true
      disk.dataset.draggable = 'true'

      disk.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', String(diskSize))
        e.dataTransfer?.setData('text/peg-index', String(pegIndex))
        disk.classList.add('dragging')
        // Emit custom event for lift
        disk.dispatchEvent(new CustomEvent('disk-lift', {
          detail: { diskSize, pegIndex },
          bubbles: true
        }))
      })

      disk.addEventListener('dragend', () => {
        disk.classList.remove('dragging')
      })
    }

    return disk
  }

  private updateLiftedDisk(state: GameState): void {
    if (this.liftedDiskEl) {
      this.liftedDiskEl.remove()
      this.liftedDiskEl = null
    }

    if (!state.liftedDisk) return

    const { pegIndex, diskSize } = state.liftedDisk
    const pegEl = this.pegs[pegIndex]
    if (!pegEl) return

    const diskCount = state.diskCount
    const maxDiskWidth = Math.min(90, 280 / diskCount)
    const minDiskWidth = Math.max(28, maxDiskWidth * 0.45)
    const widthStep = (maxDiskWidth - minDiskWidth) / (diskCount - 1 || 1)
    const diskHeight = Math.max(18, 144 / diskCount)

    const liftedDisk = document.createElement('div')
    liftedDisk.className = 'disk lifted'
    liftedDisk.dataset.size = String(diskSize)

    const colorIndex = (diskSize - 1) % DISK_COLORS.length
    liftedDisk.style.backgroundColor = DISK_COLORS[colorIndex]
    liftedDisk.style.width = `${minDiskWidth + (diskSize - 1) * widthStep}px`
    liftedDisk.style.height = `${diskHeight}px`
    liftedDisk.style.zIndex = '100'

    const diskStack = pegEl.querySelector('.disk-stack') as HTMLElement
    const stackHeight = state.pegs[pegIndex].length * (diskHeight + 3)
    liftedDisk.style.bottom = `${stackHeight + 25}px`

    diskStack.appendChild(liftedDisk)
    this.liftedDiskEl = liftedDisk
  }

  private updateStats(state: GameState): void {
    if (!this.statsEl) return

    const optimal = Math.pow(2, state.diskCount) - 1
    const current = state.moveCount
    const ratio = current / optimal

    let stars = 0
    if (state.moveCount > 0) {
      if (ratio <= 1.1) stars = 3
      else if (ratio <= 1.5) stars = 2
      else stars = 1
    }

    this.statsEl.innerHTML = `
      <div class="stats-row">
        <div class="stat-item time-stat">
          <span class="stat-label">${t('time')}</span>
          <span class="stat-value">${formatTime(state.elapsedTime)}</span>
        </div>
        <div class="stat-item moves-stat">
          <span class="stat-label">${t('moves')}</span>
          <span class="stat-value">${state.moveCount}/${optimal}</span>
        </div>
        <div class="stat-item stars-stat">
          <span class="stat-label">${t('stars')}</span>
          <span class="stars-display ${stars > 0 ? 'has-stars' : ''}">
            ${[1, 2, 3].map(i => `<span class="star ${i <= stars ? 'filled' : ''}">★</span>`).join('')}
          </span>
        </div>
      </div>
    `
  }

  private updateBestRecord(difficulty: Difficulty): void {
    if (!this.bestRecordEl) return

    const record = getRecord(difficulty)
    const stars = record.bestStars || 0

    this.bestRecordEl.innerHTML = `
      <div class="record-box">
        <span class="record-label">${t('bestTime')}</span>
        <span class="record-value">${record.bestTime !== null ? formatTime(record.bestTime) : '-'}</span>
      </div>
      <div class="record-box">
        <span class="record-label">${t('bestMoves')}</span>
        <span class="record-value">${record.bestMoves !== null ? record.bestMoves : '-'}</span>
      </div>
      <div class="record-box">
        <span class="record-label">${t('stars')}</span>
        <span class="record-value stars">${stars > 0 ? '★'.repeat(stars) : '-'}</span>
      </div>
    `
  }

  private handleActionFeedback(state: GameState): void {
    if (!state.lastAction) return

    // Announce action to screen readers
    let announcement = ''

    switch (state.lastAction) {
      case 'lift':
        announcement = `Lifted disk ${state.liftedDisk?.diskSize || ''}`
        break
      case 'place':
        announcement = `Placed disk. Move ${state.moveCount}`
        break
      case 'invalid':
        this.showError(t('errorInvalidMove') as string)
        announcement = t('errorInvalidMove') as string
        break
      case 'cancel':
        announcement = 'Cancelled'
        break
      case 'undo':
        announcement = 'Undo last move'
        break
      case 'complete':
        announcement = `Victory! Completed in ${state.moveCount} moves`
        break
    }

    if (announcement && this.liveRegion) {
      this.liveRegion.textContent = announcement
    }

    // Clear action after rendering
    setTimeout(() => {
      // This will be called after state is cleared in game
    }, 100)
  }

  showError(message: string): void {
    if (!this.errorToastEl) return

    this.errorToastEl.textContent = message
    this.errorToastEl.classList.add('show')

    setTimeout(() => {
      this.errorToastEl?.classList.remove('show')
    }, 2500)
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

  showVictory(gameState: GameState, stars: number, isNewRecord: boolean): void {
    const modal = this.container.querySelector('.victory-modal')
    const message = modal?.querySelector('.victory-message')
    const badge = modal?.querySelector('.new-record-badge')
    const starResult = modal?.querySelector('.star-result')

    if (starResult) {
      starResult.innerHTML = `
        <div class="final-stars">
          ${[1, 2, 3].map(i => `
            <span class="final-star ${i <= stars ? 'filled' : ''}">★</span>
          `).join('')}
        </div>
        <div class="star-label">${t(['perfect', 'good', 'completed'][3 - stars] as keyof I18n) as string}</div>
      `
    }

    if (message) {
      const difficultyLabel = t(gameState.difficulty) as string
      const timeStr = formatTime(gameState.elapsedTime)
      const movesStr = String(gameState.moveCount)

      // Build victory message safely with textContent to prevent XSS
      const victoryText = t('victoryMessage') as string
      const parts = victoryText.split(/{difficulty}|{moves}|{time}/g)
      const placeholders: string[] = []
      let match
      const regex = /{difficulty}|{moves}|{time}/g
      while ((match = regex.exec(victoryText)) !== null) {
        placeholders.push(match[0])
      }

      message.innerHTML = ''
      parts.forEach((part, i) => {
        message!.appendChild(document.createTextNode(part))
        if (i < placeholders.length) {
          const strong = document.createElement('strong')
          if (placeholders[i] === '{difficulty}') strong.textContent = difficultyLabel
          else if (placeholders[i] === '{moves}') strong.textContent = movesStr
          else if (placeholders[i] === '{time}') strong.textContent = timeStr
          message!.appendChild(strong)
        }
      })
    }

    badge?.classList.toggle('hidden', !isNewRecord)

    // First trigger fullscreen fireworks, then show modal after delay
    this.triggerFullscreenFireworks()

    // Delay modal appearance for dramatic effect
    setTimeout(() => {
      modal?.classList.remove('hidden')
    }, 800)
  }

  hideVictory(): void {
    this.clearFireworks()
    const modal = this.container.querySelector('.victory-modal')
    modal?.classList.add('hidden')
  }

  private clearFireworks(): void {
    this.fireworksTimeouts.forEach(id => clearTimeout(id))
    this.fireworksTimeouts = []
  }

  private triggerFullscreenFireworks(): void {
    // Create fullscreen fireworks container
    let fireworksContainer = document.getElementById('fullscreen-fireworks')
    if (!fireworksContainer) {
      fireworksContainer = document.createElement('div')
      fireworksContainer.id = 'fullscreen-fireworks'
      fireworksContainer.className = 'fullscreen-fireworks'
      document.body.appendChild(fireworksContainer)
    }

    // Clear any existing fireworks
    this.clearFireworks()
    fireworksContainer.innerHTML = ''
    fireworksContainer.classList.remove('hidden')

    // Launch multiple bursts
    for (let i = 0; i < 50; i++) {
      const timeoutId = window.setTimeout(() => {
        const firework = document.createElement('div')
        firework.className = 'firework fullscreen'
        firework.style.left = `${10 + Math.random() * 80}%`
        firework.style.top = `${10 + Math.random() * 80}%`
        firework.style.backgroundColor = DISK_COLORS[Math.floor(Math.random() * DISK_COLORS.length)]
        fireworksContainer!.appendChild(firework)

        const cleanupId = window.setTimeout(() => firework.remove(), 1500)
        this.fireworksTimeouts.push(cleanupId)
      }, i * 60)
      this.fireworksTimeouts.push(timeoutId)
    }

    // Hide container after animation
    const hideId = window.setTimeout(() => {
      fireworksContainer?.classList.add('hidden')
    }, 4000)
    this.fireworksTimeouts.push(hideId)
  }

  setUndoEnabled(enabled: boolean): void {
    const undoBtn = this.container.querySelector('.undo-btn') as HTMLButtonElement
    if (undoBtn) undoBtn.disabled = !enabled
  }

  setRedoEnabled(enabled: boolean): void {
    const redoBtn = this.container.querySelector('.redo-btn') as HTMLButtonElement
    if (redoBtn) redoBtn.disabled = !enabled
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
      validTargets: [],
      lastAction: null
    }
  }
}
