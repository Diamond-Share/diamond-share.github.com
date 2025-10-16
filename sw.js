// Service Worker для фоновых уведомлений
const CACHE_NAME = 'notifications-v1';
const NOTIFICATION_INTERVAL = 20000; // 20 секунд

// Иконки в base64
const ICON = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiMyMTk2RjMiLz4KPHBhdGggZD0iTTI0IDMyTDMwIDM4TDQwIDI4IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K';

let backgroundTimer = null;
let notificationCount = 1;

// Установка Service Worker
self.addEventListener('install', event => {
    console.log('✅ Service Worker установлен');
    self.skipWaiting();
});

// Активация
self.addEventListener('activate', event => {
    console.log('✅ Service Worker активирован');
    event.waitUntil(self.clients.claim());
});

// Фоновая синхронизация
self.addEventListener('sync', event => {
    if (event.tag === 'background-notification') {
        console.log('🔄 Фоновая синхронизация');
        event.waitUntil(sendBackgroundNotification());
    }
});

// Обработка Push-сообщений
self.addEventListener('push', event => {
    console.log('📨 Получено Push-сообщение');
    
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        console.error('Ошибка парсинга push данных:', e);
    }

    const title = data.title || 'Фоновое уведомление';
    const body = data.body || `Новое уведомление в ${new Date().toLocaleTimeString()}`;

    event.waitUntil(
        self.registration.showNotification(title, {
            body: body,
            icon: ICON,
            badge: ICON,
            tag: `push-${Date.now()}`,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            actions: [
                {
                    action: 'open',
                    title: '📂 Открыть'
                },
                {
                    action: 'close',
                    title: '❌ Закрыть'
                }
            ]
        })
    );
});

// Клик по уведомлению
self.addEventListener('notificationclick', event => {
    console.log('🖱️ Клик по уведомлению:', event.action);
    
    event.notification.close();

    if (event.action === 'open' || event.action === '') {
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(clientList => {
                // Открываем/фокусируем окно
                for (const client of clientList) {
                    if (client.url === self.location.origin + '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (self.clients.openWindow) {
                    return self.clients.openWindow('/');
                }
            })
        );
    }
});

// Обработка сообщений от главной страницы
self.addEventListener('message', event => {
    console.log('📨 Сообщение от главной страницы:', event.data);
    
    if (event.data.type === 'START_BACKGROUND_NOTIFICATIONS') {
        startBackgroundNotifications(event.data.interval);
    } else if (event.data.type === 'STOP_BACKGROUND_NOTIFICATIONS') {
        stopBackgroundNotifications();
    }
});

// Запуск фоновых уведомлений
function startBackgroundNotifications(interval = NOTIFICATION_INTERVAL) {
    console.log('🚀 Запуск фоновых уведомлений');
    
    stopBackgroundNotifications();
    
    // Немедленно отправляем первое уведомление
    sendBackgroundNotification();
    
    // Запускаем интервал
    backgroundTimer = setInterval(() => {
        sendBackgroundNotification();
    }, interval);
}

// Остановка фоновых уведомлений
function stopBackgroundNotifications() {
    console.log('⏹️ Остановка фоновых уведомлений');
    
    if (backgroundTimer) {
        clearInterval(backgroundTimer);
        backgroundTimer = null;
    }
}

// Отправка фонового уведомления
async function sendBackgroundNotification() {
    const title = `Фоновое уведомление #${notificationCount}`;
    const body = `Время: ${new Date().toLocaleTimeString()}. Работает даже когда браузер закрыт!`;
    
    try {
        await self.registration.showNotification(title, {
            body: body,
            icon: ICON,
            badge: ICON,
            tag: `background-${notificationCount}`,
            requireInteraction: false,
            vibrate: [100, 50, 100],
            silent: false
        });
        
        console.log(`✅ Фоновое уведомление #${notificationCount} отправлено`);
        
        // Уведомляем главную страницу если она открыта
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'NOTIFICATION_SENT',
                title: title,
                count: notificationCount
            });
        });
        
        notificationCount++;
        
    } catch (error) {
        console.error('❌ Ошибка отправки уведомления:', error);
    }
}

// Периодическая синхронизация (для фоновой работы)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'background-notifications') {
        console.log('🔄 Периодическая синхронизация');
        event.waitUntil(sendBackgroundNotification());
    }
});
