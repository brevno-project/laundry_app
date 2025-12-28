"""
🔐 ОБНОВЛЕННЫЙ КОД ДЛЯ TELEGRAM БОТА
Скопируйте этот код в ваш файл бота (обычно bot.py или main.py)
"""

import os
import requests
from telegram import Update
from telegram.ext import ContextTypes

# ========================================
# ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
# ========================================
BASE_URL = os.getenv("BASE_URL", "https://laundryapp-one.vercel.app")
WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET")  # ✅ НОВАЯ ПЕРЕМЕННАЯ

# ========================================
# ОБРАБОТЧИК КОМАНДЫ /start
# ========================================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обработчик команды /start для подключения Telegram к студенту
    """
    if not update.message:
        return
    
    chat_id = update.message.chat_id
    
    # Получаем student_id из аргументов команды
    if context.args and len(context.args) > 0:
        student_id = context.args[0]
    else:
        await update.message.reply_text(
            "❌ Неправильный формат команды!\n\n"
            "Используйте ссылку из приложения для подключения Telegram."
        )
        return
    
    # Проверяем наличие секретного ключа
    if not WEBHOOK_SECRET:
        await update.message.reply_text(
            "❌ Ошибка конфигурации бота. Обратитесь к администратору."
        )
        print("❌ ERROR: TELEGRAM_WEBHOOK_SECRET not configured in bot environment")
        return
    
    try:
        print(f"🔔 Attempting to link Telegram for student: {student_id}")
        
        # ✅ ОТПРАВЛЯЕМ ЗАПРОС С СЕКРЕТНЫМ ЗАГОЛОВКОМ
        response = requests.post(
            f"{BASE_URL}/api/telegram/link",
            headers={
                "Content-Type": "application/json",
                "X-Telegram-Secret": WEBHOOK_SECRET  # ✅ ОБЯЗАТЕЛЬНЫЙ ЗАГОЛОВОК
            },
            json={
                "student_id": student_id,
                "telegram_chat_id": str(chat_id)
            },
            timeout=10
        )
        
        print(f"📡 Response status: {response.status_code}")
        
        # ========================================
        # ОБРАБОТКА ОТВЕТА
        # ========================================
        
        if response.status_code == 200:
            # ✅ Успешное подключение
            data = response.json()
            message = data.get('message', 'Telegram успешно подключен!')
            await update.message.reply_text(
                f"✅ {message}\n\n"
                f"Теперь вы будете получать уведомления о статусе очереди."
            )
            print(f"✅ Successfully linked Telegram for student: {student_id}")
            
        elif response.status_code == 401:
            # ❌ Неверный секретный ключ
            await update.message.reply_text(
                "❌ Ошибка авторизации. Обратитесь к администратору."
            )
            print(f"❌ Unauthorized: Invalid webhook secret")
            
        elif response.status_code == 404:
            # ❌ Студент не найден
            await update.message.reply_text(
                "❌ Студент не найден в базе данных.\n\n"
                "Убедитесь, что вы используете правильную ссылку из приложения."
            )
            print(f"❌ Student not found: {student_id}")
            
        elif response.status_code == 400:
            # ❌ Неверные данные
            await update.message.reply_text(
                "❌ Ошибка: неверные данные запроса."
            )
            print(f"❌ Bad request for student: {student_id}")
            
        elif response.status_code == 500:
            # ❌ Ошибка сервера
            error_data = response.json()
            error_message = error_data.get('error', 'Внутренняя ошибка сервера')
            await update.message.reply_text(
                f"❌ Ошибка сервера: {error_message}\n\n"
                f"Попробуйте позже или обратитесь к администратору."
            )
            print(f"❌ Server error: {error_message}")
            
        else:
            # ❌ Неизвестная ошибка
            await update.message.reply_text(
                f"❌ Неизвестная ошибка (код: {response.status_code})\n\n"
                f"Обратитесь к администратору."
            )
            print(f"❌ Unknown error: {response.status_code} - {response.text}")
            
    except requests.exceptions.Timeout:
        await update.message.reply_text(
            "❌ Превышено время ожидания ответа от сервера.\n\n"
            "Попробуйте позже."
        )
        print(f"❌ Timeout error for student: {student_id}")
        
    except requests.exceptions.ConnectionError:
        await update.message.reply_text(
            "❌ Ошибка подключения к серверу.\n\n"
            "Проверьте интернет-соединение или попробуйте позже."
        )
        print(f"❌ Connection error for student: {student_id}")
        
    except Exception as e:
        await update.message.reply_text(
            "❌ Произошла непредвиденная ошибка.\n\n"
            "Обратитесь к администратору."
        )
        print(f"❌ Unexpected error for student {student_id}: {str(e)}")


# ========================================
# ПРИМЕР РЕГИСТРАЦИИ ОБРАБОТЧИКА
# ========================================
# В вашем main() или setup():
# application.add_handler(CommandHandler("start", start))

"""
========================================
📝 ИНСТРУКЦИЯ ПО ПРИМЕНЕНИЮ
========================================

1. Скопируйте функцию start() в ваш файл бота

2. Добавьте в .env бота (или в переменные окружения на Render/Railway):
   TELEGRAM_WEBHOOK_SECRET=laundry_webhook_secret_key_2025

3. Убедитесь что BASE_URL указывает на ваш production URL:
   BASE_URL=https://laundryapp-one.vercel.app

4. Redeploy бота

5. Протестируйте:
   - Зайдите в приложение → Настройки → Подключить Telegram
   - Нажмите на ссылку
   - Отправьте /start в боте
   - Статус должен обновиться автоматически в приложении

========================================
🔍 ПРОВЕРКА ЛОГОВ
========================================

В логах бота должны появиться:
✅ Successfully linked Telegram for student: ...

В логах Vercel (Functions):
🔔 Telegram link request: { student_id: '...', telegram_chat_id: '...' }
👤 Current student data: { ... }
✅ Telegram linked successfully: { ... }

========================================
⚠️ ВАЖНО
========================================

- Секретный ключ должен совпадать в боте и в Vercel
- Не коммитьте .env файл в Git
- Используйте переменные окружения на сервере
"""
