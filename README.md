# [React](https://react.dev/) &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/facebook/react/blob/main/LICENSE) [![npm version](https://img.shields.io/npm/v/react.svg?style=flat)](https://www.npmjs.com/package/react) [![(Runtime) Build and Test](https://github.com/facebook/react/actions/workflows/runtime_build_and_test.yml/badge.svg)](https://github.com/facebook/react/actions/workflows/runtime_build_and_test.yml) [![(Compiler) TypeScript](https://github.com/facebook/react/actions/workflows/compiler_typescript.yml/badge.svg?branch=main)](https://github.com/facebook/react/actions/workflows/compiler_typescript.yml) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://legacy.reactjs.org/docs/how-to-contribute.html#your-first-pull-request)

React is a JavaScript library for building user interfaces.

* **Declarative:** React makes it painless to create interactive UIs. Design simple views for each state in your application, and React will efficiently update and render just the right components when your data changes. Declarative views make your code more predictable, simpler to understand, and easier to debug.
* **Component-Based:** Build encapsulated components that manage their own state, then compose them to make complex UIs. Since component logic is written in JavaScript instead of templates, you can easily pass rich data through your app and keep the state out of the DOM.
* **Learn Once, Write Anywhere:** We don't make assumptions about the rest of your technology stack, so you can develop new features in React without rewriting existing code. React can also render on the server using [Node](https://nodejs.org/en) and power mobile apps using [React Native](https://reactnative.dev/).

[Learn how to use React in your project](https://react.dev/learn).

## Installation

React has been designed for gradual adoption from the start, and **you can use as little or as much React as you need**:

* Use [Quick Start](https://react.dev/learn) to get a taste of React.
* [Add React to an Existing Project](https://react.dev/learn/add-react-to-an-existing-project) to use as little or as much React as you need.
* [Create a New React App](https://react.dev/learn/start-a-new-react-project) if you're looking for a powerful JavaScript toolchain.

## Documentation

You can find the React documentation [on the website](https://react.dev/).

Check out the [Getting Started](https://react.dev/learn) page for a quick overview.

The documentation is divided into several sections:

* [Quick Start](https://react.dev/learn)
* [Tutorial](https://react.dev/learn/tutorial-tic-tac-toe)
* [Thinking in React](https://react.dev/learn/thinking-in-react)
* [Installation](https://react.dev/learn/installation)
* [Describing the UI](https://react.dev/learn/describing-the-ui)
* [Adding Interactivity](https://react.dev/learn/adding-interactivity)
* [Managing State](https://react.dev/learn/managing-state)
* [Advanced Guides](https://react.dev/learn/escape-hatches)
* [API Reference](https://react.dev/reference/react)
* [Where to Get Support](https://react.dev/community)
* [Contributing Guide](https://legacy.reactjs.org/docs/how-to-contribute.html)

You can improve it by sending pull requests to [this repository](https://github.com/reactjs/react.dev).

## Examples

We have several examples [on the website](https://react.dev/). Here is the first one to get you started:

```jsx
import { createRoot } from 'react-dom/client';

function HelloMessage({ name }) {
  return <div>Hello {name}</div>;
}

const root = createRoot(document.getElementById('container'));
root.render(<HelloMessage name="Taylor" />);
```

This example will render "Hello Taylor" into a container on the page.

You'll notice that we used an HTML-like syntax; [we call it JSX](https://react.dev/learn#writing-markup-with-jsx). JSX is not required to use React, but it makes code more readable, and writing it feels like writing HTML.

## Contributing

The main purpose of this repository is to continue evolving React core, making it faster and easier to use. Development of React happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving React.

### [Code of Conduct](https://code.fb.com/codeofconduct)

Facebook has adopted a Code of Conduct that we expect project participants to adhere to. Please read [the full text](https://code.fb.com/codeofconduct) so that you can understand what actions will and will not be tolerated.

### [Contributing Guide](https://legacy.reactjs.org/docs/how-to-contribute.html)

Read our [contributing guide](https://legacy.reactjs.org/docs/how-to-contribute.html) to learn about our development process, how to propose bugfixes and improvements, and how to build and test your changes to React.

### [Good First Issues](https://github.com/facebook/react/labels/good%20first%20issue)

To help you get your feet wet and get you familiar with our contribution process, we have a list of [good first issues](https://github.com/facebook/react/labels/good%20first%20issue) that contain bugs that have a relatively limited scope. This is a great place to get started.

### License

React is [MIT licensed](./LICENSE).


## 🌐 Web Resources & Interactive Index
- [QUEENS ROYAL SUDOKU PUZZLE](https://studyplayings.web.app/queens-royal-sudoku-puzzle.html)
- [INDYGIRL AND THE GOLDEN SKULL](https://skillplay.github.io/indygirl-and-the-golden-skull.html)
- [CRAZY GOOSE SIMULATOR](https://studyplayings.web.app/crazy-goose-simulator.html)
- [DREAM MANIA HAPPY MATCH](https://themindzone.pages.dev/dream-mania-happy-match.html)
- [MEME CHALLENGEIO](https://studyplaying.github.io/meme-challengeio.html)
- [BR BR PATAPIM OBBY CHALLENGE](https://themindzone.pages.dev/br-br-patapim-obby-challenge.html)
- [CUBE IN CUBE](https://studyplaying.github.io/cube-in-cube.html)
- [MATCH 3 DREAM ROOM](https://studyplaying.github.io/match-3-dream-room.html)
- [PAPA BUZJA](https://studyplaying.github.io/papa-buzja.html)
- [PARK THEM ALL](https://thequizzone.pages.dev/park-them-all.html)
- [SUSHI PUZZLE](https://studyplaying.github.io/sushi-puzzle.html)
- [DRAW THE WEAPON](https://thelearnquesters.pages.dev/draw-the-weapon.html)
- [STICKMAN DUO ESCAPE THE TOMB](https://thequizzone.pages.dev/stickman-duo-escape-the-tomb.html)
- [GRANNYS CLASSROOM NIGHTMARE](https://themindzone.pages.dev/grannys-classroom-nightmare.html)
- [DIGGING MOLES](https://themindzone.pages.dev/digging-moles.html)
- [COSMOS 404](https://thequizzone.pages.dev/cosmos-404.html)
- [SUPER RACING](https://thequizzone.pages.dev/super-racing.html)
- [CATEGORY BIKE 2](https://studyplayings.pages.dev/category-bike-2.html)
- [BUBBLE CLASSIC](https://themindzone.pages.dev/bubble-classic.html)
- [MAHJONG CLASSIC WEBGL](https://studyplayings.web.app/mahjong-classic-webgl.html)
- [CATEGORY ADVENTURE 3](https://theskillquest.pages.dev/category-adventure-3.html)
- [JELI2D](https://themindzone.pages.dev/jeli2d.html)
- [HEXON RUSH](https://learnquesters.pages.dev/hexon-rush.html)
- [FRUIT MATCH JUICY PUZZLE](https://thequizzone.pages.dev/fruit-match-juicy-puzzle.html)
- [PUMPKIN CATCHER](https://studyplayings.web.app/pumpkin-catcher.html)
- [LOVE IN STYLE](https://themindzone.pages.dev/love-in-style.html)
- [COLOR NONOGRAM PUZZLE](https://learnquester.pages.dev/color-nonogram-puzzle.html)
- [CATEGORY STUNT128](https://thelearnquesters.pages.dev/category-stunt128.html)
- [2 3 4 PLAYER GAMES](https://themindzone.pages.dev/2-3-4-player-games.html)
- [DESSERT DIY](https://themindzone.pages.dev/dessert-diy.html)
- [FASHION VALKYRIES SAGA OF STYLE](https://quizverses.pages.dev/fashion-valkyries-saga-of-style.html)
- [INDEX35](https://thelearnquesters.pages.dev/index35.html)
- [RIDDLEMATH](https://studyplaying.github.io/riddlemath.html)
- [MERGE FELLAS ONLINE](https://themindzone.pages.dev/merge-fellas-online.html)
- [STICK NINJA SURVIVAL](https://studyplaying.github.io/stick-ninja-survival.html)
- [HELP THE DUCK](https://studyquesthub.web.app/help-the-duck.html)
- [SINGLE STROKE ENERGY LINE PUZZLE](https://studyquests.pages.dev/single-stroke-energy-line-puzzle.html)
- [FOONO ONLINE MULTIPLAYER CARD GAME](https://studyplaying.github.io/foono-online-multiplayer-card-game.html)
- [ARMY TRUCK DRIVER ONLINE](https://studyplaying.github.io/army-truck-driver-online.html)
- [BLOCK CUT CLEANER](https://studyplaying.github.io/block-cut-cleaner.html)
- [EGG ADVENTURE MIRROR WORLD](https://studyquests.github.io/egg-adventure-mirror-world.html)
- [ALIEN INTELLIGENCE TEST](https://thequizzone.pages.dev/alien-intelligence-test.html)
- [CATEGORY CASUAL 4](https://learnquester.pages.dev/category-casual-4.html)
- [GUN CLONE](https://learnquesters.pages.dev/gun-clone.html)
- [MATH STARS](https://themindzone.pages.dev/math-stars.html)
- [BFFS SPRING BREAK FASHIONISTA](https://studyquests.github.io/bffs-spring-break-fashionista.html)
- [STRATEGY OF WAR TANKS AND HELICOPTERS](https://themindzone.pages.dev/strategy-of-war-tanks-and-helicopters.html)
- [BUTTERFLY SORT PUZZLE](https://studyplaying.github.io/butterfly-sort-puzzle.html)
- [BACTERIA LIFE DEATH](https://studyplayings.web.app/bacteria-life-death.html)
- [WORD CROSS](https://themindzone.pages.dev/word-cross.html)
- [PERFECT SHOT](https://studyplayings.web.app/perfect-shot.html)
- [FIX THE HOOF](https://theskillquest.pages.dev/fix-the-hoof.html)
- [WITCH FAIRY BFF](https://theskillquest.pages.dev/witch-fairy-bff.html)
- [BUBBLE SHOOTER FREE 3](https://studyplayings.web.app/bubble-shooter-free-3.html)
- [HEROES OF THE ARENA](https://themindzone.pages.dev/heroes-of-the-arena.html)
- [LEGEND OF DRAGON HUNT](https://thequizzone.pages.dev/legend-of-dragon-hunt.html)
- [JELLY TOWER CRUSH](https://learnquester.pages.dev/jelly-tower-crush.html)
- [SUPER BITCOIN BOY](https://studyquests.github.io/super-bitcoin-boy.html)
- [CATEGORY HORROR90](https://iskillplay.web.app/category-horror90.html)
- [CATCH THE GOOSE](https://studyplaying.github.io/catch-the-goose.html)
- [CATEGORY FPS](https://iskillplay.web.app/category-fps.html)
- [PERFECT CAKE MAKER](https://theskillquest.pages.dev/perfect-cake-maker.html)
- [ANGRY FLAPPY](https://studyquests.github.io/angry-flappy.html)
- [CAKE MERGE 2](https://themindzone.pages.dev/cake-merge-2.html)
- [DINO RANCH](https://iskillquest.pages.dev/dino-ranch.html)
- [NEON BLAST](https://studyquesthub.web.app/neon-blast.html)
- [TILE SORT MATCH 3](https://studyplayings.web.app/tile-sort-match-3.html)
- [CATEGORY PUZZLE](https://studyplayings.pages.dev/category-puzzle.html)
- [DELTA FORCE AIRBORNE](https://learnquesters.pages.dev/delta-force-airborne.html)
- [BALLERINA CAPPUCCINA FIRST DATE](https://themindzone.pages.dev/ballerina-cappuccina-first-date.html)
- [FASHION VALKYRIES SAGA OF STYLE](https://studyplaying.github.io/fashion-valkyries-saga-of-style.html)
- [CATEGORY ROGUELIKE38](https://themindplays.pages.dev/category-roguelike38.html)
- [LOOP SURVIVORS ZOMBIE CITY](https://studyquesthub.web.app/loop-survivors-zombie-city.html)
- [MAGICAL DIARY PAPER DRESS UP](https://studyquests.pages.dev/magical-diary-paper-dress-up.html)
- [GRANDMAS LAST STAND](https://studyplaying.github.io/grandmas-last-stand.html)
- [SMARTLE](https://studyplayings.web.app/smartle.html)
- [TOWER CRUSH](https://thequizzone.pages.dev/tower-crush.html)
- [PYRAMID JEWELS](https://studyquesthub.web.app/pyramid-jewels.html)
- [FISH STORY 4](https://skillplay.github.io/fish-story-4.html)
- [CATEGORY CASUAL 8](https://studyplaying.github.io/category-casual-8.html)
- [CATEGORY FLASH](https://theskillquest.pages.dev/category-flash.html)
- [CATEGORY ESCAPE](https://theskillquest.pages.dev/category-escape.html)
- [CATEGORY PUZZLE 6](https://iskillplay.web.app/category-puzzle-6.html)
- [CATEGORY LOGIC538](https://studyplayings.web.app/category-logic538.html)
- [CATEGORY FREE DRESS UP GAMES](https://themindplay.github.io/category-free-dress-up-games.html)
- [HIDE AND LUIG](https://studyquests.pages.dev/hide-and-luig.html)
- [BROKEN CITY COMBAT](https://themindplaying.web.app/broken-city-combat.html)
- [CATEGORY FPS174](https://themindplaying.web.app/category-fps174.html)
- [MARBLE BLAST](https://studyplayings.web.app/marble-blast.html)
- [INDEX12](https://studyplayings.pages.dev/index12.html)
- [WATERPARK SORT](https://themindplay.pages.dev/waterpark-sort.html)
- [CATEGORY MERGE224](https://learnquester.pages.dev/category-merge224.html)
- [CATEGORY CLASSIC98](https://theskillquest.pages.dev/category-classic98.html)
- [CUBE SPEED DASH](https://thequizzone.pages.dev/cube-speed-dash.html)
- [3D SUPER ROLLING BALL RACE](https://studyquests.pages.dev/3d-super-rolling-ball-race.html)
- [DREAM RESTAURANT 3D](https://theskillquest.pages.dev/dream-restaurant-3d.html)
- [WORDLER](https://theskillquest.pages.dev/wordler.html)
- [TARCAT](https://theskillquest.pages.dev/tarcat.html)
- [PIPE CONNECT](https://iskillquest.pages.dev/pipe-connect.html)
- [CATEGORY IO](https://studyplayings.web.app/category-io.html)
- [FILL THE BOTTLE](https://studyplayings.pages.dev/fill-the-bottle.html)
- [ROPE RESCUE UNIQUE PUZZLE](https://studyquests.github.io/rope-rescue-unique-puzzle.html)
- [BFFS Y2K FASHION](https://themindplays.pages.dev/bffs-y2k-fashion.html)
- [CATEGORY MINING75](https://iskillplay.web.app/category-mining75.html)
- [COINS](https://themindplays.pages.dev/coins.html)
- [CATEGORY MERGE221](https://themindplay.pages.dev/category-merge221.html)
- [BUNNYS FARM](https://studyquesthub.web.app/bunnys-farm.html)
- [CATEGORY COLLECT565](https://theskillquest.pages.dev/category-collect565.html)
- [TERMS](https://studyplayings.pages.dev/terms.html)
- [PICK BRAINROT 3D BATTLE](https://studyplaying.github.io/pick-brainrot-3d-battle.html)
- [STREET BALL JAM](https://iskillplay.web.app/street-ball-jam.html)
- [CATEGORY CASUAL](https://studyplayings.pages.dev/category-casual.html)
- [MOTO TRAFFIC RIDER](https://studyplayings.pages.dev/moto-traffic-rider.html)
- [DOGE BUBBLE](https://studyquests.github.io/doge-bubble.html)
- [WORD OF FORTUNE](https://themindskillplayplay.pages.dev/word-of-fortune.html)
- [KITCHEN STAR](https://thequizzone.pages.dev/kitchen-star.html)
- [STRAWBERRY SHORTCAKE BOARDGAMES](https://thequizzone.pages.dev/strawberry-shortcake-boardgames.html)
- [IDLE VLOGGER SIMULATOR](https://themindplays.pages.dev/idle-vlogger-simulator.html)
- [MOTO STUNTS DRIVING RACING](https://studyquests.github.io/moto-stunts-driving-racing.html)
- [CATEGORY GOGUARDIAN](https://themindplay.pages.dev/category-goguardian.html)
- [HIDDEN OBJECTS LOST ISLAND 2](https://themindskillplayplay.pages.dev/hidden-objects-lost-island-2.html)
- [SAVE LITTLE RED HOOD](https://studyplayings.pages.dev/save-little-red-hood.html)
- [MAZE CUBE 2048](https://theskillquest.pages.dev/maze-cube-2048.html)
- [OBBY PUMP UP YOUR MUSCLES 1 PER SECOND](https://themindskillplayplay.pages.dev/obby-pump-up-your-muscles-1-per-second.html)
- [CATEGORY CAR 2](https://thequizzone.pages.dev/category-car-2.html)
- [KAWAII FRIENDS TILES MATCHER](https://studyplayings.pages.dev/kawaii-friends-tiles-matcher.html)
- [WORD SEARCH UNIVERSE 2](https://themindplays.pages.dev/word-search-universe-2.html)
- [CATEGORY AVOID295](https://studyplayings.web.app/category-avoid295.html)
- [CAR SIMULATOR 3D CAR GAME 3D](https://thequizzone.pages.dev/car-simulator-3d-car-game-3d.html)
- [SAND SORT COLOR PUZZLE GAME](https://studyquesthub.web.app/sand-sort-color-puzzle-game.html)
