create or replace function public.upsert_routine_event (event events, event_input_option_ids uuid[], OUT id uuid)
  returns uuid
  language plpgsql
  as $$
  begin
    if event.id is null then
      insert into events as e (subject_id, routine_id)
        values (event.subject_id, event.routine_id)
      returning
        e.id into event.id;
    else
      delete from event_inputs as ei
      where ei.event_id = event.id;
    end if;
    insert into event_inputs (event_id, input_option_id)
      values (event.id, unnest(event_input_option_ids));
    id = event.id;
  end
  $$;
