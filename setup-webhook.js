/**
 * Скрипт для настройки Telegram Webhook
 * Запускается ОДИН РАЗ после деплоя на Vercel
 */

const BOT_TOKEN = '8008452513:AAFFoaZm8PGPHIllv8DG9Oirtmm1Aq-LidY';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'YOUR_VERCEL_URL_HERE';

async function setWebhook() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
  
  console.log('🔧 Настройка webhook...');
  console.log('📍 Webhook URL:', WEBHOOK_URL);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${WEBHOOK_URL}/api/telegram/webhook`,
        allowed_updates: ['message'],
      }),
    });

    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Webhook установлен успешно!');
      console.log('📋 Ответ:', data);
    } else {
      console.error('❌ Ошибка:', data);
    }
  } catch (error) {
    console.error('❌ Ошибка при установке webhook:', error);
  }
}

async function getWebhookInfo() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
  
  console.log('\n📊 Проверка текущего webhook...');
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Информация о webhook:');
      console.log('   URL:', data.result.url || '(не установлен)');
      console.log('   Pending updates:', data.result.pending_update_count);
      if (data.result.last_error_message) {
        console.log('   ⚠️ Последняя ошибка:', data.result.last_error_message);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка при получении информации:', error);
  }
}

async function deleteWebhook() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`;
  
  console.log('\n🗑️ Удаление webhook...');
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Webhook удален');
    }
  } catch (error) {
    console.error('❌ Ошибка при удалении:', error);
  }
}

// Главная функция
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'delete') {
    await deleteWebhook();
  } else if (command === 'info') {
    await getWebhookInfo();
  } else if (command === 'set') {
    const customUrl = args[1];
    if (customUrl) {
      process.env.WEBHOOK_URL = customUrl;
    }
    
    if (!process.env.WEBHOOK_URL || process.env.WEBHOOK_URL === 'YOUR_VERCEL_URL_HERE') {
      console.error('❌ Ошибка: укажите WEBHOOK_URL');
      console.log('\nИспользование:');
      console.log('  node setup-webhook.js set https://your-app.vercel.app');
      console.log('  WEBHOOK_URL=https://your-app.vercel.app node setup-webhook.js set');
      process.exit(1);
    }
    
    await setWebhook();
    await getWebhookInfo();
  } else {
    console.log('📋 Использование:');
    console.log('  node setup-webhook.js set <url>   - установить webhook');
    console.log('  node setup-webhook.js info        - проверить статус');
    console.log('  node setup-webhook.js delete      - удалить webhook');
    console.log('\nПример:');
    console.log('  node setup-webhook.js set https://laundry-app-one.vercel.app');
  }
}

main();
