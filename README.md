# Riichi Tracker

> A personal fork of [1Computer1/riichi-tracker](https://github.com/1Computer1/riichi-tracker), licensed under AGPL-3.0-only.
> Live at <https://albertree.com/riichi-tracker/>.

A riichi mahjong hand calculator and interactive compass.
Also includes a reference for yaku and scoring.

## Features

- Works on desktop and mobile!
- Offline-usable progressive web app.
- Theme (light and dark) switcher.

### Calculator

- Interactive meld creation
- Disallow invalid hands
- Sanma score distributions
- Han and fu calculator
- House rules configuration
  - Pao points distribution
  - Zero or three red fives
  - Optional and local yaku
  - Other scoring variations

### Compass

- Automatic score transfers with calculator
- Riichi sticks and repeat sticks
- Exhaustive and abortive draws
- Sanma compass

### Reference

- Tile reference
- Yaku reference with examples and filters
- Scoring table and scoring formula

## Deploying

```sh
npm run deploy
```

Builds and force-pushes `dist/` to the `gh-pages` branch, which GitHub Pages
serves at <https://albertree.com/riichi-tracker/>.
