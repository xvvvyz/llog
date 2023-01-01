create index team_members_profile_id_index on public.team_members using btree (profile_id);

create index team_members_team_id_index on public.team_members using btree (team_id);

create index subjects_updated_at_index on public.subjects using btree (updated_at);

create index subjects_team_id_index on public.subjects using btree (team_id);

create index subject_observations_subject_id_index on public.subject_observations using btree (subject_id);

create index subject_managers_profile_id_index on public.subject_managers using btree (profile_id);

create index subject_managers_subject_id_index on public.subject_managers using btree (subject_id);

create index routines_mission_id_index on public.routines using btree (mission_id);

create index routine_inputs_routine_id_index on public.routine_inputs using btree (routine_id);

create index observations_team_id_index on public.observations using btree (team_id);

create index observation_inputs_observation_id_index on public.observation_inputs using btree (observation_id);

create index missions_team_id_index on public.missions using btree (team_id);

create index missions_subject_id_index on public.missions using btree (subject_id);

create index inputs_team_id_index on public.inputs using btree (team_id);

create index input_options_input_id_index on public.input_options using btree (input_id);

create index events_subject_id_index on public.events using btree (subject_id);

create index event_inputs_event_id_index on public.event_inputs using btree (event_id);

create index event_inputs_input_option_id_index on public.event_inputs using btree (input_option_id);
