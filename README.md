# 마음이 자라는 정원

React 19 + TypeScript + Phaser 3.90 UI prototype, hosted with the Sites Vinext starter. No financial, disclosure, chat, trading, or portfolio backend is connected. All companies and evidence are fictional. Progress is stored in browser localStorage (`little-garden-v1`).

## Run

Use the checkout's pinned package manager: `pnpm dev`; production: `pnpm build`. Managed Sites preview uses `sites-preview start <checkout>`.

## Structure

- `app/page.tsx`: React dialogs, portfolio entry, scripted everyday conversations and deterministic mock incident responses, evidence, decisions, gifts and local storage.
- `app/game.ts`: Phaser isometric projection, generated sprite atlas, separate scene objects and depth ordering, interactions, simple movement and effects. EventTarget bridge synchronizes durable data and interaction events.
- `app/globals.css`: responsive shell and dialogs.
- `public/assets/garden-atlas.png`: generated transparent 3×2 atlas with three characters and three tree themes, each frame 512×512.

## Supported demo

Click characters for dialogue; plant a fictional holding in one of six plots; inspect tree and portfolio values; place three types of furniture in three predefined safe slots; request a friend visit; receive each gift once; open the mock contract-termination event, submit reasons or counterarguments, inspect evidence and return to the conversation, then record maintain/revise/defer. Reload retains holdings, furniture, received gifts, conversations, decisions and notification preference.

## Deliberate prototype limits

Movement uses a single character sprite with mirroring and tween motion, not a complete directional walk-cycle atlas. House furniture uses simple procedural isometric geometry. Furniture placement uses safe predefined positions, without free drag or rotation. Gift collection is supported; clothing equipment and wallpaper editing are not implemented. No live market detection or automatic notifications. Growth thresholds and negative-return leaf tint are illustrative. Initial holdings and all valuations are mock data. New holdings begin at a simulated 0% return; repeated purchases of the same company are not supported. Removing a tree does not archive trade history or execute a trade. Incident responses are keyword-based prepared text, not analysis or an LLM. No authentication or cross-device sync.

## Validation

Production build and TypeScript check; browser QA for scene rendering, direct character clicking, tree registration, incident input, evidence panel and furniture placement. Remaining browser verification notes are recorded with the final handoff.
