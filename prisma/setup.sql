-- Auto-create profile when user registers
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, "firstName", "lastName", role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'firstName', 'Unbekannt'),
    coalesce(new.raw_user_meta_data->>'lastName', ''),
    'sales'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.deal_contacts enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;

-- Drop existing policies if any
drop policy if exists "Authenticated read profiles" on public.profiles;
drop policy if exists "Authenticated read companies" on public.companies;
drop policy if exists "Authenticated read contacts" on public.contacts;
drop policy if exists "Authenticated read deals" on public.deals;
drop policy if exists "Authenticated read deal_contacts" on public.deal_contacts;
drop policy if exists "Authenticated read pipelines" on public.pipelines;
drop policy if exists "Authenticated read pipeline_stages" on public.pipeline_stages;
drop policy if exists "Authenticated write companies" on public.companies;
drop policy if exists "Authenticated write contacts" on public.contacts;
drop policy if exists "Authenticated write deals" on public.deals;
drop policy if exists "Authenticated write deal_contacts" on public.deal_contacts;
drop policy if exists "Authenticated write pipelines" on public.pipelines;
drop policy if exists "Authenticated write pipeline_stages" on public.pipeline_stages;

-- Read policies
create policy "Authenticated read profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Authenticated read companies" on public.companies for select using (auth.role() = 'authenticated');
create policy "Authenticated read contacts" on public.contacts for select using (auth.role() = 'authenticated');
create policy "Authenticated read deals" on public.deals for select using (auth.role() = 'authenticated');
create policy "Authenticated read deal_contacts" on public.deal_contacts for select using (auth.role() = 'authenticated');
create policy "Authenticated read pipelines" on public.pipelines for select using (auth.role() = 'authenticated');
create policy "Authenticated read pipeline_stages" on public.pipeline_stages for select using (auth.role() = 'authenticated');

-- Write policies
create policy "Authenticated write companies" on public.companies for all using (auth.role() = 'authenticated');
create policy "Authenticated write contacts" on public.contacts for all using (auth.role() = 'authenticated');
create policy "Authenticated write deals" on public.deals for all using (auth.role() = 'authenticated');
create policy "Authenticated write deal_contacts" on public.deal_contacts for all using (auth.role() = 'authenticated');
create policy "Authenticated write pipelines" on public.pipelines for all using (auth.role() = 'authenticated');
create policy "Authenticated write pipeline_stages" on public.pipeline_stages for all using (auth.role() = 'authenticated');
