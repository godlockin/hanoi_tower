import type { Difficulty, BestRecord } from './types'

const STORAGE_KEY = 'hanoi-tower-records-v2'

function getDefaultRecord(): BestRecord {
  return {
    bestTime: null,
    bestMoves: null,
    bestStars: 0,
    completedCount: 0,
    lastCompletedAt: null
  }
}

export function getRecord(difficulty: Difficulty): BestRecord {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return getDefaultRecord()

    const records = JSON.parse(data) as Record<Difficulty, BestRecord>
    return records[difficulty] || getDefaultRecord()
  } catch (e) {
    console.warn('Failed to load records:', e)
    return getDefaultRecord()
  }
}

export function saveRecord(
  difficulty: Difficulty,
  time: number,
  moves: number,
  stars: number
): { isNewBestTime: boolean; isNewBestMoves: boolean; isNewBestStars: boolean } {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    const records: Record<Difficulty, BestRecord> = data
      ? JSON.parse(data)
      : {} as Record<Difficulty, BestRecord>

    const current = records[difficulty] || getDefaultRecord()

    const isNewBestTime = current.bestTime === null || time < current.bestTime
    const isNewBestMoves = current.bestMoves === null || moves < current.bestMoves
    const isNewBestStars = stars > current.bestStars

    records[difficulty] = {
      bestTime: isNewBestTime ? time : current.bestTime,
      bestMoves: isNewBestMoves ? moves : current.bestMoves,
      bestStars: isNewBestStars ? stars : current.bestStars,
      completedCount: current.completedCount + 1,
      lastCompletedAt: new Date().toISOString()
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))

    return { isNewBestTime, isNewBestMoves, isNewBestStars }
  } catch (e) {
    console.error('Failed to save record:', e)
    return { isNewBestTime: false, isNewBestMoves: false, isNewBestStars: false }
  }
}

export function clearAllRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function exportRecords(): string {
  const data = localStorage.getItem(STORAGE_KEY)
  return data || '{}'
}

export function importRecords(data: string): boolean {
  try {
    JSON.parse(data)
    localStorage.setItem(STORAGE_KEY, data)
    return true
  } catch {
    return false
  }
}

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'harder', 'expert', 'master', 'grandmaster']

export function getAllRecords(): Record<Difficulty, BestRecord> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
      return DIFFICULTY_ORDER.reduce((acc, diff) => {
        acc[diff] = getDefaultRecord()
        return acc
      }, {} as Record<Difficulty, BestRecord>)
    }
    return JSON.parse(data) as Record<Difficulty, BestRecord>
  } catch (e) {
    console.warn('Failed to load all records:', e)
    return DIFFICULTY_ORDER.reduce((acc, diff) => {
      acc[diff] = getDefaultRecord()
      return acc
    }, {} as Record<Difficulty, BestRecord>)
  }
}

export function getTotalStats(): { totalGames: number; totalCompleted: number; averageStars: number } {
  const records = getAllRecords()
  let totalGames = 0
  let totalStars = 0
  let difficultyWithStars = 0

  DIFFICULTY_ORDER.forEach(diff => {
    const record = records[diff]
    if (record) {
      totalGames += record.completedCount
      if (record.bestStars > 0) {
        totalStars += record.bestStars
        difficultyWithStars++
      }
    }
  })

  return {
    totalGames,
    totalCompleted: totalGames,
    averageStars: difficultyWithStars > 0 ? totalStars / difficultyWithStars : 0
  }
}

export function isDifficultyUnlocked(difficulty: Difficulty): boolean {
  // First difficulty is always unlocked
  if (difficulty === 'easy') return true

  const index = DIFFICULTY_ORDER.indexOf(difficulty)
  if (index <= 0) return true

  // Check if previous difficulty has at least 2 stars
  const prevDifficulty = DIFFICULTY_ORDER[index - 1]
  const prevRecord = getRecord(prevDifficulty)
  return prevRecord.bestStars >= 2
}

export function getMaxUnlockedDifficulty(): Difficulty {
  for (let i = DIFFICULTY_ORDER.length - 1; i >= 0; i--) {
    if (isDifficultyUnlocked(DIFFICULTY_ORDER[i])) {
      return DIFFICULTY_ORDER[i]
    }
  }
  return 'easy'
}

// Session-based game state persistence
const SESSION_KEY = 'hanoi-tower-session'
const THEME_KEY = 'hanoi-tower-theme'

export type Theme = 'dark' | 'light'

export function getTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return 'dark' // default
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme)
  document.documentElement.setAttribute('data-theme', theme)
}

export function initTheme(): void {
  const theme = getTheme()
  document.documentElement.setAttribute('data-theme', theme)
}

interface SessionState {
  difficulty: Difficulty
  pegs: number[][]
  moveCount: number
  elapsedTime: number
  moveHistory: { from: number; to: number }[]
  timestamp: number
}

export function saveSessionState(
  difficulty: Difficulty,
  pegs: number[][],
  moveCount: number,
  elapsedTime: number,
  moveHistory: { from: number; to: number }[]
): void {
  try {
    const state: SessionState = {
      difficulty,
      pegs,
      moveCount,
      elapsedTime,
      moveHistory,
      timestamp: Date.now()
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Failed to save session:', e)
  }
}

export function loadSessionState(): SessionState | null {
  try {
    const data = sessionStorage.getItem(SESSION_KEY)
    if (!data) return null

    const state = JSON.parse(data) as SessionState
    // Only restore if less than 24 hours old
    if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
      clearSessionState()
      return null
    }
    return state
  } catch (e) {
    console.warn('Failed to load session:', e)
    return null
  }
}

export function clearSessionState(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
