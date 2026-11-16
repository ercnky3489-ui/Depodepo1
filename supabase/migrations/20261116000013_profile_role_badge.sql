-- Profilde gösterilecek rol rozeti. app_roles yalnızca sahibine okunur ve istemci yazamaz; bu fonksiyon
-- yalnızca en yüksek rolün adını ('admin' > 'moderator') döndürür, başka bir bilgi vermez.
create or replace function public.profile_role(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.app_roles where user_id = p_user and role = 'admin') then 'admin'
    when exists (select 1 from public.app_roles where user_id = p_user and role = 'moderator') then 'moderator'
  end
$$;
revoke execute on function public.profile_role(uuid) from public, anon;
grant execute on function public.profile_role(uuid) to authenticated;
