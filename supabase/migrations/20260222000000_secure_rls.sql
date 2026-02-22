-- Migration: 20260222000000_secure_rls.sql
-- Description: Ultimate fix for Row Level Security (RLS) recursion using Security Definer Helpers

-- ==========================================
-- 1. CLEANUP (Drop ALL existing conflicting policies to ensure a clean slate)
-- ==========================================
-- Enrollments
DROP POLICY IF EXISTS "Basic Read" ON public.enrollments;
DROP POLICY IF EXISTS "Students view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers view enrollments for their classes" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can insert enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can delete enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin full access on enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Enrollments Admin" ON public.enrollments;
DROP POLICY IF EXISTS "Enrollments Teacher" ON public.enrollments;
DROP POLICY IF EXISTS "Enrollments Student" ON public.enrollments;

-- Assignments
DROP POLICY IF EXISTS "Basic Read Assign" ON public.assignments;
DROP POLICY IF EXISTS "Students view enrolled class assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers view assignments for their classes" ON public.assignments;
DROP POLICY IF EXISTS "Admin full access on assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teacher full access Assign" ON public.assignments;
DROP POLICY IF EXISTS "Assignments Admin" ON public.assignments;
DROP POLICY IF EXISTS "Assignments Teacher" ON public.assignments;
DROP POLICY IF EXISTS "Assignments Student" ON public.assignments;

-- Grades
DROP POLICY IF EXISTS "Basic Read Grades" ON public.grades;
DROP POLICY IF EXISTS "Students view own grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers view grades for their classes" ON public.grades;
DROP POLICY IF EXISTS "Admin full access on grades" ON public.grades;
DROP POLICY IF EXISTS "Teacher full access Grades" ON public.grades;
DROP POLICY IF EXISTS "Grades Admin" ON public.grades;
DROP POLICY IF EXISTS "Grades Teacher" ON public.grades;
DROP POLICY IF EXISTS "Grades Student" ON public.grades;

-- Classes
DROP POLICY IF EXISTS "Students view enrolled classes" ON public.classes;
DROP POLICY IF EXISTS "Admin full access on classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers view own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can delete their classes" ON public.classes;
DROP POLICY IF EXISTS "Classes Admin" ON public.classes;
DROP POLICY IF EXISTS "Classes Teacher" ON public.classes;
DROP POLICY IF EXISTS "Classes Student" ON public.classes;


-- ==========================================
-- 2. SECURITY DEFINER HELPERS
-- These functions bypass RLS when executed, breaking any infinite recursion loops.
-- ==========================================

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER;

-- Get student ID for current user
CREATE OR REPLACE FUNCTION public.auth_student_id()
RETURNS uuid AS $$
  SELECT id FROM public.students WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get class IDs managed by current teacher
CREATE OR REPLACE FUNCTION public.auth_teacher_class_ids()
RETURNS SETOF uuid AS $$
  SELECT id FROM public.classes WHERE teacher_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Get class IDs student is enrolled in
CREATE OR REPLACE FUNCTION public.auth_student_class_ids()
RETURNS SETOF uuid AS $$
  SELECT class_id FROM public.enrollments WHERE student_id = public.auth_student_id();
$$ LANGUAGE sql SECURITY DEFINER;

-- Get assignment IDs for current teacher's classes
CREATE OR REPLACE FUNCTION public.auth_teacher_assignment_ids()
RETURNS SETOF uuid AS $$
  SELECT id FROM public.assignments WHERE class_id IN (SELECT public.auth_teacher_class_ids());
$$ LANGUAGE sql SECURITY DEFINER;


-- ==========================================
-- 3. APPLY NEW OPTIMIZED POLICIES
-- ==========================================

-- CLASSES
CREATE POLICY "Classes Admin" ON public.classes FOR ALL USING (public.is_admin());
CREATE POLICY "Classes Teacher" ON public.classes FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "Classes Student" ON public.classes FOR SELECT USING (id IN (SELECT public.auth_student_class_ids()));

-- ENROLLMENTS
CREATE POLICY "Enrollments Admin" ON public.enrollments FOR ALL USING (public.is_admin());
CREATE POLICY "Enrollments Teacher" ON public.enrollments FOR ALL USING (class_id IN (SELECT public.auth_teacher_class_ids()));
CREATE POLICY "Enrollments Student" ON public.enrollments FOR SELECT USING (student_id = public.auth_student_id());

-- ASSIGNMENTS
CREATE POLICY "Assignments Admin" ON public.assignments FOR ALL USING (public.is_admin());
CREATE POLICY "Assignments Teacher" ON public.assignments FOR ALL USING (class_id IN (SELECT public.auth_teacher_class_ids()));
CREATE POLICY "Assignments Student" ON public.assignments FOR SELECT USING (class_id IN (SELECT public.auth_student_class_ids()));

-- GRADES
CREATE POLICY "Grades Admin" ON public.grades FOR ALL USING (public.is_admin());
CREATE POLICY "Grades Teacher" ON public.grades FOR ALL USING (assignment_id IN (SELECT public.auth_teacher_assignment_ids()));
CREATE POLICY "Grades Student" ON public.grades FOR SELECT USING (student_id = public.auth_student_id());
