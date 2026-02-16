import { HanoiGame } from './game'

// Test suite for HanoiGame
class GameTester {
  private tests: number = 0
  private passed: number = 0

  test(name: string, fn: () => void): void {
    this.tests++
    try {
      fn()
      this.passed++
      console.log(`✓ ${name}`)
    } catch (e) {
      console.error(`✗ ${name}: ${e}`)
    }
  }

  assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(message)
    }
  }

  report(): void {
    console.log(`\nTests: ${this.passed}/${this.tests} passed`)
  }
}

const tester = new GameTester()

// Test 1: Initial state
tester.test('Initial state - easy difficulty', () => {
  const game = new HanoiGame('easy')
  const state = game.getState()

  tester.assert(state.difficulty === 'easy', 'Difficulty should be easy')
  tester.assert(state.diskCount === 3, 'Should have 3 disks')
  tester.assert(state.pegs[0].length === 3, 'First peg should have 3 disks')
  tester.assert(state.pegs[1].length === 0, 'Second peg should be empty')
  tester.assert(state.pegs[2].length === 0, 'Third peg should be empty')
  tester.assert(state.moveCount === 0, 'Move count should be 0')
  tester.assert(state.liftedDisk === null, 'No disk should be lifted')
})

// Test 2: Disk lifting
tester.test('Lift top disk from first peg', () => {
  const game = new HanoiGame('easy')
  const result = game.liftDisk(0)

  tester.assert(result === true, 'Should successfully lift disk')
  const state = game.getState()
  tester.assert(state.liftedDisk !== null, 'Should have lifted disk')
  tester.assert(state.liftedDisk?.pegIndex === 0, 'Lifted disk should be from peg 0')
  tester.assert(state.liftedDisk?.diskSize === 1, 'Should lift smallest disk (size 1)')
})

// Test 3: Cannot lift from empty peg
tester.test('Cannot lift from empty peg', () => {
  const game = new HanoiGame('easy')
  const result = game.liftDisk(1)

  tester.assert(result === false, 'Should fail to lift from empty peg')
})

// Test 4: Cannot lift when already lifting
tester.test('Cannot lift when already lifting a disk', () => {
  const game = new HanoiGame('easy')
  game.liftDisk(0)
  const result = game.liftDisk(1)

  tester.assert(result === false, 'Should fail to lift when already lifting')
})

// Test 5: Place disk on empty peg
tester.test('Place disk on empty peg', () => {
  const game = new HanoiGame('easy')
  game.liftDisk(0)
  const result = game.placeDisk(1)

  tester.assert(result === 'placed', 'Should place disk successfully')
  const state = game.getState()
  tester.assert(state.pegs[0].length === 2, 'First peg should have 2 disks')
  tester.assert(state.pegs[1].length === 1, 'Second peg should have 1 disk')
  tester.assert(state.liftedDisk === null, 'No disk should be lifted after placing')
  tester.assert(state.moveCount === 1, 'Move count should be 1')
})

// Test 6: Cannot place larger disk on smaller disk
tester.test('Cannot place larger disk on smaller disk', () => {
  const game = new HanoiGame('easy')
  // Move disk 1 from peg 0 to peg 1
  game.liftDisk(0)
  game.placeDisk(1)
  // Try to move disk 2 from peg 0 to peg 1 (where disk 1 is)
  game.liftDisk(0)
  const result = game.placeDisk(1)

  tester.assert(result === 'invalid', 'Should not allow invalid move')
  const state = game.getState()
  tester.assert(state.pegs[0].length === 2, 'Disk should stay on original peg')
  tester.assert(state.pegs[1].length === 1, 'Target peg should be unchanged')
})

// Test 7: Cancel lift by clicking same peg
tester.test('Cancel lift by clicking same peg', () => {
  const game = new HanoiGame('easy')
  game.liftDisk(0)
  const result = game.placeDisk(0)

  tester.assert(result === 'cancelled', 'Should cancel lift')
  const state = game.getState()
  tester.assert(state.liftedDisk === null, 'No disk should be lifted')
  tester.assert(state.pegs[0].length === 3, 'All disks should still be on peg 0')
})

// Test 8: Complete game (3 disks - minimum 7 moves)
tester.test('Complete 3-disk game', () => {
  const game = new HanoiGame('easy')
  const moves = [
    [0, 2], [0, 1], [2, 1], // Move 1, 2, 3
    [0, 2], [1, 0], [1, 2], // Move 4, 5, 6
    [0, 2]                  // Move 7
  ]

  for (const [from, to] of moves) {
    game.liftDisk(from)
    const result = game.placeDisk(to)
    if (result === 'completed') break
  }

  const state = game.getState()
  tester.assert(state.isCompleted === true, 'Game should be completed')
  tester.assert(state.pegs[2].length === 3, 'All disks should be on last peg')
  tester.assert(state.moveCount === 7, 'Should take 7 moves')
})

// Test 9: Undo move
tester.test('Undo last move', () => {
  const game = new HanoiGame('easy')
  game.liftDisk(0)
  game.placeDisk(1)

  const stateBefore = game.getState()
  tester.assert(stateBefore.moveCount === 1, 'Should have 1 move')

  const undone = game.undo()
  tester.assert(undone === true, 'Should successfully undo')

  const state = game.getState()
  tester.assert(state.moveCount === 0, 'Move count should be 0 after undo')
  tester.assert(state.pegs[0].length === 3, 'All disks should be back on peg 0')
  tester.assert(state.pegs[1].length === 0, 'Peg 1 should be empty')
})

// Test 10: Change difficulty
tester.test('Change difficulty updates disk count', () => {
  const game = new HanoiGame('easy')
  game.changeDifficulty('medium')

  const state = game.getState()
  tester.assert(state.difficulty === 'medium', 'Difficulty should be medium')
  tester.assert(state.diskCount === 5, 'Should have 5 disks')
  tester.assert(state.pegs[0].length === 5, 'First peg should have 5 disks')
})

// Test 11: Hint provides valid move
tester.test('Hint provides valid move', () => {
  const game = new HanoiGame('easy')
  const hint = game.getHint()

  tester.assert(hint !== null, 'Should provide a hint')
  tester.assert(hint?.from === 0, 'First hint should be from peg 0')
  tester.assert(hint?.to === 2, 'First hint should be to peg 2')
})

// Test 12: Timer starts on first move
tester.test('Timer starts on first move', () => {
  const game = new HanoiGame('easy')
  tester.assert(game.getState().isPlaying === false, 'Should not be playing initially')

  game.liftDisk(0)
  game.placeDisk(1)

  tester.assert(game.getState().isPlaying === true, 'Should be playing after first move')
})

// Test 13: Reset game
tester.test('Reset game restores initial state', () => {
  const game = new HanoiGame('easy')
  game.liftDisk(0)
  game.placeDisk(1)
  game.reset()

  const state = game.getState()
  tester.assert(state.moveCount === 0, 'Move count should be 0')
  tester.assert(state.pegs[0].length === 3, 'All disks on peg 0')
  tester.assert(state.pegs[1].length === 0, 'Peg 1 empty')
  tester.assert(state.liftedDisk === null, 'No lifted disk')
})

// Run all tests
tester.report()

// Export for possible module use
export { tester }
