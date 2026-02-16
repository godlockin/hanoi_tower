import type { Difficulty, BestRecord } from './types'

const STORAGE_KEY = 'hanoi-tower-records'

function getDefaultRecord(): BestRecord {
  return {
    bestTime: null,
    bestMoves: null,
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
  } catch {
    return getDefaultRecord()
  }
}

export function saveRecord(
  difficulty: Difficulty,
  time: number,
  moves: number
): { isNewBestTime: boolean; isNewBestMoves: boolean } {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    const records: Record<Difficulty, BestRecord> = data
      ? JSON.parse(data)
      : {} as Record<Difficulty, BestRecord>

    const current = records[difficulty] || getDefaultRecord()

    const isNewBestTime = current.bestTime === null || time < current.bestTime
    const isNewBestMoves = current.bestMoves === null || moves < current.bestMoves

    records[difficulty] = {
      bestTime: isNewBestTime ? time : current.bestTime,
      bestMoves: isNewBestMoves ? moves : current.bestMoves,
      completedCount: current.completedCount + 1,
      lastCompletedAt: new Date().toISOString()
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))

    return { isNewBestTime, isNewBestMoves }
  } catch {
    return { isNewBestTime: false, isNewBestMoves: false }
  }
}

export function clearAllRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
}
