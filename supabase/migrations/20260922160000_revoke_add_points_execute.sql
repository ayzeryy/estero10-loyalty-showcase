begin;

revoke all on function public.add_points(uuid, integer, text) from public;
revoke all on function public.add_points(uuid, integer, text) from anon;
revoke all on function public.add_points(uuid, integer, text) from authenticated;
grant execute on function public.add_points(uuid, integer, text) to service_role;

commit;
