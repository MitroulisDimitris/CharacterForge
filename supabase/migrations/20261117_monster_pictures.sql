-- Monster pictures (2026-11-17): a DM can add their own picture to any monster in the Lookup.
-- Private bucket; each account reads and writes only its own folder: <user id>/<monster slug>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('monster-pictures', 'monster-pictures', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "own monster pictures: read" on storage.objects for select to authenticated
  using (bucket_id = 'monster-pictures' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own monster pictures: add" on storage.objects for insert to authenticated
  with check (bucket_id = 'monster-pictures' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own monster pictures: change" on storage.objects for update to authenticated
  using (bucket_id = 'monster-pictures' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'monster-pictures' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own monster pictures: remove" on storage.objects for delete to authenticated
  using (bucket_id = 'monster-pictures' and (storage.foldername(name))[1] = auth.uid()::text);
