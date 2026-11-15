-- BOOKFLIX · 0004 · Satır düzeyi güvenlik (RLS) ve yetkiler
-- Kural: herkes görünür ve erişebildiği içeriği okur, yalnızca sahibi yazar.
-- Sayaç, XP, aktivite ve bildirim tabloları istemciden yazılamaz.

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.award_xp(uuid, public.xp_action, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.reverse_xp(uuid, public.xp_action, uuid) from public, anon, authenticated;
revoke execute on function public.restore_xp(uuid, public.xp_action, uuid) from public, anon, authenticated;
revoke execute on function public.refresh_badges(uuid, text[]) from public, anon, authenticated;
revoke execute on function public.set_content_status(text, uuid, public.content_status) from public, anon, authenticated;
revoke execute on function public.bump_counter(public.target_type, uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.notify(uuid, uuid, public.notification_type, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.refresh_follow_counts(uuid) from public, anon, authenticated;

-- Sütun düzeyinde kısıtlar
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke update on public.follows from authenticated;
grant update (status) on public.follows to authenticated;
revoke insert, update, delete on public.xp_ledger, public.user_badges, public.activities, public.media_stats,
  public.xp_rules, public.xp_settings, public.levels, public.badges, public.external_ratings,
  public.contributors, public.media_contributors, public.external_ids, public.seasons, public.episodes,
  public.screen_details, public.app_roles, public.deletion_requests from authenticated;
grant insert on public.copyright_notices to anon;

-- ---------------------------------------------------------------- profiller
create policy profiles_select on public.profiles for select to authenticated
  using (deleted_at is null and not public.is_blocked(id, auth.uid()) or id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy settings_own on public.user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy follows_select on public.follows for select to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid()
         or (status = 'accepted' and public.can_view_user(followee_id) and public.can_view_user(follower_id)));
create policy follows_insert on public.follows for insert to authenticated
  with check (follower_id = auth.uid());
create policy follows_accept on public.follows for update to authenticated
  using (followee_id = auth.uid() and status = 'pending') with check (followee_id = auth.uid() and status = 'accepted');
create policy follows_delete on public.follows for delete to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid());

create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy push_tokens_own on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy app_roles_select on public.app_roles for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------- katalog
create policy media_select on public.media_items for select to authenticated
  using (moderation_status = 'visible' or created_by = auth.uid() or public.is_moderator());
create policy media_insert_user on public.media_items for insert to authenticated
  with check (source = 'user' and created_by = auth.uid() and moderation_status = 'pending');

create policy book_details_select on public.book_details for select to authenticated using (true);
create policy book_details_insert_user on public.book_details for insert to authenticated
  with check (exists (select 1 from public.media_items m where m.id = media_id and m.created_by = auth.uid() and m.source = 'user'));

create policy screen_details_select on public.screen_details for select to authenticated using (true);
create policy contributors_select on public.contributors for select to authenticated using (true);
create policy media_contributors_select on public.media_contributors for select to authenticated using (true);
create policy external_ids_select on public.external_ids for select to authenticated using (true);
create policy external_ratings_select on public.external_ratings for select to authenticated using (true);
create policy seasons_select on public.seasons for select to authenticated using (true);
create policy episodes_select on public.episodes for select to authenticated using (true);
create policy media_stats_select on public.media_stats for select to authenticated using (true);

-- ---------------------------------------------------------------- kütüphane
create policy library_select on public.library_entries for select to authenticated
  using (user_id = auth.uid() or (not is_private and public.can_view_user(user_id)));
create policy library_write on public.library_entries for insert to authenticated
  with check (user_id = auth.uid());
create policy library_update on public.library_entries for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy library_delete on public.library_entries for delete to authenticated
  using (user_id = auth.uid());

create policy episode_progress_select on public.episode_progress for select to authenticated
  using (user_id = auth.uid() or public.can_view_user(user_id));
create policy episode_progress_insert on public.episode_progress for insert to authenticated
  with check (user_id = auth.uid());
create policy episode_progress_delete on public.episode_progress for delete to authenticated
  using (user_id = auth.uid());

create policy lists_select on public.lists for select to authenticated
  using (owner_id = auth.uid() or (is_public and public.can_view_user(owner_id)));
create policy lists_insert on public.lists for insert to authenticated with check (owner_id = auth.uid());
create policy lists_update on public.lists for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy lists_delete on public.lists for delete to authenticated using (owner_id = auth.uid());

create policy list_items_select on public.list_items for select to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id));
create policy list_items_write on public.list_items for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()));

-- ---------------------------------------------------------------- içerik
create policy quotes_select on public.quotes for select to authenticated
  using (user_id = auth.uid() or public.is_moderator() or (status = 'visible' and public.can_view_user(user_id)));
create policy quotes_insert on public.quotes for insert to authenticated with check (user_id = auth.uid() and status = 'visible');
create policy quotes_update on public.quotes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy quotes_delete on public.quotes for delete to authenticated using (user_id = auth.uid());

create policy reviews_select on public.reviews for select to authenticated
  using (user_id = auth.uid() or public.is_moderator() or (status = 'visible' and public.can_view_user(user_id)));
create policy reviews_insert on public.reviews for insert to authenticated with check (user_id = auth.uid() and status = 'visible');
create policy reviews_update on public.reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_delete on public.reviews for delete to authenticated using (user_id = auth.uid());

create policy helpful_own on public.review_helpful_votes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy likes_select on public.likes for select to authenticated
  using (user_id = auth.uid() or (public.can_view_user(user_id) and public.can_view_target(target_type, target_id)));
create policy likes_insert on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy likes_delete on public.likes for delete to authenticated using (user_id = auth.uid());

create policy comments_select on public.comments for select to authenticated
  using (user_id = auth.uid() or public.is_moderator()
         or (status = 'visible' and public.can_view_user(user_id) and public.can_view_target(target_type, target_id)));
create policy comments_insert on public.comments for insert to authenticated with check (user_id = auth.uid() and status = 'visible');
create policy comments_delete on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.content_owner(target_type, target_id) = auth.uid());

create policy saves_own on public.saves for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.shows_activity(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.show_activity_in_feed from public.user_settings s where s.user_id = u), true)
$$;

create policy activities_select on public.activities for select to authenticated
  using (
    public.can_view_user(actor_id)
    and (actor_id = auth.uid() or public.shows_activity(actor_id))
    and (object_type is null or object_type not in ('quote', 'review', 'list')
         or public.can_view_target(object_type::public.target_type, object_id))
  );

-- ---------------------------------------------------------------- topluluklar
-- Politikalar arası özyinelemeyi önlemek için üyelik security definer yardımcıyla okunur.
create or replace function public.community_role_of(cid uuid) returns public.community_role
language sql stable security definer set search_path = '' as $$
  select role from public.community_members where community_id = cid and user_id = auth.uid()
$$;

create or replace function public.can_view_community(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.communities c where c.id = cid
                 and (not c.is_private or public.community_role_of(cid) is not null))
$$;

create policy communities_select on public.communities for select to authenticated
  using (not is_private or public.community_role_of(id) is not null);
create policy communities_insert on public.communities for insert to authenticated with check (owner_id = auth.uid());
create policy communities_update on public.communities for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy communities_delete on public.communities for delete to authenticated using (owner_id = auth.uid());

create policy community_members_select on public.community_members for select to authenticated
  using (public.can_view_community(community_id));
create policy community_members_join on public.community_members for insert to authenticated
  with check (user_id = auth.uid() and role = 'member' and public.can_view_community(community_id)
              and not exists (select 1 from public.communities c where c.id = community_id and c.is_private));
create policy community_members_leave on public.community_members for delete to authenticated
  using (user_id = auth.uid() or public.community_role_of(community_id) in ('owner', 'moderator'));

create policy community_posts_select on public.community_posts for select to authenticated
  using (status = 'visible' and public.can_view_user(author_id) and public.can_view_community(community_id));
create policy community_posts_insert on public.community_posts for insert to authenticated
  with check (author_id = auth.uid() and status = 'visible' and public.community_role_of(community_id) is not null);
create policy community_posts_delete on public.community_posts for delete to authenticated
  using (author_id = auth.uid());

-- ---------------------------------------------------------------- oyunlaştırma ve bildirim
create policy xp_rules_select on public.xp_rules for select to authenticated using (true);
create policy xp_settings_select on public.xp_settings for select to authenticated using (true);
create policy levels_select on public.levels for select to authenticated using (true);
create policy badges_select on public.badges for select to authenticated using (true);
create policy xp_ledger_own on public.xp_ledger for select to authenticated using (user_id = auth.uid());
create policy user_badges_select on public.user_badges for select to authenticated using (public.can_view_user(user_id));

create policy notifications_select on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy notifications_read on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (recipient_id = auth.uid());

-- ---------------------------------------------------------------- güvenlik ve uyum
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open');
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_moderator());
create policy reports_update on public.reports for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

create policy copyright_insert on public.copyright_notices for insert to anon, authenticated with check (status = 'open');
create policy copyright_select on public.copyright_notices for select to authenticated using (public.is_moderator());

create policy moderation_insert on public.moderation_actions for insert to authenticated
  with check (moderator_id = auth.uid() and public.is_moderator());
create policy moderation_select on public.moderation_actions for select to authenticated using (public.is_moderator());

create policy consents_own_select on public.consents for select to authenticated using (user_id = auth.uid());
create policy consents_own_insert on public.consents for insert to authenticated with check (user_id = auth.uid());

create policy deletion_requests_own on public.deletion_requests for select to authenticated using (user_id = auth.uid());
