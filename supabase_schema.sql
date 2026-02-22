-- ==========================================
-- 0. CLEANUP (Reset for fresh run)
-- ==========================================
drop table if exists public.grades cascade;
drop table if exists public.assignments cascade;
drop table if exists public.enrollments cascade;
drop table if exists public.classes cascade;
drop table if exists public.students cascade;
drop table if exists public.academic_terms cascade;
drop table if exists public.users cascade;

drop type if exists user_role cascade;
drop type if exists term_status cascade;
drop type if exists enrollment_status cascade;
drop type if exists submission_status cascade;

-- ==========================================
-- 1. ENUMS & UTILS
-- ==========================================
create type user_role as enum ('admin', 'teacher', 'student', 'guest');
create type term_status as enum ('open', 'closed');
create type enrollment_status as enum ('active', 'dropped');
create type submission_status as enum ('submitted', 'missing', 'late', 'excused');

-- ==========================================
-- 2. PUBLIC USERS TABLE (Syncs with Auth)
-- ==========================================
create table public.users (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role user_role default 'guest',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.users enable row level security;

-- Trigger to create public.users on auth signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'guest');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error on re-run
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ==========================================
-- 3. ACADEMIC TERMS
-- ==========================================
create table public.academic_terms (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- e.g. "1/2567"
  year text not null, -- e.g. "2567" (Added back)
  term text not null, -- e.g. "1" (Added back)
  status term_status default 'open',
  is_active boolean default false, -- Currently active term
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.academic_terms enable row level security;

-- ==========================================
-- 4. STUDENTS DIRECTORY (Master List)
-- ==========================================
create table public.students (
  id uuid default gen_random_uuid() primary key,
  student_id text unique not null, -- รหัสนักเรียน (Login ID)
  student_number integer, -- เลขที่
  national_id text not null, -- เลขบัตร ปชช (Secret)
  first_name text not null,
  last_name text not null,
  current_room text, -- e.g. "4/1"
  user_id uuid references public.users(id), -- Linked User Account (Nullable)
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.students enable row level security;

-- ==========================================
-- 5. CLASSES
-- ==========================================
create table public.classes (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references public.users(id) not null,
  term_id uuid references public.academic_terms(id) not null,
  room text, -- e.g. "4/1" (Target audience)
  subject_code text not null, -- e.g. "MATH101"
  subject_name text not null,
  description text,
  total_assignment_score float default 50, -- คะแนนเก็บรวมทั้งหมดของรายวิชา
  total_exam_score float default 50, -- คะแนนสอบรวมทั้งหมดของรายวิชา
  grading_scale jsonb default '{"4": 80, "3.5": 75, "3": 70, "2.5": 65, "2": 60, "1.5": 55, "1": 50}'::jsonb, -- เกณฑ์การตัดเกรดตัวเลข
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.classes enable row level security;

-- ==========================================
-- 6. ENROLLMENTS
-- ==========================================
create table public.enrollments (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) not null,
  student_id uuid references public.students(id) not null,
  status enrollment_status default 'active',
  final_grade float,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(class_id, student_id)
);

alter table public.enrollments enable row level security;

-- ==========================================
-- 7. ASSIGNMENTS
-- ==========================================
create type assignment_type as enum ('regular', 'special', 'exam');

create table public.assignments (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) not null,
  title text not null,
  type assignment_type default 'regular', -- ประเภทงาน
  max_score float, -- Nullable, คำนวณอัตโนมัติสำหรับ regular, หรือกำหนดเองสำหรับ special/exam
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.assignments enable row level security;

-- ==========================================
-- 8. GRADES
-- ==========================================
create table public.grades (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments(id) not null,
  student_id uuid references public.students(id) not null,
  score float,
  status submission_status default 'submitted',
  feedback text,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(assignment_id, student_id)
);

alter table public.grades enable row level security;

-- ==========================================
-- 9. FUNCTIONS (Business Logic)
-- ==========================================

-- Function: Batch Enroll Students by Room
-- Usage: When Teacher selects room "4/1", auto enroll all students in "4/1"
create or replace function enroll_students_by_room(p_class_id uuid, p_room text)
returns void as $$
begin
  insert into public.enrollments (class_id, student_id)
  select p_class_id, id
  from public.students
  where current_room = p_room
  on conflict do nothing;
end;
$$ language plpgsql security definer;

-- Function: Activate Student Account (Secure)
-- Usage: Guest inputs ID+NationalID -> System links data
create or replace function activate_student_account(p_student_id text, p_national_id text)
returns json as $$
declare
  v_student_id uuid;
  v_user_id uuid;
begin
  -- Get current auth user
  v_user_id := auth.uid();
  
  -- Find student match
  select id into v_student_id
  from public.students
  where student_id = p_student_id 
    and national_id = p_national_id;

  if v_student_id is null then
    return json_build_object('success', false, 'message', 'Invalid Student ID or National ID');
  end if;

  -- Check if already taken
  perform 1 from public.students where id = v_student_id and user_id is not null;
  if found then
    return json_build_object('success', false, 'message', 'Account already activated');
  end if;

  -- Update linkage
  update public.students set user_id = v_user_id where id = v_student_id;
  update public.users set role = 'student' where id = v_user_id;
  
  -- Update auth metadata for easier access (optional)
  update auth.users set raw_user_meta_data = 
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'student', 'student_db_id', v_student_id)
  where id = v_user_id;

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

-- ==========================================
-- 10. RLS POLICIES (Security)
-- ==========================================

-- Users
create policy "Users can view their own profile" on public.users for select using (auth.uid() = id);
-- Students
create policy "Admins allow all on students" on public.students for all using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "Students view own profile" on public.students for select using (user_id = auth.uid());
-- Classes
create policy "Teachers view own classes" on public.classes for all using (teacher_id = auth.uid());
create policy "Teachers can delete their classes" on public.classes for delete using (teacher_id = auth.uid());
create policy "Students view enrolled classes" on public.classes for select using (
  exists (select 1 from public.enrollments where class_id = public.classes.id and student_id = (select id from public.students where user_id = auth.uid()))
);
-- Enrollments, Assignments, Grades... 
-- (Add basic read policies for now)
create policy "Teachers can insert enrollments" on public.enrollments for insert with check (
  exists (select 1 from public.classes where id = class_id and teacher_id = auth.uid())
);
create policy "Teachers can delete enrollments" on public.enrollments for delete using (
  exists (select 1 from public.classes where id = class_id and teacher_id = auth.uid())
);
create policy "Basic Read" on public.enrollments for select using (true);
create policy "Basic Read Assign" on public.assignments for select using (true);
create policy "Basic Read Grades" on public.grades for select using (true);

create policy "Teacher full access Assign" on public.assignments for all using (
  exists (select 1 from public.classes where id = class_id and teacher_id = auth.uid())
);
create policy "Teacher full access Grades" on public.grades for all using (
  exists (
    select 1 from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_id and c.teacher_id = auth.uid()
  )
);

-- ==========================================
-- 11. SEED DATA (For Testing)
-- ==========================================
-- Insert Terms
insert into public.academic_terms (name, year, term, is_active) values ('2/2568', '2568', '2', true);
-- Insert Admin (You can manually update your user role to 'admin' after signup)
