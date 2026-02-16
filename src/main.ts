import './styles.css'
import { HanoiGame } from './game'
import { Renderer } from './renderer'
import { toggleLanguage } from './i18n'
import { saveRecord } from './storage'
import type { Difficulty } from './types'

// Initialize
const app = document.querySelector<HTMLDivElement>('#app')!
const renderer = new Renderer(app)
let game = new HanoiGame('easy')

// Timer interval
let timerInterval: number | null = null

// Initialize game
function init(): void {
  // Remove loading screen
  const loadingScreen = document.getElementById('loading-screen')
  if (loadingScreen) {
    loadingScreen.style.opacity = '0'
    setTimeout(() => loadingScreen.remove(), 300)
  }

  // Set up state change callback to re-render UI
  game.setOnStateChange((state) => {
    renderer.render(state)
  })

  // Initial render
  renderer.render(game.getState())
  renderer.setUndoEnabled(false)

  // Setup event listeners
  setupEventListeners()

  // Start timer
  startTimer()
}

function startTimer(): void {
  if (timerInterval) return
  timerInterval = window.setInterval(() => {
    game.tick()
  }, 1000)
}

function setupEventListeners(): void {
  // Difficulty buttons
  app.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const difficulty = (e.target as HTMLElement).dataset.difficulty as Difficulty
      if (difficulty) {
        game.changeDifficulty(difficulty)
        renderer.setUndoEnabled(false)
        renderer.hideVictory()
      }
    })
  })

  // Language switch
  app.querySelector('.lang-switch')?.addEventListener('click', () => {
    toggleLanguage()
    // Re-render with current state
    const currentState = game.getState()
    renderer.render(currentState)
    renderer.setUndoEnabled(currentState.moveCount > 0)
  })

  // Disk click (lift) and peg click (place)
  app.querySelectorAll('.peg-container').forEach((peg, pegIndex) => {
    peg.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const state = game.getState()

      // Check if clicking on a disk (to lift it)
      if (target.classList.contains('disk') && !state.liftedDisk) {
        const diskPegIndex = parseInt(target.dataset.peg || '-1', 10)

        // Only allow lifting the top disk of the peg
        if (diskPegIndex === pegIndex) {
          game.liftDisk(pegIndex)
        }
        return
      }

      // If we have a lifted disk, try to place it
      if (state.liftedDisk) {
        const result = game.placeDisk(pegIndex)

        if (result === 'completed') {
          const newState = game.getState()
          const { isNewBestTime, isNewBestMoves } = saveRecord(
            newState.difficulty,
            newState.elapsedTime,
            newState.moveCount
          )
          renderer.showVictory(newState, isNewBestTime || isNewBestMoves)
        }

        renderer.setUndoEnabled(game.getState().moveCount > 0)
        return
      }

      // If no lifted disk and clicking on empty area of peg, do nothing
    })
  })

  // Undo button
  app.querySelector('.undo-btn')?.addEventListener('click', () => {
    game.undo()
    renderer.setUndoEnabled(game.getState().moveCount > 0)
  })

  // Hint button
  app.querySelector('.hint-btn')?.addEventListener('click', () => {
    const hint = game.getHint()
    if (hint) {
      renderer.showHint(hint.from, hint.to)
    }
  })

  // Reset button
  app.querySelector('.reset-btn')?.addEventListener('click', () => {
    game.reset()
    renderer.setUndoEnabled(false)
    renderer.hideVictory()
  })

  // Play again button
  app.querySelector('.play-again-btn')?.addEventListener('click', () => {
    game.reset()
    renderer.setUndoEnabled(false)
    renderer.hideVictory()
  })
}

// Wait for DOM ready
document.addEventListener('DOMContentLoaded', init)
