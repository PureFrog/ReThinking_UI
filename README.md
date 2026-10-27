# 마음이 자라는 정원
React 19 + Phaser 3.90 / Sites Vinext. UI-only isometric house and garden. All financial data, disclosures and chat are fictional; no market, LLM or trading backend.

## Interaction
Click the floor to walk. Physical objects open features after approach: drawer for belongings/wardrobe/furniture, bookcase for quiz, desk journal for mock holdings, mailbox for invitations, seed box for planting, shovel for removal. Tree click sways branches and opens water/information choices. Information and acquired gifts appear beside their world targets. Financial editing remains at the journal. Removal has an explicit cancel-first confirmation.

NPCs visit intermittently, walk, water trees and start conversations. Formal dialogue pages type gradually; click/Space/Enter completes or advances. Choices appear after the final page. Ambient speech can open dialogue and leaves a missed-message marker. General guidance uses player thoughts. Furnishing is a distinct mode; normal furniture clicks do not open editing.

## Foundation revision
- `store.ts`: reducer-owned persisted state, nondestructive v2→v3 migration. `little-garden-v3` retains legacy holdings/items/history and prepares care/relationship/memory/currency/slot fields. Future systems are not implemented merely by having these fields.
- `visitor-machine.ts`, `interaction-mode.ts`: visit states, pause/resume, state tokens, one selected mode, deferred ambient/gifts/departures.
- `ui/WorldUI.tsx`, `ui/DialogueLine.tsx`: common bubbles/menu/card/panel/confirmation and dialogue pagination. Panel close warns about edited inputs, traps keyboard focus, supports downward touch close.
- `timing.ts`, `assets.ts`, `scene/effects.ts`: common timing, atlas manifest with missing-texture fallback, particles.

## Limits and staging
The 2026-10-28 redesign is staged. Care/seasons, relationships/memory dialogue, reward economy, realtime visits, onboarding, full art replacement and extended furnishings are later stages. Existing tree thresholds/visuals and simulation date remain until their stage. Current accessories still use a single equipped item. New art concept is approved direction, not integrated sprites.

Foundation still needs visual/interaction acceptance at 1400px and 375px. Browser QA was blocked by automatic review citing workspace credits; screenshots are not available. State-machine timers, IME, mobile sheets, card bounds, busy-visitor conversation and placement interruption require acceptance testing. Not all 11.x interaction details are complete (rotation, swipe placement, target-tool flows, exact three-line typography, hover-release timing and full scene-module extraction).

## Checks
`node node_modules/typescript/bin/tsc --noEmit`
`node --test tests/model.test.mjs tests/foundation.test.mjs`
`pnpm build`
Managed preview: `sites-preview start /workspace/sites/character-garden`.

14 model tests cover tree thresholds/routes/placement cancellation/dialogue bounds. 7 foundation tests cover migration, reducer, queue, visitor tokens, modes, dialogue splitting. No claim of automated end-to-end gameplay validation.
