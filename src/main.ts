import './styles.css'
import { HanoiGame } from './game'
import { Renderer } from './renderer'
import { toggleLanguage, t } from './i18n'
import { saveRecord, isDifficultyUnlocked, saveSessionState, loadSessionState, clearSessionState, initTheme, setTheme, getTheme, type Theme } from './storage'
import { audio } from './audio'
import type { Difficulty } from './types'

// Initialize theme
initTheme()

// Initialize app
const app = document.querySelector<HTMLDivElement>('#app')!
const renderer = new Renderer(app)

// Try to restore session state
const savedSession = loadSessionState()
let game: HanoiGame = new HanoiGame('easy')

function initializeGame(): void {
  if (savedSession && savedSession.moveCount > 0) {
    // Restore game with saved state
    const restoredGame = new HanoiGame(savedSession.difficulty, {
      pegs: savedSession.pegs,
      moveCount: savedSession.moveCount,
      elapsedTime: savedSession.elapsedTime,
      isPlaying: true
    })
    // Restore move history for undo/redo
    restoredGame.setMoveHistory(savedSession.moveHistory || [])
    game = restoredGame
  }
}

initializeGame()

// Timer interval
let timerInterval: number | null = null
let isGameInProgress = false

// Track if listeners already attached
let listenersAttached = false

// Hint cooldown tracking
let hintCooldown = false
const HINT_COOLDOWN_MS = 5000 // 5 seconds

// Action processing lock for debouncing
let isProcessingAction = false
const ACTION_DEBOUNCE_MS = 150

// Initialize game
function init(): void {
  const loadingScreen = document.getElementById('loading-screen')
  if (loadingScreen) {
    loadingScreen.style.opacity = '0'
    setTimeout(() => loadingScreen.remove(), 300)
  }

  game.setOnStateChange((state) => {
    renderer.render(state)

    // Track if game is in progress for confirmation dialogs
    isGameInProgress = state.isPlaying && !state.isCompleted && state.moveCount > 0

    // Save session state for persistence
    if (state.isPlaying && !state.isCompleted && state.moveCount > 0) {
      const persistable = game.getPersistableState()
      saveSessionState(
        persistable.difficulty,
        persistable.pegs,
        persistable.moveCount,
        persistable.elapsedTime,
        persistable.moveHistory
      )
    }

    // Clear session on completion
    if (state.isCompleted) {
      clearSessionState()
    }

    // Update undo/redo button states
    renderer.setUndoEnabled(state.moveCount > 0)
    renderer.setRedoEnabled(game.canRedo())

    // Clear last action after rendering
    if (state.lastAction) {
      setTimeout(() => game.clearLastAction(), 100)
    }
  })

  renderer.render(game.getState())
  renderer.setUndoEnabled(false)

  // Only attach listeners once
  if (!listenersAttached) {
    setupEventListeners()
    listenersAttached = true
  }

  startTimer()
}

function startTimer(): void {
  if (timerInterval) return
  timerInterval = window.setInterval(() => {
    game.tick()
  }, 1000)
}

function handlePegAction(pegIndex: number, target: HTMLElement): void {
  // Debounce: prevent rapid clicks
  if (isProcessingAction) return
  isProcessingAction = true

  try {
    const state = game.getState()

    // Click on disk to lift, or activate peg if no disk lifted
    if (!state.liftedDisk) {
      // If clicking on a disk, lift from that disk's peg
      if (target.classList.contains('disk')) {
        const diskPegIndex = parseInt(target.dataset.peg || '-1', 10)
        if (diskPegIndex === pegIndex) {
          game.liftDisk(pegIndex)
          audio.playLift()
        }
      } else {
        // Try to lift top disk from this peg
        const result = game.liftDisk(pegIndex)
        if (result.success) {
          audio.playLift()
        }
      }
      return
    }

    // Click on peg to place
    if (state.liftedDisk) {
      const result = game.placeDisk(pegIndex)

      if (result.result === 'placed') {
        audio.playPlace()
      } else if (result.result === 'invalid') {
        audio.playInvalid()
      } else if (result.result === 'completed') {
        audio.playPlace()
        const newState = game.getState()
        const stars = game.getStarRating()
        const { isNewBestTime, isNewBestMoves, isNewBestStars } = saveRecord(
          newState.difficulty,
          newState.elapsedTime,
          newState.moveCount,
          stars
        )
        renderer.showVictory(newState, stars, isNewBestTime || isNewBestMoves || isNewBestStars)
        isGameInProgress = false
        // Delay victory sound slightly
        setTimeout(() => audio.playVictory(), 300)
      }

      renderer.setUndoEnabled(game.getState().moveCount > 0)
    }
  } finally {
    // Release lock after debounce period
    setTimeout(() => {
      isProcessingAction = false
    }, ACTION_DEBOUNCE_MS)
  }
}

function setupEventListeners(): void {
  // Initialize audio on first user interaction (browser requirement)
  const initAudio = () => {
    audio.init()
    app.removeEventListener('click', initAudio)
    app.removeEventListener('keydown', initAudio)
  }
  app.addEventListener('click', initAudio, { once: true })
  app.addEventListener('keydown', initAudio, { once: true })

  // Use event delegation for all app-level interactions
  app.addEventListener('click', (e) => {
    const target = e.target as HTMLElement

    // Difficulty buttons
    if (target.classList.contains('diff-btn')) {
      const difficulty = target.dataset.difficulty as Difficulty
      if (!difficulty) return

      // Check if difficulty is unlocked
      if (!isDifficultyUnlocked(difficulty)) {
        renderer.showTooltip(target as HTMLElement, t('difficultyLockedHint') as string)
        return
      }

      const changeDifficulty = () => {
        game.changeDifficulty(difficulty)
        renderer.setUndoEnabled(false)
        renderer.hideVictory()
        isGameInProgress = false
      }

      if (isGameInProgress) {
        renderer.showConfirm(t('confirmDifficultyChange') as string, changeDifficulty)
      } else {
        changeDifficulty()
      }
      return
    }

    // Theme toggle
    if (target.classList.contains('theme-toggle')) {
      const currentTheme = getTheme()
      const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark'
      setTheme(newTheme)
      target.textContent = newTheme === 'dark' ? '🌙' : '☀️'
      return
    }

    // Audio toggle
    if (target.classList.contains('audio-toggle')) {
      const isEnabled = audio.toggle()
      target.textContent = isEnabled ? '🔊' : '🔇'
      target.setAttribute('aria-pressed', String(isEnabled))
      return
    }

    // Language switch
    if (target.classList.contains('lang-switch')) {
      toggleLanguage()
      const currentState = game.getState()
      renderer.render(currentState)
      renderer.setUndoEnabled(currentState.moveCount > 0)
      return
    }

    // Stats button
    if (target.classList.contains('stats-btn')) {
      renderer.showStats()
      return
    }

    // Stats modal close
    if (target.classList.contains('stats-close')) {
      renderer.hideStats()
      return
    }

    // Help button
    if (target.classList.contains('help-btn')) {
      renderer.showRules()
      return
    }

    // Rules modal close
    if (target.classList.contains('modal-backdrop') || target.classList.contains('modal-close')) {
      renderer.hideRules()
      renderer.hideStats()
      return
    }

    // Tutorial navigation
    if (target.classList.contains('tutorial-next')) {
      const nextStep = parseInt(target.dataset.step || '0') + 1
      renderer.setTutorialStep(nextStep)
      target.dataset.step = String(nextStep)
      return
    }

    if (target.classList.contains('tutorial-skip')) {
      renderer.closeTutorial()
      return
    }

    if (target.classList.contains('tutorial-demo')) {
      runTutorialDemo()
      return
    }

    // Confirm modal
    if (target.classList.contains('confirm-cancel')) {
      renderer.hideConfirm()
      return
    }

    if (target.classList.contains('confirm-ok')) {
      renderer.confirmAction()
      return
    }

    // Peg container or its children
    const pegContainer = target.closest('.peg-container') as HTMLElement
    if (pegContainer) {
      const pegIndex = parseInt(pegContainer.dataset.index || '-1')
      if (pegIndex >= 0) {
        handlePegAction(pegIndex, target)
      }
      return
    }

    // Undo button
    const undoBtn = target.closest('.undo-btn') as HTMLButtonElement
    if (undoBtn) {
      if (undoBtn.disabled) {
        // Show tooltip when clicking disabled undo
        renderer.showTooltip(undoBtn, t('undoDisabledHint') as string)
      } else {
        game.undo()
        audio.playUndo()
      }
      return
    }

    // Redo button
    const redoBtn = target.closest('.redo-btn') as HTMLButtonElement
    if (redoBtn) {
      if (redoBtn.disabled) {
        renderer.showTooltip(redoBtn, t('redoDisabledHint') as string)
      } else {
        game.redo()
        audio.playPlace()
      }
      return
    }

    // Hint button
    if (target.closest('.hint-btn')) {
      if (hintCooldown) {
        renderer.showTooltip(target as HTMLElement, t('hintCooldownHint') as string)
        return
      }

      const hint = game.getHint()
      if (hint) {
        renderer.showHint(hint.from, hint.to)
        audio.playLift() // Use lift sound for hint

        // Start cooldown
        hintCooldown = true
        const hintBtn = target.closest('.hint-btn') as HTMLButtonElement
        if (hintBtn) {
          hintBtn.classList.add('cooldown')
          setTimeout(() => {
            hintCooldown = false
            hintBtn.classList.remove('cooldown')
          }, HINT_COOLDOWN_MS)
        }
      }
      return
    }

    // Reset button
    if (target.closest('.reset-btn')) {
      if (isGameInProgress) {
        renderer.showConfirm(t('confirmReset') as string, () => {
          game.reset()
          renderer.setUndoEnabled(false)
          isGameInProgress = false
        })
      } else {
        game.reset()
        renderer.setUndoEnabled(false)
      }
      return
    }

    // Play again button
    if (target.closest('.play-again-btn')) {
      game.reset()
      renderer.setUndoEnabled(false)
      renderer.hideVictory()
      return
    }

    // Next level button
    if (target.closest('.next-level-btn')) {
      const currentDifficulty = game.getState().difficulty
      const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'harder', 'expert', 'master', 'grandmaster']
      const currentIndex = difficulties.indexOf(currentDifficulty)
      const nextDifficulty = difficulties[currentIndex + 1]

      if (nextDifficulty && isDifficultyUnlocked(nextDifficulty)) {
        game.changeDifficulty(nextDifficulty)
        renderer.setUndoEnabled(false)
        renderer.hideVictory()
        isGameInProgress = false
      } else if (nextDifficulty) {
        // Show hint that next level is locked
        const btn = target.closest('.next-level-btn') as HTMLButtonElement
        renderer.showTooltip(btn, t('difficultyLockedHint') as string)
      } else {
        // All levels completed, loop back to easy
        game.changeDifficulty('easy')
        renderer.setUndoEnabled(false)
        renderer.hideVictory()
        isGameInProgress = false
      }
      return
    }
  })

  // Keyboard support for pegs (Enter/Space)
  app.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement

    if (target.classList.contains('peg-container')) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const pegIndex = parseInt(target.dataset.index || '-1')
        if (pegIndex >= 0) {
          handlePegAction(pegIndex, target)
        }
      }
    }
  })

  // Drag and drop support
  app.addEventListener('disk-lift', ((e: CustomEvent) => {
    const { pegIndex } = e.detail
    const state = game.getState()
    if (!state.liftedDisk) {
      const result = game.liftDisk(pegIndex)
      if (result.success) {
        audio.playLift()
      }
    }
  }) as EventListener)

  app.addEventListener('disk-drop', ((e: CustomEvent) => {
    const { pegIndex } = e.detail
    const state = game.getState()
    if (state.liftedDisk) {
      const result = game.placeDisk(pegIndex)

      if (result.result === 'placed') {
        audio.playPlace()
      } else if (result.result === 'invalid') {
        audio.playInvalid()
      } else if (result.result === 'completed') {
        audio.playPlace()
        const newState = game.getState()
        const stars = game.getStarRating()
        const { isNewBestTime, isNewBestMoves, isNewBestStars } = saveRecord(
          newState.difficulty,
          newState.elapsedTime,
          newState.moveCount,
          stars
        )
        renderer.showVictory(newState, stars, isNewBestTime || isNewBestMoves || isNewBestStars)
        isGameInProgress = false
        setTimeout(() => audio.playVictory(), 300)
      }

      renderer.setUndoEnabled(game.getState().moveCount > 0)
    }
  }) as EventListener)
}

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
  const state = game.getState()

  // Number keys 1-3: Select peg
  if (e.key >= '1' && e.key <= '3') {
    const pegIndex = parseInt(e.key) - 1
    if (!state.liftedDisk) {
      game.liftDisk(pegIndex)
    } else {
      const result = game.placeDisk(pegIndex)
      if (result.result === 'completed') {
        const newState = game.getState()
        const stars = game.getStarRating()
        const { isNewBestTime, isNewBestMoves, isNewBestStars } = saveRecord(
          newState.difficulty,
          newState.elapsedTime,
          newState.moveCount,
          stars
        )
        renderer.showVictory(newState, stars, isNewBestTime || isNewBestMoves || isNewBestStars)
        isGameInProgress = false
      }
      renderer.setUndoEnabled(game.getState().moveCount > 0)
    }
    return
  }

  // Ctrl+Z: Undo, Ctrl+Shift+Z or Ctrl+Y: Redo
  if ((e.key === 'z' || e.key === 'Z') && e.ctrlKey) {
    e.preventDefault()
    if (e.shiftKey) {
      game.redo()
      audio.playPlace()
    } else {
      game.undo()
      audio.playUndo()
    }
    return
  }

  if ((e.key === 'y' || e.key === 'Y') && e.ctrlKey) {
    e.preventDefault()
    game.redo()
    audio.playPlace()
    return
  }

  // U: Undo (legacy)
  if (e.key === 'u' || e.key === 'U') {
    game.undo()
    audio.playUndo()
    return
  }

  // H: Hint
  if (e.key === 'h' || e.key === 'H') {
    const hint = game.getHint()
    if (hint) {
      renderer.showHint(hint.from, hint.to)
    }
    return
  }

  // R: Reset
  if (e.key === 'r' || e.key === 'R') {
    if (isGameInProgress) {
      renderer.showConfirm(t('confirmReset') as string, () => {
        game.reset()
        renderer.setUndoEnabled(false)
        isGameInProgress = false
      })
    } else {
      game.reset()
      renderer.setUndoEnabled(false)
    }
    return
  }

  // Escape: Cancel lifted disk or close modals
  if (e.key === 'Escape') {
    if (state.liftedDisk) {
      game.placeDisk(state.liftedDisk.pegIndex)
    }
    renderer.hideRules()
    renderer.hideConfirm()
    renderer.hideVictory()
    return
  }
})

// Tutorial demo animation
async function runTutorialDemo(): Promise<void> {
  // Close tutorial overlay
  renderer.closeTutorial()

  // Reset game to easy mode for demo
  game.changeDifficulty('easy')
  renderer.setUndoEnabled(false)
  isGameInProgress = false

  // Wait for render
  await new Promise(resolve => setTimeout(resolve, 500))

  // Demo sequence: show a simple move from peg 1 to peg 3
  const demoSteps: Array<
    | { action: 'lift'; peg: number; message: string }
    | { action: 'wait'; duration: number }
    | { action: 'place'; peg: number; message: string }
  > = [
    { action: 'lift', peg: 0, message: t('tutorialDemoLift') as string },
    { action: 'wait', duration: 800 },
    { action: 'place', peg: 2, message: t('tutorialDemoPlace') as string },
  ]

  // Show demo indicator
  const demoIndicator = document.createElement('div')
  demoIndicator.className = 'demo-indicator'
  demoIndicator.textContent = t('tutorialDemoLift') as string
  app.appendChild(demoIndicator)

  for (const step of demoSteps) {
    if (step.action === 'lift') {
      demoIndicator.textContent = step.message
      demoIndicator.classList.add('show')
      game.liftDisk(step.peg)
      audio.playLift()
      await new Promise(resolve => setTimeout(resolve, 600))
    } else if (step.action === 'place') {
      demoIndicator.textContent = step.message
      const result = game.placeDisk(step.peg)
      if (result.result === 'placed') {
        audio.playPlace()
      }
      await new Promise(resolve => setTimeout(resolve, 600))
    } else if (step.action === 'wait') {
      await new Promise(resolve => setTimeout(resolve, step.duration))
    }
  }

  // Hide indicator
  demoIndicator.classList.remove('show')
  setTimeout(() => demoIndicator.remove(), 300)

  // Show tutorial again
  renderer.showTutorial()
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})

document.addEventListener('DOMContentLoaded', init)
