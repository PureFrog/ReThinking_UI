# Foundation continuation — 2026-10-28
Common world cards now connected for trees and gifts; selected furniture uses side menu. Removal uses cancel-first confirmation. Dialogue pagination/keyboard advance/choice gating, player thoughts, ambient activation/missed messages, panel dirty-close/focus/swipe, queued gifts, missing atlas fallback and a particle module added. README rewritten.

Validation: TypeScript and 21 pure-model/foundation tests; framework build. Actual 1400px/375px browser acceptance still blocked by prior automatic review credit failure. No screenshots provided or claimed.

Not a declaration that the full phase 1 specification is accepted. Remaining items: all state timers under a strict transition graph; comprehensive scene decomposition; exact line measurement and hover-release durations; interaction acceptance tests; remaining 11.x tool/placement/inventory detail. Later stages remain approval-gated. Concept art is not a gameplay screenshot.

Latest continuation: 23 tests pass. Added hover countdown, departure coalescing, visitor session checks, cancellable water-to-talk retry, idle clock, IME guard, decoration tray/cancel. Actual browser acceptance remains outstanding.

## Quiet visitors and first furniture integration
Latest user request overrides the earlier missed-message indicator: removed the marker and idle ellipsis, honor null ambient events, no automatic post-conversation reply. Visitors greet once, have a finite two-action budget with 35-second rests, water silently, walk to a nearby resting spot, and move more slowly. Conversations do not reset the action budget.

Integrated storybook-furniture-v1.png from the approved scene reference into sofa, drawer, bookcase and writing desk. Existing physical hotspots and approach-to-open interactions remain. This is partial art integration; character references/animations, house and trees remain outstanding. Generated via built-in ImageGen, not CLI. Brief: transparent 2x2 furniture atlas, warm gouache, sage/cream/wood, 2:1 isometric, upper-left lighting, sofa/drawer/bookcase/journal desk, no background. Source asset: public/assets/storybook-furniture-v1.png.

Checks: TypeScript, 24 tests, framework build. No browser visual acceptance claim: earlier automatic review blocked browser QA for workspace credits.
