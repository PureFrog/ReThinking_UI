# 마음이 자라는 정원

React 19 / TypeScript / Phaser 3.90, Sites Vinext. This version replaces the dashboard with a playable house and garden. No financial, disclosure, LLM, trading, or portfolio backend is connected. Companies, evidence, scenarios and returns are fictional.

## Play

Click the floor to move your player. The player routes around furniture and planted plots and approaches an object before opening it. Hover over objects for a short label.

- Drawer: collected gifts, furniture placement, in-world guide.
- Bookcase: investment quiz.
- Paper on table: holdings, configurable tree age/loss thresholds, mock conversation history.
- Empty plot: register a fictional holding.
- Tree: inspect/edit the mock return, purchase date and sustained loss duration.
- Mailbox: invite a visitor.
- Gift box on floor: approach and collect, then show the item and sender (or anonymous).
- Visitor: approach, then speak through a head-level bubble and translucent choices beside the character. Mock incident input and decisions stay attached to the character; evidence opens a readable book panel.

Visitors are absent initially, arrive periodically (short demo timing), leave again, and can be invited at the mailbox. Only one visits at a time. Open conversations postpone automatic departure. Gifts are idempotent per demo event and persist after collection. Anonymous gifts remain anonymous in the inventory.

Furniture is selected from the drawer, previewed on the grid, and placed after the player walks to the selected location. Occupied cells and placements that block access to the key furniture or exit are rejected. Placed furniture can be moved or stored by interacting with it.

## Tree states

- Return >= +10%: animated fruit glow.
- Positive return and held for >= 180 days: large old tree with broad roots.
- Return < -10%: substantially smaller, drooping canopy with fallen leaves.
- Return <= -20% for >= 60 days: leafless bent/broken branches.

The 180/60 day thresholds are editable from the table's record book; they are prototype defaults. Holding age and time spent below -20% are separate. Tree appearance is not an inference about corporate risk. Simulation reference date is explicitly 2026-10-27.

## Persistence and implementation

`little-garden-v2` localStorage stores holdings, configurable rules, furniture positions, floor gifts, collection IDs, dialogue history and decisions. The earlier v1 storage remains untouched. Player position and transient visitor state reset on reload. No cross-device sync.

- `app/page.tsx`: React contextual speech, physical-object panels, local persistence and event bridge.
- `app/game.ts`: Phaser projected scene, player walking, BFS routes, object interactions, visitors, gift pickups, furniture placement and tree rendering.
- `app/model.ts`: pure tree-state and route rules.
- `tests/model.test.mjs`: 8 tests for thresholds, recovery and collision routing.
- `public/assets/garden-atlas.png`: generated three-character/three-tree transparent atlas, 512px frames.

Run `pnpm dev`, `pnpm build`, `node node_modules/typescript/bin/tsc --noEmit`, `node --test tests/model.test.mjs`. Managed preview: `sites-preview start <checkout>`.

Art is a UI prototype: the player is procedural with animated limbs; visitors use single generated sprites with simple motion. Furniture remains procedural isometric geometry. No complete directional sprite animation, clothing equipment, or production market integrations are claimed.
