#!/usr/bin/env python3
"""
Telegram Bot для очереди на стирку
Отправляет студентам их Chat ID для подключения уведомлений
"""

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

# Токен бота
BOT_TOKEN = "8008452513:AAFFoaZm8PGPHIllv8DG9Oirtmm1Aq-LidY"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start - отправляет Chat ID"""
    chat_id = update.effective_chat.id
    user = update.effective_user
    
    # Формируем сообщение
    message = (
        f"👋 *Привет, {user.first_name}!*\n\n"
        f"🔑 *Ваш Chat ID:*\n"
        f"`{chat_id}`\n\n"
        f"📱 *Что делать дальше:*\n"
        f"1️⃣ Скопируйте число выше (нажмите на него)\n"
        f"2️⃣ Откройте приложение очереди\n"
        f"3️⃣ Вставьте Chat ID в поле\n"
        f"4️⃣ Нажмите 'Подключить уведомления'\n\n"
        f"✅ После этого вы будете получать уведомления о вашей очереди!"
    )
    
    await update.message.reply_text(message, parse_mode='Markdown')
    print(f"✅ Sent Chat ID to {user.first_name} ({chat_id})")

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /help"""
    help_text = (
        "🧺 *Бот очереди на стирку*\n\n"
        "*Доступные команды:*\n"
        "/start - Получить ваш Chat ID\n"
        "/help - Показать эту справку\n\n"
        "*Как подключить уведомления:*\n"
        "1. Напишите /start\n"
        "2. Скопируйте Chat ID\n"
        "3. Вставьте в приложение\n"
        "4. Готово! ✅"
    )
    await update.message.reply_text(help_text, parse_mode='Markdown')

def main():
    """Запуск бота"""
    print("🤖 Запуск Telegram бота...")
    print(f"📝 Bot username: @keiin_dorm_laundry_bot")
    
    # Создаем приложение
    app = Application.builder().token(BOT_TOKEN).build()
    
    # Добавляем обработчики команд
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    
    # Запускаем бота
    print("✅ Бот запущен и готов к работе!")
    print("⏳ Ожидание сообщений...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 Бот остановлен")
    except Exception as e:
        print(f"❌ Ошибка: {e}")
