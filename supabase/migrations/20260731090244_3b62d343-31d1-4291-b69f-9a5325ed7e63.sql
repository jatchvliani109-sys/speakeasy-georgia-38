create index if not exists idx_bvs_user on business_vocab_sessions (user_id);
create index if not exists idx_bis_user on business_interview_sessions (user_id);
create index if not exists idx_bms_user on business_meeting_sessions (user_id);
create index if not exists idx_bps_user on business_presentation_sessions (user_id);
create index if not exists idx_vocabulary_user on vocabulary (user_id);