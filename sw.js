// Service Worker для фоновых уведомлений
const CACHE_NAME = 'notifications-v1';

// Иконки в base64
const ICON = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiMyMTk2RjMiLz4KPHBhdGggZD0iTTI0IDMyTDMwIDM4TDQwIDI4IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K';

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

// Обработка Push-сообщений (для настоящих push с сервера)
self.addEventListener('push', event => {
    console.log('📨 Получено Push-сообщение');
    
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        console.error('Ошибка парсинга push данных:', e);
        data = {
            title: 'Новое уведомление',
            body: `Время: ${new Date().toLocaleTimeString()}`
        };
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
            vibrate: [200, 100, 200]
        })
    );
});

// Клик по уведомлению
self.addEventListener('notificationclick', event => {
    console.log('🖱️ Клик по уведомлению');
    
    event.notification.close();

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clientList => {
            // Открываем/фокусируем окно
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow('/');
            }
        })
    );
});

// Обработка сообщений от главной страницы
self.addEventListener('message', event => {
    console.log('📨 Сообщение от главной страницы:', event.data);
    
    if (event.data && event.data.type === 'TEST_NOTIFICATION') {
        self.registration.showNotification(event.data.title, {
            body: event.data.body,
            icon: ICON,
            tag: 'test-notification'
        });
    }
});

// Периодическая синхронизация в фоне
self.addEventListener('periodicsync', event => {
    if (event.tag === 'background-notification') {
        console.log('🔄 Фоновая синхронизация');
        event.waitUntil(
            self.registration.showNotification('Фоновое уведомление', {
                body: `Синхронизация в ${new Date().toLocaleTimeString()}`,
                icon: ICON,
                tag: 'background-sync'
            })
        );
    }
});
