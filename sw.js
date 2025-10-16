// Service Worker для уведомлений
self.addEventListener('install', event => {
    console.log('✅ Service Worker установлен');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('✅ Service Worker активирован');
    event.waitUntil(self.clients.claim());
});

// Клик по уведомлению
self.addEventListener('notificationclick', event => {
    console.log('🖱️ Клик по уведомлению');
    event.notification.close();
    
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clientList => {
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
