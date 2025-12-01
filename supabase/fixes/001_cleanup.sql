-- 1. Убедиться, что user_id в students всегда UUID
ALTER TABLE students
    ALTER COLUMN user_id TYPE uuid
    USING NULLIF(user_id::text, '')::uuid;

-- 2. UNIQUE – пользователь может принадлежать только одному студенту
ALTER TABLE students
    ADD CONSTRAINT unique_user_id UNIQUE(user_id);

-- 3. Студенты не могут повторяться по ФИО и комнате
ALTER TABLE students
    ADD CONSTRAINT unique_student_fullname UNIQUE(full_name, room);

-- 4. Привязка истории к auth.users (если уже есть – пропустится)
DO $$
BEGIN
    ALTER TABLE history
        ADD CONSTRAINT history_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END$$;
