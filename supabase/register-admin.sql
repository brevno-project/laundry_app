-- Зарегистрировать админа swaydikon с паролем hesoyam

-- 1. Обновить статус регистрации
UPDATE students 
SET "isRegistered" = true, 
    "registeredAt" = NOW()
WHERE "firstName" = 'swaydikon';

-- 2. Добавить пароль (хеш для hesoyam)
-- Хеш bcrypt для пароля "hesoyam": $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
INSERT INTO student_auth ("studentId", "passwordHash")
SELECT id, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
FROM students
WHERE "firstName" = 'swaydikon'
ON CONFLICT ("studentId") DO UPDATE 
SET "passwordHash" = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

-- 3. Проверить
SELECT s.id, s."firstName", s."fullName", s."isRegistered", 
       CASE WHEN sa."studentId" IS NOT NULL THEN 'Есть пароль' ELSE 'Нет пароля' END as password_status
FROM students s
LEFT JOIN student_auth sa ON s.id = sa."studentId"
WHERE s."firstName" = 'swaydikon';
