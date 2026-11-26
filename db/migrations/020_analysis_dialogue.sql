-- analysis_results.dialogue: the line 루온 says about a 반박 result, made by the team pipeline's S10
-- (investment-evidence-system backend/llm/fds_rebuttal/S10_dialogue_generation, written by ops/ui/analysis_worker.py):
--   {character_message, emotion_code, asked_cc_id, speaker:'luon', persona_id, fallback, attempts, scope_case,
--    fact_ids, models, seconds, estimated_cost_usd}
-- null on rows analysed before S10. The worker checks for this column before it runs any analysis.
-- Read by app/proto3d/model-signals.ts (the note's line and 루온's first line in the debate, app/core/model-signals.ts).
alter table analysis_results add column if not exists dialogue jsonb;
