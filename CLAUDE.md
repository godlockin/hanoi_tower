# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a pure frontend Hanoi Tower (汉诺塔) game designed for deployment on Cloudflare Pages.

### Requirements (from sys_init/目标设定.md)

1. **Adjustable difficulty** - Players can select different difficulty levels
2. **Cloudflare deployment** - Must be deployable to Cloudflare Pages
3. **Timer feature** - Game includes a timing mechanism

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Cloudflare Pages
npm run deploy
```

## Project Structure

```
/
├── public/           # Static assets (favicon, images)
├── src/
│   ├── main.ts       # Entry point, event handlers
│   ├── game.ts       # Hanoi Tower game logic and state
│   ├── renderer.ts   # UI rendering and animations
│   ├── types.ts      # TypeScript type definitions
│   ├── i18n.ts       # Internationalization (zh/en)
│   ├── storage.ts    # LocalStorage for best records
│   └── styles.css    # Game styling
├── index.html        # Main HTML file with loading animation
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── vite.config.ts    # Vite build configuration
└── wrangler.toml     # Cloudflare Pages configuration
```

## Game Mechanics

### Rules
- Move all disks from the leftmost peg to the rightmost peg
- Only one disk can be moved at a time
- A larger disk cannot be placed on top of a smaller disk

### Difficulty Levels
| Level  | Disks | Optimal Moves |
|--------|-------|---------------|
| Easy   | 3     | 7             |
| Medium | 5     | 31            |
| Hard   | 7     | 127           |
| Master | 9     | 511           |

### Controls
- **Click source peg** → Select top disk
- **Click target peg** → Move disk (or flash red if invalid)
- **Undo** → Reverse last move (unlimited)
- **Hint** → Highlight recommended target peg
- **Reset** → Restart current difficulty

### Data Persistence
Best records (time, moves, completion count, timestamp) are stored per difficulty in localStorage.

## Architecture Notes

### Game Loop
1. `HanoiGame` manages state and rules
2. `Renderer` handles DOM updates and animations
3. `main.ts` wires events between them

### Key Features
- **Animations**: Jump-style disk movement, red flash for invalid moves, fireworks on victory
- **i18n**: Toggle between Chinese (default) and English
- **Responsive**: Adapts to mobile/desktop screens
- **Optimal solution**: Pre-calculated for hint system using recursive algorithm

### Type Safety
- All state changes flow through `HanoiGame`
- `Renderer` is pure view layer
- Strict TypeScript configuration enabled
