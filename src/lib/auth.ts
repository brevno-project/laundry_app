// Безопасное хеширование паролей для продакшена
import bcrypt from 'bcrypt';

// Количество раундов для bcrypt (рекомендуется 12 для продакшена)
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

// Генерация случайного ID для пользователя
export function generateUserId(): string {
  return crypto.randomUUID();
}