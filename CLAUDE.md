# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A pure frontend Hanoi Tower (汉诺塔) game designed for Cloudflare Pages deployment.

**Live URL**: https://b674466f.hanoi-tower.pages.dev

### Core Features
- 4 difficulty levels: Easy (3 disks), Medium (5), Hard (7), Master (9)
- Click-to-lift, click-to-place interaction model
- Interactive tutorial for first-time users
- Valid target highlighting (green pulse animation)
- Undo, Hint, Reset controls
- Bilingual support (Chinese/English)
- LocalStorage persistence for best records

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Cloudflare Pages
npm run deploy
```

## Project Structure

```
src/
├── main.ts       # Entry point, event handlers, game loop
├── game.ts       # HanoiGame class - state management and rules
├── renderer.ts   # Renderer class - DOM manipulation and UI
├── types.ts      # TypeScript interfaces and types
├── i18n.ts       # Internationalization (zh/en)
├── storage.ts    # LocalStorage for best records
└── styles.css    # Complete UI styling

public/
└── hanoi.svg     # Favicon

index.html        # Main HTML with loading animation
package.json      # Dependencies: vite, typescript, wrangler
tsconfig.json     # Strict TypeScript config
vite.config.ts    # Vite build configuration
wrangler.toml     # Cloudflare Pages configuration
```

## Architecture

### State Flow
```
User Action → main.ts → game.ts (update state) → renderer.ts (re-render UI)
                           ↓
                    LocalStorage (persist records)
```

### Key Classes

**HanoiGame** (`game.ts`)
- Manages game state (pegs, disks, moves, timer)
- Validates moves according to Hanoi Tower rules
- Calculates valid target pegs for visual feedback
- Maintains move history for undo functionality
- Pre-calculates optimal solution for hints

**Renderer** (`renderer.ts`)
- Creates and updates DOM elements
- Handles tutorial overlay and modals
- Calculates disk dimensions based on difficulty
- Manages visual states (lifted, valid-target, etc.)

### State Interface
```typescript
interface GameState {
  pegs: number[][]              // 3 pegs, each with disk sizes
  difficulty: Difficulty        // easy | medium | hard | master
  diskCount: number
  moveCount: number
  elapsedTime: number           // seconds
  isPlaying: boolean
  isCompleted: boolean
  liftedDisk: { pegIndex: number; diskSize: number } | null
  validTargets: number[]        // Pegs where disk can be placed
}
```

## Interaction Model

1. **Lift**: Click top disk of a peg → disk floats up with glow effect
2. **Visual Feedback**: Valid target pegs pulse green, invalid ones dim
3. **Place**: Click target peg → disk moves, timer starts on first move
4. **Cancel**: Click same peg to drop disk back

## Known Issues (Post-Expert Review)

### Performance
- [ ] Full DOM rebuild on every state change (should use incremental updates)
- [ ] Timer interval not cleaned up on page unload

### UX
- [ ] Two-stage click interaction less intuitive than drag-and-drop
- [ ] Invalid moves have weak feedback (just cancels lift)
- [ ] Difficulty switch has no confirmation (can lose progress)

### Design
- [ ] Disk colors lack contrast in higher difficulties
- [ ] Color system needs design tokens overhaul
- [ ] Mobile click targets too small

### Code Quality
- [ ] Renderer class has too many responsibilities
- [ ] Type assertions needed for i18n return values
- [ ] Magic numbers in disk sizing calculations

## Future Improvements

### P0 - Critical
- Drag-and-drop interaction
- Star rating system (3 stars for optimal moves)
- Progressive difficulty (add 4, 6, 8 disk levels)

### P1 - Features
- Sound effects
- Achievement system
- Daily challenges
- Global leaderboard

### P2 - Polish
- Theme unlocks
- Better mobile touch targets
- Haptic feedback
- Share results

## Tech Stack Notes

- **Vite**: Fast dev server, optimized builds
- **TypeScript**: Strict mode enabled
- **No frameworks**: Vanilla TS for minimal bundle size
- **Cloudflare Pages**: Edge deployment, automatic HTTPS

## Deployment

Current branch `miao` auto-deploys to:
https://b674466f.hanoi-tower.pages.dev

Wrangler config in `wrangler.toml`:
```toml
name = "hanoi-tower"
compatibility_date = "2024-01-01"
pages_build_output_dir = "./dist"
```
