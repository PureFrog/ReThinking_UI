-- 루온's own conversation and detection store (bori-talk speaker 'luon', 2026-11-24) are saved under the collections
-- 'conversation_luon' and 'detection_luon', which the check from 005 did not allow: every save was refused (bori-talk does
-- not read the save's answer), so 루온 forgot each talk and no analysis request was ever made from it. Safe to run again.
alter table llm1_docs drop constraint if exists llm1_docs_coll_check;
alter table llm1_docs add constraint llm1_docs_coll_check
  check (coll in ('conversation','profile','detection','conversation_luon','detection_luon'));
