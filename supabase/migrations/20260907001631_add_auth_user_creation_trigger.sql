-- Ensure new Auth users receive their application profile and loyalty account.
-- The production database already has this trigger, so this migration is a
-- no-op there when the existing trigger points to the expected function.

do $$
declare
  existing_trigger_function oid;
begin
  select trigger_definition.tgfoid
    into existing_trigger_function
  from pg_catalog.pg_trigger as trigger_definition
  where trigger_definition.tgrelid = 'auth.users'::regclass
    and trigger_definition.tgname = 'on_auth_user_created'
    and not trigger_definition.tgisinternal;

  if existing_trigger_function is null then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row
      execute function public.handle_new_user();
  elsif existing_trigger_function <> 'public.handle_new_user()'::regprocedure::oid then
    raise exception
      'Trigger auth.users.on_auth_user_created already exists with an unexpected function';
  end if;
end;
$$;
