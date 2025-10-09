// sw.js - простой Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
    let data = { title: 'Новое уведомление', body: 'У вас новое сообщение' };
    
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (error) {
        data.body = event.data.text() || data.body;
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: 'https://yastatic.net/s3/cloud/yc-web/1.0.0/yc-favicon.png',
            badge: 'https://yastatic.net/s3/cloud/yc-web/1.0.0/yc-favicon.png'
        })
    );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({type: 'window'}).then((clientList) => {
            for (const client of clientList) {
                if (client.url === self.location.origin && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(self.location.origin);
            }
        })
    );
});
