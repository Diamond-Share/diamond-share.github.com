// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Инициализация Firebase с твоими данными
firebase.initializeApp({
  apiKey: "AIzaSyDvvp3qyBsQsZQfuwaImeZUZ4C0M9I912Q",
  authDomain: "skyberry-a31d8.firebaseapp.com",
  projectId: "skyberry-a31d8",
  storageBucket: "skyberry-a31d8.firebasestorage.app",
  messagingSenderId: "942887528624",
  appId: "1:942887528624:web:537f9f76d79d81be89b375"
});

const messaging = firebase.messaging();

// Обработчик установки Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker установлен');
  self.skipWaiting(); // Активируем сразу
});

// Обработчик активации Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker активирован');
  event.waitUntil(self.clients.claim()); // Берем управление всеми клиентами
});

// Обработка фоновых сообщений (когда сайт закрыт)
messaging.setBackgroundMessageHandler(function(payload) {
  console.log('Получено фоновое сообщение:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icon.png',
    badge: '/icon.png',
    data: payload.data || {}
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', function(event) {
  console.log('Уведомление кликнуто:', event.notification);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data.click_action || self.location.origin + '/';
  
  // Открываем страницу при клике
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(function(clientList) {
      // Ищем уже открытую вкладку с нашим сайтом
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Если не нашли, открываем новую вкладку
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
