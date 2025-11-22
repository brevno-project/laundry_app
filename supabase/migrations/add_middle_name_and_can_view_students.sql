-- Добавляем поле middle_name (отчество) в таблицу students
ALTER TABLE students
ADD COLUMN IF NOT EXISTS middle_name TEXT;

-- Добавляем поле can_view_students (может ли студент видеть список студентов)
ALTER TABLE students
ADD COLUMN IF NOT EXISTS can_view_students BOOLEAN DEFAULT FALSE;

-- Комментарии для полей
COMMENT ON COLUMN students.middle_name IS 'Отчество студента (необязательно)';
COMMENT ON COLUMN students.can_view_students IS 'Может ли студент видеть список всех студентов';
