// Добавьте в начало app.is
// Добавить в начало app.js
const APP_VERSION = "2.3"; // Версия приложения

const IMGBB_API_KEY = "a6b6b72c5fa8d86d7cc4a27da5464e0f";

const AVATAR_UPLOAD_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

// Функция для проверки версии
async function checkAppVersion() {
  try {
    const versionSnapshot = await db.ref('appVersion').once('value');
    const dbVersion = versionSnapshot.val();
    
    if (dbVersion !== APP_VERSION) {
      // Версии не совпадают - перенаправляем на страницу ошибки
      window.location.href = 'errorapp.html';
      return false;
    }
    return true;
  } catch (error) {
    console.error('Ошибка проверки версии:', error);
    // В случае ошибки лучше позволить приложению работать
    return true;
  }
}

function handleDeepLink() {
    // Проверяем, был ли переход по deep link
    const url = new URL(window.location.href);
    const path = url.pathname; // Например: "/@support"

    // Извлекаем username (например, "@support")
    const usernameMatch = path.match(/^\/(@\w+)/);
    if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];

        // Проверяем, загружены ли контакты
        if (contacts && contacts.includes(username)) {
            openChat(username, username); // Открываем чат
        } else {
            // Если контакта нет, добавляем его
            addContact(username).then(() => {
                openChat(username, username);
            }).catch(error => {
                console.error("Ошибка:", error);
                showAlert("Не удалось открыть чат с пользователем " + username);
            });
        }
    }
}

async function uploadImageToImgBB(file) {
  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_API_KEY);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      return data.data.url;
    } else {
      throw new Error(data.error?.message || 'Failed to upload image');
    }
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
}

// Вызываем при загрузке приложения
window.addEventListener('load', handleDeepLink);

// Заменяем прямой импорт Firebase на динамическую загрузку
async function loadFirebase() {
  if (!window.firebase) {
    await Promise.all([
      loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js'),
      loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js'),
      loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js')
    ]);
  }
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Добавляем кэширование сообщений и батчинг
let messageCache = new Map();
let messageBatch = [];
const BATCH_SIZE = 5;
const BATCH_TIMEOUT = 100;

// Кэширование сообщений для каждого чата
let cachedMessages = {};
let isFirstLoad = true;

async function processMessageBatch() {
  if (messageBatch.length === 0) return;
  
  const batchToSend = [...messageBatch];
  messageBatch = [];
  
  try {
    if (currentChat === 'general') {
      const updates = {};
      batchToSend.forEach(msg => {
        updates[`messages/general/${msg.id}`] = msg;
      });
      await db.ref().update(updates);
    } else {
      const chatRef = [currentUser.nickname, currentChat].sort().join('_');
      const updates = {};
      batchToSend.forEach(msg => {
        updates[`messages/private/${chatRef}/${msg.id}`] = msg;
      });
      await db.ref().update(updates);
    }
  } catch (error) {
    console.error('Error sending message batch:', error);
  }
}

// Добавляем виртуализацию для длинных списков сообщений
function setupMessageVirtualization() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const messageId = entry.target.dataset.messageId;
        if (!messageCache.has(messageId)) {
          // Загружаем содержимое сообщения при необходимости
        }
      }
    });
  }, { root: messagesDiv, threshold: 0.1 });

  document.querySelectorAll('.message').forEach(msg => {
    observer.observe(msg);
  });
}

// Используем DocumentFragment для массового добавления элементов
function renderChatList(contacts) {
  const fragment = document.createDocumentFragment();
  
  contacts.forEach(contact => {
    const chatItem = createChatItem(contact);
    fragment.appendChild(chatItem);
  });
  
  chatsList.innerHTML = '';
  chatsList.appendChild(fragment);
}

function createChatItem(contact) {
  const chatItem = document.createElement('div');
  chatItem.className = 'chat-item';
  chatItem.dataset.chatId = contact.id;
  
  const avatarContent = contact.avatarUrl 
    ? `<img src="${contact.avatarUrl}" alt="${contact.username}">` 
    : contact.username.charAt(0).toUpperCase();
  
  const verifiedBadge = verifiedUsers.includes(contact.id) 
    ? '<span class="verified-badge"><i class="fas fa-check-circle"></i></span>' 
    : '';
  
  chatItem.innerHTML = `
    <div class="chat-avatar">${avatarContent}</div>
    <div class="chat-info">
      <div class="chat-name">${contact.username}${verifiedBadge}</div>
      <div class="chat-last-msg">${contact.status}</div>
    </div>
  `;
  
  chatItem.addEventListener('click', () => openChat(contact.id, contact.username, contact.avatarUrl));
  return chatItem;
}

// Используем CSS will-change для элементов с анимациями
function optimizeAnimations() {
  const animatedElements = [
    '.message',
    '.chat-item',
    '.modal-content',
    '.attachment-menu'
  ];
  
  animatedElements.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.style.willChange = 'transform, opacity';
    });
  });
}

const firebaseConfig = {
  apiKey: "AIzaSyB0ca3id5sWRk4a49s6OnYhpGQEtpi_h9Q",
  authDomain: "diamond-russia-8e454.firebaseapp.com",
  databaseURL: "https://diamond-russia-8e454-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "diamond-russia-8e454",
  storageBucket: "diamond-russia-8e454.appspot.com",
  messagingSenderId: "735387033487",
  appId: "1:735387033487:web:7ec3ff71a2aaed612775fa",
  measurementId: "G-5QQE8WH2SC"
};

let app, db;

async function initializeFirebase() {
  await loadFirebase();
  app = firebase.initializeApp(firebaseConfig);
  db = firebase.database();
}

let searchContainer, searchInput, searchResults, searchBackBtn, clearSearchBtn;
let allUsers = [];
let searchTimeout = null;

let currentUser = null;
let currentChat = null;
let contacts = [];
let chatListeners = {};
let selectedMessage = null;
let selectedChatForForward = null;

const verifiedUsers = [
  '@han',
  '@none',
  '@support',
  '@NoGeto',
  '@hhh24_ll',
  '@mattakushi'
];

const stickerPacks = {
  panda: 20,
  cat: 20,
  dog: 16,
  bigi: 48,
  akio: 48,
  rebi: 48,
  tatti: 48,
  work: 24,
  belka: 48
};

let currentSettings = {
  theme: 'light',
  notifications: {
    enabled: true,
    sounds: true,
    vibration: true
  }
};

const screens = {
  welcome: document.getElementById('welcome-screen'),
  username: document.getElementById('username-screen'),
  password: document.getElementById('password-screen'),
  register: document.getElementById('register-screen'),
  app: document.getElementById('app'),
  settings: document.getElementById('settings-screen'),
  notifications: document.getElementById('notifications-screen'),
  privacy: document.getElementById('privacy-screen'),
  appearance: document.getElementById('appearance-screen'),
  help: document.getElementById('help-screen'),
  qrModal: document.getElementById('qr-modal'),
  preferences: document.getElementById('preferences-screen') // Убедитесь, что этот элемент есть в HTML
};

const chatsList = document.getElementById('chats-list');
const chatView = document.getElementById('chat-view');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const backBtn = document.getElementById('back-btn');
const chatTitle = document.getElementById('chat-title');
const chatStatus = document.getElementById('chat-status');
const chatHeaderAvatar = document.getElementById('chat-header-avatar');
const chatHeaderAvatarText = document.getElementById('chat-header-avatar-text');
const userAvatar = document.getElementById('user-avatar');
const userAvatarText = document.getElementById('user-avatar-text');
const addChatBtn = document.getElementById('add-chat-btn');
const attachmentBtn = document.getElementById('attachment-btn');
const attachmentMenu = document.getElementById('attachment-menu');
const typingIndicator = document.getElementById('typing-indicator');
const emojiBtn = document.getElementById('emoji-btn');

const bottomNavItems = document.querySelectorAll('.nav-item');

const settingsBackBtn = document.getElementById('settings-back-btn');
const settingsEditBtn = document.getElementById('settings-edit-btn');
const settingsAvatar = document.getElementById('settings-avatar');
const settingsAvatarText = document.getElementById('settings-avatar-text');
const settingsProfileName = document.getElementById('settings-profile-name');
const settingsProfileUsername = document.getElementById('settings-profile-username');
const settingsLogoutBtn = document.getElementById('settings-logout-btn');
const settingsDeleteBtn = document.getElementById('settings-delete-btn');
const settingsQrBtn = document.getElementById('settings-qr-btn');

const notificationsBackBtn = document.getElementById('notifications-back-btn');

const qrClose = document.getElementById('qr-close');
const qrCode = document.getElementById('qr-code');
const qrUsername = document.getElementById('qr-username');

const deleteModal = document.getElementById('delete-modal');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm = document.getElementById('delete-confirm');

const addChatModal = document.getElementById('add-chat-modal');
const contactTab = document.querySelector('.tab[data-tab="contact"]');
const groupTab = document.querySelector('.tab[data-tab="group"]');
const contactTabContent = document.getElementById('contact-tab-content');
const groupTabContent = document.getElementById('group-tab-content');
const contactUsernameInput = document.getElementById('contact-username');
const confirmAddContact = document.getElementById('confirm-add-contact');
const cancelAddContact = document.getElementById('cancel-add-contact');

const groupNameInput = document.getElementById('group-name');
const groupMembersInput = document.getElementById('group-members');
const confirmCreateGroup = document.getElementById('confirm-create-group');
const cancelCreateGroup = document.getElementById('cancel-create-group');

const shareModal = document.getElementById('share-modal');
const copyShareLink = document.getElementById('copy-share-link');
const shareTelegramBtn = document.getElementById('share-telegram');
const shareWhatsappBtn = document.getElementById('share-whatsapp');

const imagePreviewModal = document.getElementById('image-preview-modal');
const previewImage = document.getElementById('preview-image');
const closePreview = document.getElementById('close-preview');

const stickersModal = document.getElementById('stickers-modal');
const stickersContainer = document.getElementById('stickers-container');
const closeStickers = document.getElementById('close-stickers');

const messageContextMenu = document.createElement('div');
messageContextMenu.id = 'message-context-menu';
messageContextMenu.className = 'message-context-menu';
messageContextMenu.innerHTML = `
  <div class="context-menu-item" id="copy-message">
    <i class="fas fa-copy"></i> Копировать
  </div>
  <div class="context-menu-item" id="reply-message">
    <i class="fas fa-reply"></i> Ответить
  </div>
  <div class="context-menu-item" id="forward-message">
    <i class="fas fa-share"></i> Переслать
  </div>
  <div class="context-menu-item" id="delete-message">
    <i class="fas fa-trash"></i> Удалить
  </div>
`;
document.body.appendChild(messageContextMenu);

const forwardModal = document.createElement('div');
forwardModal.id = 'forward-modal';
forwardModal.className = 'modal';
forwardModal.innerHTML = `
  <div class="modal-content">
    <h3 class="modal-title">Переслать сообщение</h3>
    <div class="modal-body">
      <div id="forward-chats-list" class="chats-list"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancel-forward">Отмена</button>
      <button class="btn btn-primary" id="confirm-forward">Переслать</button>
    </div>
  </div>
`;
document.body.appendChild(forwardModal);

function renderEmptyChatState() {
  messagesDiv.innerHTML = `
    <div class="empty-chat animate__animated animate__fadeIn">
      <div class="empty-chat-icon">
        <i class="fas fa-comment-slash"></i>
      </div>
      <h3 class="empty-chat-title">Чат пуст</h3>
      <p class="empty-chat-text">Напишите первое сообщение, чтобы начать общение</p>
      <div class="empty-chat-hint">
        <i class="fas fa-arrow-down"></i>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    const arrow = document.querySelector('.empty-chat-hint i');
    arrow.classList.add('animate__animated', 'animate__bounce', 'animate__infinite');
  }, 2000);
}

function showFirstMessageHint() {
  const hint = document.createElement('div');
  hint.className = 'first-message-hint animate__animated animate__fadeInUp';
  hint.innerHTML = `
    <div class="hint-content">
      <p>Напишите "Привет" чтобы начать общение</p>
      <button class="hint-action" id="send-hello">Отправить приветствие</button>
    </div>
  `;
  
  messagesDiv.appendChild(hint);
  
  document.getElementById('send-hello').addEventListener('click', () => {
    messageInput.value = 'Привет! 👋';
    sendMessage();
    hint.classList.add('animate__fadeOut');
    setTimeout(() => hint.remove(), 300);
  });
}

function showAlert(message, title = 'Уведомление', callback = null) {
  const modal = document.getElementById('custom-modal');
  const modalTitle = document.getElementById('custom-modal-title');
  const modalBody = document.getElementById('custom-modal-body');
  const modalFooter = document.getElementById('custom-modal-footer');
  const confirmBtn = document.getElementById('custom-modal-confirm');
  const cancelBtn = document.getElementById('custom-modal-cancel');
  
  modalTitle.textContent = title;
  modalBody.textContent = message;
  
  cancelBtn.style.display = 'none';
  confirmBtn.textContent = 'OK';
  
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newConfirmBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    if (callback) callback(true);
  });
  
  document.getElementById('custom-modal-close').addEventListener('click', () => {
    modal.style.display = 'none';
    if (callback) callback(false);
  });
  
  modal.style.display = 'flex';
}

function showConfirm(message, title = 'Подтверждение', callback = null) {
  const modal = document.getElementById('custom-modal');
  const modalTitle = document.getElementById('custom-modal-title');
  const modalBody = document.getElementById('custom-modal-body');
  const modalFooter = document.getElementById('custom-modal-footer');
  const confirmBtn = document.getElementById('custom-modal-confirm');
  const cancelBtn = document.getElementById('custom-modal-cancel');
  
  modalTitle.textContent = title;
  modalBody.textContent = message;
  
  cancelBtn.style.display = 'block';
  confirmBtn.textContent = 'Да';
  cancelBtn.textContent = 'Нет';
  
  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
  newConfirmBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    if (callback) callback(true);
  });
  
  newCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    if (callback) callback(false);
  });
  
  document.getElementById('custom-modal-close').addEventListener('click', () => {
    modal.style.display = 'none';
    if (callback) callback(false);
  });
  
  modal.style.display = 'flex';
}

async function showPrompt(message, title = 'Введите данные', defaultValue = '', callback = null) {
  const modal = document.getElementById('custom-modal');
  const modalTitle = document.getElementById('custom-modal-title');
  const modalBody = document.getElementById('custom-modal-body');
  const modalFooter = document.getElementById('custom-modal-footer');
  const confirmBtn = document.getElementById('custom-modal-confirm');
  const cancelBtn = document.getElementById('custom-modal-cancel');
  
  modalTitle.textContent = title;
  
  modalBody.innerHTML = `
    <p style="margin-bottom: 12px;">${message}</p>
    <input type="text" class="modal-input" id="custom-modal-input" value="${defaultValue}" style="width: 100%;">
  `;
  
  cancelBtn.style.display = 'block';
  confirmBtn.textContent = 'OK';
  cancelBtn.textContent = 'Отмена';
  
  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
  const inputField = document.getElementById('custom-modal-input');
  
  newConfirmBtn.addEventListener('click', () => {
    const value = inputField.value;
    modal.style.display = 'none';
    if (callback) callback(value);
  });
  
  newCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    if (callback) callback(null);
  });
  
  document.getElementById('custom-modal-close').addEventListener('click', () => {
    modal.style.display = 'none';
    if (callback) callback(null);
  });
  
  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const value = inputField.value;
      modal.style.display = 'none';
      if (callback) callback(value);
    }
  });
  
  modal.style.display = 'flex';
  inputField.focus();
  inputField.select();
}

window.alert = showAlert;

function showScreen(screenName) {
  const newScreen = screens[screenName];
  
  if (!newScreen) {
    console.error('Screen element not found:', screenName);
    return;
  }
  
  const currentScreen = document.querySelector('.screen:not(.hidden)');
  
  if (currentScreen) {
    currentScreen.classList.add('hidden', 'fade-out');
    
    setTimeout(() => {
      Object.values(screens).forEach(screen => {
        if (screen) { // Добавляем проверку
          screen.style.display = 'none';
          screen.classList.remove('hidden', 'fade-out', 'fade-in');
        }
      });
      
      newScreen.style.display = 'flex';
      newScreen.classList.add('fade-in');
    }, 300);
  } else {
    Object.values(screens).forEach(screen => {
      if (screen) screen.style.display = 'none';
    });
    newScreen.style.display = 'flex';
  }
}

// Новая функция для предзагрузки данных
async function preloadData() {
  try {
    const snapshot = await db.ref(`users/${currentUser.nickname}/contacts`).once('value');
    contacts = snapshot.val() ? Object.keys(snapshot.val()) : [];
    
    // Предзагружаем сообщения для каждого чата
    for (const contactId of contacts) {
      let messagesRef;
      if (contactId === 'general') {
        messagesRef = db.ref('messages/general');
      } else {
        const chatRef = [currentUser.nickname, contactId].sort().join('_');
        messagesRef = db.ref(`messages/private/${chatRef}`);
      }
      
      const messagesSnapshot = await messagesRef.once('value');
      const messages = [];
      messagesSnapshot.forEach(child => {
        messages.push(child.val());
      });
      
      cachedMessages[contactId] = messages.sort((a, b) => a.timestamp - b.timestamp);
    }
  } catch (error) {
    console.error('Error preloading data:', error);
  }
}

// Функция для рендеринга кэшированных сообщений
function renderCachedMessages(chatId) {
  const messages = cachedMessages[chatId] || [];
  if (messages.length === 0) {
    renderEmptyChatState();
    return;
  }

  const fragment = document.createDocumentFragment();
  
  messages.forEach(msg => {
    const messageDiv = createMessageElement(msg);
    fragment.appendChild(messageDiv);
  });

  messagesDiv.innerHTML = '';
  messagesDiv.appendChild(fragment);
  scrollToBottom();
}

// Создание элемента сообщения
function createMessageElement(msg) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${msg.user === currentUser.username ? 'outgoing' : 'incoming'}`;
  messageDiv.dataset.messageId = msg.timestamp;
  messageDiv.dataset.messageType = msg.type;
  
  const time = new Date(msg.timestamp);
  const timeString = time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  let statusIcon = '';
  if (msg.user === currentUser.username) {
    statusIcon = '<i class="fas fa-check"></i>';
    if (msg.read) {
      statusIcon = '<i class="fas fa-check-double" style="color: #589d52;"></i>';
    }
  }

  let content = '';
  if (msg.type === 'text') {
    content = `
      <div class="message-bubble">
        ${msg.replyTo ? createReplyContent(msg.replyTo) : ''}
        <div class="message-text">${msg.text}</div>
        <div class="message-meta">
          <div class="message-time">${timeString}</div>
          ${statusIcon}
        </div>
      </div>
    `;
  } else if (msg.type === 'sticker') {
    content = `
      <div class="message-bubble">
        <img src="stickers/${msg.stickerPack}/${msg.stickerNumber}.png" 
             class="message-sticker" 
             alt="${msg.stickerPack} sticker">
        <div class="message-meta">
          <div class="message-time">${timeString}</div>
          ${statusIcon}
        </div>
      </div>
    `;
  } else if (msg.type === 'image') {
    content = `
      <div class="message-bubble">
        <img src="${msg.imageUrl}" 
             class="message-image" 
             alt="Uploaded image"
             onclick="showImagePreview('${msg.imageUrl}')">
        <div class="message-meta">
          <div class="message-time">${timeString}</div>
          ${statusIcon}
        </div>
      </div>
    `;
  }

  messageDiv.innerHTML = content;
  messageDiv.addEventListener('contextmenu', handleContextMenu);
  return messageDiv;
}

function showImagePreview(imageUrl) {
  previewImage.src = imageUrl;
  imagePreviewModal.style.display = 'flex';
}

function createReplyContent(replyTo) {
  if (replyTo.type === 'sticker') {
    return `
      <div class="message-reply">
        <div class="reply-header">Ответ на стикер</div>
        <div class="reply-sticker-indicator">
          <i class="fas fa-sticker"></i>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="message-reply">
        <div class="reply-header">${replyTo.user === currentUser.username ? 'Вы' : replyTo.user}</div>
        <div class="reply-text">${replyTo.text}</div>
      </div>
    `;
  }
}

// Функция для прокрутки вниз
function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function init() {
  await initializeFirebase();
  
  const versionValid = await checkAppVersion();
  if (!versionValid) return;
  
  try {
    const statusSnapshot = await db.ref('appStatus').once('value');
    const appStatus = statusSnapshot.val();
    
    if (appStatus && appStatus.maintenanceMode) {
      showAlert(appStatus.maintenanceMessage || 'Приложение временно недоступно. Идут технические работы.', 'Технические работы');
      return;
    }
    
    if (appStatus && appStatus.updateMode) {
      showAlert(appStatus.updateMessage || 'Доступна новая версия приложения. Пожалуйста, обновите приложение.', 'Требуется обновление');
      return;
    }
  } catch (error) {
    console.error('Error checking app status:', error);
  }
  
  // Инициализация поиска
  initSearch();
  
  loadUser();
  loadSettings();
  setupEventListeners();
  optimizeAnimations();
  
  document.querySelectorAll('.auth-screen, .welcome-screen').forEach(screen => {
    screen.classList.add('screen');
  });
  
  if (currentUser) {
    await preloadData();
    showApp();
    
    window.addEventListener('focus', () => setOnlineStatus(true));
    window.addEventListener('blur', () => setOnlineStatus(false));
    setOnlineStatus(true);
  } else {
    screens.welcome.style.display = 'flex';
    setTimeout(() => {
      document.querySelector('.welcome-logo').classList.add('animate__bounceIn');
      document.querySelector('.welcome-title').classList.add('animate__fadeInUp');
      document.querySelector('.welcome-subtitle').classList.add('animate__fadeInUp');
      document.querySelector('.welcome-footer').classList.add('animate__fadeInUp');
    }, 100);
  }
}

function loadUser() {
  const user = localStorage.getItem('currentUser');
  if (user) {
    currentUser = JSON.parse(user);
    if (!currentUser.avatarUrl) {
      currentUser.avatarUrl = 'avatar/1.png';
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
  }
}

function loadSettings() {
  const settings = localStorage.getItem('userSettings');
  if (settings) currentSettings = JSON.parse(settings);
  applyTheme(currentSettings.theme);
}

function applyTheme(theme) {
  const themes = {
    light: {
      '--primary': '#3b82f6',
      '--primary-dark': '#2563eb',
      '--bg': '#f8fafc',
      '--card': '#ffffff',
      '--text': '#1e293b'
    },
    dark: {
      '--primary': '#6366f1',
      '--primary-dark': '#4f46e5',
      '--bg': '#0f172a',
      '--card': '#1e293b',
      '--text': '#f8fafc'
    }
  };
  
  const selectedTheme = themes[theme] || themes.light;
  for (const [key, value] of Object.entries(selectedTheme)) {
    document.documentElement.style.setProperty(key, value);
  }

  currentSettings.theme = theme;
  localStorage.setItem('userSettings', JSON.stringify(currentSettings));
  document.documentElement.setAttribute('data-theme', theme);
}

async function generateQRCode(username) {
  try {
    qrCode.innerHTML = '';
    
    const qr = new QRCode(qrCode, {
      text: `diamondshare:user:${username}`,
      width: 200,
      height: 200,
      colorDark: "#3b82f6",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
    
    qrUsername.textContent = `@${username}`;
    
    // Добавляем hover эффект
    const qrContainer = document.querySelector('.qr-content');
    qrContainer.addEventListener('mouseenter', () => {
      qrCode.style.opacity = '0.3';
      const tooltip = document.createElement('div');
      tooltip.className = 'qr-tooltip';
      tooltip.textContent = `@${username}`;
      tooltip.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10;
        pointer-events: none;
      `;
      qrContainer.appendChild(tooltip);
    });
    
    qrContainer.addEventListener('mouseleave', () => {
      qrCode.style.opacity = '1';
      const tooltip = qrContainer.querySelector('.qr-tooltip');
      if (tooltip) tooltip.remove();
    });
  } catch (error) {
    console.error('QR generation error:', error);
  }
}

function showApp() {
  showScreen('app');
  
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'chats-tabs';
  tabsContainer.innerHTML = `
    <div class="chat-tab active" data-tab="all">Все</div>
    <div class="chat-tab" data-tab="new"></div>
  `;
  chatsList.prepend(tabsContainer);
  
  document.querySelectorAll('.chat-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });
  
  if (currentUser) {
    userAvatarText.textContent = currentUser.username.charAt(0).toUpperCase();
    settingsProfileName.textContent = currentUser.username;
    settingsProfileUsername.textContent = currentUser.nickname;
    settingsAvatarText.textContent = currentUser.username.charAt(0).toUpperCase();
    
    if (currentUser.avatarUrl) {
      userAvatar.innerHTML = `<img src="${currentUser.avatarUrl}" alt="Avatar">`;
      settingsAvatar.innerHTML = `<img src="${currentUser.avatarUrl}" alt="Avatar">`;
    }
    
    loadContacts();
  }
}

function showSettings() {
  showScreen('settings');
}

function setupEventListeners() {
  document.getElementById('welcome-continue-btn').addEventListener('click', function() {
    this.classList.add('clicked');
    setTimeout(() => {
      screens.welcome.style.display = 'none';
      screens.username.style.display = 'flex';
      document.querySelectorAll('.input-group, .auth-btn').forEach((el, i) => {
        setTimeout(() => {
          el.classList.add('animate__fadeIn');
        }, i * 150);
      });
    }, 500);
  });
  
  document.querySelector('.settings-tile[onclick="showPreferences()"]').addEventListener('click', showPreferences);
  
  document.getElementById('login-username').addEventListener('input', (e) => {
    const username = e.target.value.trim();
    document.getElementById('login-continue-btn').disabled = !username;
    
    if (username && !username.startsWith('@')) {
      e.target.value = '@' + username;
    }
  });
  
  document.getElementById('login-continue-btn').addEventListener('click', () => {
    const username = document.getElementById('login-username').value.trim();
    if (!username) return;
    
    checkUserExists(username).then(exists => {
      if (exists) {
        screens.username.style.display = 'none';
        screens.password.style.display = 'flex';
      } else {
        screens.username.style.display = 'none';
        screens.register.style.display = 'flex';
        document.getElementById('register-username').value = username;
      }
    }).catch(error => {
      showError(document.getElementById('username-error'), 'Ошибка проверки пользователя');
      console.error('Error checking user:', error);
    });
  });
  
  document.getElementById('back-to-username').addEventListener('click', () => {
    screens.password.style.display = 'none';
    screens.username.style.display = 'flex';
  });

  document.getElementById('back-to-login').addEventListener('click', () => {
    screens.register.style.display = 'none';
    screens.password.style.display = 'flex';
  });
  
  document.getElementById('switch-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    screens.password.style.display = 'none';
    screens.register.style.display = 'flex';
    document.getElementById('register-username').value = document.getElementById('login-username').value;
  });
  
  document.getElementById('switch-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    screens.register.style.display = 'none';
    screens.password.style.display = 'flex';
  });
  
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  
  document.getElementById('register-btn').addEventListener('click', handleRegister);
  
  bottomNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.dataset.screen;
      
      bottomNavItems.forEach(navItem => {
        navItem.classList.remove('active');
      });
      
      item.classList.add('active');
      
      if (screen === 'settings') {
        showSettings();
      } else {
        showApp();
      }
    });
  });
  
  settingsBackBtn.addEventListener('click', showApp);
  notificationsBackBtn.addEventListener('click', showSettings);
  
  document.getElementById('notifications-settings-btn').addEventListener('click', () => showScreen('notifications'));
  document.getElementById('privacy-settings-btn').addEventListener('click', () => showScreen('privacy'));
  document.getElementById('appearance-settings-btn').addEventListener('click', () => showScreen('appearance'));
  document.getElementById('help-settings-btn').addEventListener('click', () => {
    showScreen('help');
  });

  document.querySelector('#help-screen .settings-item:nth-child(1)').addEventListener('click', () => {
    showFAQModal();
  });

  document.getElementById('privacy-back-btn').addEventListener('click', () => {
    showSettings();
    setActiveNavItem('settings');
  });

  document.getElementById('appearance-back-btn').addEventListener('click', () => {
    showSettings();
    setActiveNavItem('settings');
  });

  document.getElementById('help-back-btn').addEventListener('click', () => {
    showSettings();
    setActiveNavItem('settings');
  });

  document.getElementById('chat-info-btn').addEventListener('click', () => {
    showChatInfo();
  });
  
  // Обработчик клика на QR кнопку
  settingsQrBtn.addEventListener('click', async () => {
    await generateQRCode(currentUser.nickname.replace('@', ''));
    document.getElementById('qr-modal').style.display = 'flex';
  });
  
  qrClose.addEventListener('click', () => {
    screens.qrModal.style.display = 'none';
  });
  
  // Обработчик клика на username для копирования
  settingsProfileUsername.addEventListener('click', () => {
    navigator.clipboard.writeText(currentUser.nickname).then(() => {
      showToast('Никнейм скопирован');
    });
  });
  
  // Обработчик выхода
  settingsLogoutBtn.addEventListener('click', () => {
    showConfirm('Вы уверены, что хотите выйти?', 'Подтверждение выхода', (confirmed) => {
      if (confirmed) handleLogout();
    });
  });
  
  // Обработчик удаления профиля
  settingsDeleteBtn.addEventListener('click', () => {
    showAlert('Ваш аккаунт будет удалён через 30 дней', 'Удаление профиля', () => {
      // Здесь будет логика удаления профиля
    });
  });
  
  // Обработчик кнопки "Связаться с поддержкой" в меню помощи
  document.querySelector('#help-screen .settings-item:nth-child(2)').addEventListener('click', () => {
    window.open('https://t.me/diamond_support', '_blank');
  });
  
  deleteCancel.addEventListener('click', () => {
    deleteModal.style.display = 'none';
  });
  
  deleteConfirm.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    showAlert('Функция удаления профиля будет реализована позже', 'Информация');
  });
  
  messageInput.addEventListener('input', () => {
    sendBtn.disabled = messageInput.value.trim() === '';
    updateTyping();
  });
  
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  sendBtn.addEventListener('click', sendMessage);
  backBtn.addEventListener('click', showChatsList);
  
  attachmentBtn.addEventListener('click', toggleAttachmentMenu);
  
  emojiBtn.addEventListener('click', () => {
    showStickersModal();
  });
  
  document.addEventListener('click', (e) => {
    if (!attachmentBtn.contains(e.target) && !attachmentMenu.contains(e.target)) {
      attachmentMenu.style.display = 'none';
    }
  });
  
  //addChatBtn.addEventListener('click', () => {
    //addChatModal.style.display = 'flex';
  //});
  
  // В функции setupEventListeners, после строки с attachmentBtn
  const photoUploadBtn = document.createElement('div');
  photoUploadBtn.className = 'attachment-option';
  photoUploadBtn.innerHTML = `
    <i class="fas fa-camera"></i>
    <span>Фото</span>
  `;
  photoUploadBtn.addEventListener('click', () => {
    const fileInput = document.getElementById('file-upload-input') || setupFileUpload();
    fileInput.click();
    attachmentMenu.style.display = 'none';
  });
  attachmentMenu.appendChild(photoUploadBtn);
  
  contactTab.addEventListener('click', () => {
    contactTab.classList.add('active');
    groupTab.classList.remove('active');
    contactTabContent.style.display = 'block';
    groupTabContent.style.display = 'none';
  });
  
  groupTab.addEventListener('click', () => {
    groupTab.classList.add('active');
    contactTab.classList.remove('active');
    groupTabContent.style.display = 'block';
    contactTabContent.style.display = 'none';
  });
  
  userAvatar.addEventListener('click', () => {
    document.getElementById('share-username').textContent = currentUser.nickname;
    shareModal.style.display = 'flex';
  });
  
  confirmAddContact.addEventListener('click', addContact);
  cancelAddContact.addEventListener('click', () => {
    addChatModal.style.display = 'none';
  });
  
  confirmCreateGroup.addEventListener('click', createGroup);
  cancelCreateGroup.addEventListener('click', () => {
    addChatModal.style.display = 'none';
  });
  
  copyShareLink.addEventListener('click', () => {
    const text = `Привет! Присоединяйся ко мне в Diamond Share. Мой профиль: ${currentUser.nickname}`;
    navigator.clipboard.writeText(text).then(() => {
      showAlert('Ссылка скопирована в буфер обмена', 'Успешно');
    });
  });
  
  shareTelegramBtn.addEventListener('click', () => {
    const text = `Привет! Присоединяйся ко мне в Diamond Share. Мой профиль: ${currentUser.nickname}`;
    window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(text)}`, '_blank');
  });
  
  shareWhatsappBtn.addEventListener('click', () => {
    const text = `Привет! Присоединяйся ко мне в Diamond Share. Мой профиль: ${currentUser.nickname}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  });
  
  closePreview.addEventListener('click', () => {
    imagePreviewModal.style.display = 'none';
  });
  
  closeStickers.addEventListener('click', () => {
    stickersModal.style.display = 'none';
  });
  
  document.querySelectorAll('.sticker-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.sticker-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      loadStickers(this.dataset.pack);
    });
  });
  
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', function() {
      const theme = this.dataset.theme;
      currentSettings.theme = theme;
      localStorage.setItem('userSettings', JSON.stringify(currentSettings));
      applyTheme(theme);
    });
  });
  
  document.querySelectorAll('#notifications-screen input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const key = this.id.replace('-toggle', '');
      currentSettings.notifications[key] = this.checked;
      localStorage.setItem('userSettings', JSON.stringify(currentSettings));
    });
  });
  
  document.getElementById('settings-avatar').addEventListener('click', showAvatarModal);
  document.getElementById('confirm-avatar-select').addEventListener('click', confirmAvatarSelection);
  document.getElementById('cancel-avatar-select').addEventListener('click', () => {
    document.getElementById('avatar-modal').style.display = 'none';
  });
  
  document.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', closeContextMenu);
  
  document.getElementById('copy-message').addEventListener('click', copyMessage);
  document.getElementById('reply-message').addEventListener('click', replyToMessage);
  document.getElementById('forward-message').addEventListener('click', showForwardModal);
  document.getElementById('delete-message').addEventListener('click', deleteMessage);
  
  document.getElementById('cancel-forward').addEventListener('click', () => {
    document.getElementById('forward-modal').style.display = 'none';
  });
  
  document.getElementById('confirm-forward').addEventListener('click', forwardMessage);
  
  document.addEventListener('click', (e) => {
    const shareModal = document.getElementById('share-modal');
    if (shareModal.style.display === 'flex' && !e.target.closest('.modal-content') && e.target !== userAvatar) {
      shareModal.style.display = 'none';
    }
  });
}

// Добавим после setupEventListeners()
function setupFileUpload() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.id = 'file-upload-input';
  document.body.appendChild(fileInput);

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        showAlert('Загрузка изображения...', 'Пожалуйста, подождите');
        const imageUrl = await uploadImageToImgBB(file);
        sendImageMessage(imageUrl);
      } catch (error) {
        showAlert('Не удалось загрузить изображение', 'Ошибка');
      }
    }
  });

  return fileInput;
}

async function sendImageMessage(imageUrl) {
  if (!currentChat) return;

  const message = {
    id: Date.now().toString(),
    type: 'image',
    imageUrl: imageUrl,
    user: currentUser.username,
    timestamp: Date.now()
  };

  try {
    messageBatch.push(message);
    
    if (messageBatch.length >= BATCH_SIZE) {
      await processMessageBatch();
    } else {
      setTimeout(processMessageBatch, BATCH_TIMEOUT);
    }
    
    // Закрываем модальное окно загрузки
    const modal = document.getElementById('custom-modal');
    if (modal) modal.style.display = 'none';
  } catch (error) {
    console.error('Error sending image:', error);
    showAlert('Ошибка при отправке изображения', 'Ошибка');
  }
}

async function checkUserExists(username) {
  try {
    const snapshot = await db.ref(`users/${username}`).once('value');
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking user:', error);
    return false;
  }
}

async function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  
  if (!username || !password) {
    showError(document.getElementById('password-error'), 'Введите имя пользователя и пароль');
    return;
  }
  
  try {
    const snapshot = await db.ref(`users/${username}`).once('value');
    if (!snapshot.exists()) {
      showError(document.getElementById('password-error'), 'Пользователь не найден');
      return;
    }
    
    const user = snapshot.val();
    if (user.password !== password) {
      showError(document.getElementById('password-error'), 'Неверный пароль');
      return;
    }
    
    currentUser = {
      username: user.username,
      nickname: username,
      avatarUrl: user.avatarUrl || 'avatar/1.png'
    };

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Очищаем поля
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    screens.password.style.display = 'none';
    showApp();
    
    setOnlineStatus(true);
  } catch (error) {
    console.error('Login error:', error);
    showError(document.getElementById('password-error'), 'Ошибка входа. Попробуйте позже');
  }
}

async function handleRegister() {
  const name = document.getElementById('register-name').value.trim();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value.trim();
  const confirmPassword = document.getElementById('register-confirm').value.trim();

  // Валидация
  if (!name || !username || !password || !confirmPassword) {
    showError(document.getElementById('register-error'), 'Заполните все поля');
    return;
  }

  if (!username.startsWith('@')) {
    showError(document.getElementById('register-error'), 'Никнейм должен начинаться с @');
    return;
  }

  if (username.length < 3 || username.length > 20) {
    showError(document.getElementById('register-error'), 'Никнейм должен быть от 3 до 20 символов');
    return;
  }

  if (!/^@[a-zA-Z0-9_]+$/.test(username)) {
    showError(document.getElementById('register-error'), 'Никнейм может содержать только буквы, цифры и _');
    return;
  }

  if (password.length < 6) {
    showError(document.getElementById('register-error'), 'Пароль должен содержать минимум 6 символов');
    return;
  }

  if (password !== confirmPassword) {
    showError(document.getElementById('register-error'), 'Пароли не совпадают');
    return;
  }

  try {
    // Проверяем, существует ли пользователь
    const snapshot = await db.ref(`users/${username}`).once('value');
    if (snapshot.exists()) {
      showError(document.getElementById('register-error'), 'Этот никнейм уже занят');
      return;
    }

    // Создаем нового пользователя
    await db.ref(`users/${username}`).set({
      username: name,
      password: password,
      nickname: username,
      avatarUrl: 'avatar/1.png',
      createdAt: Date.now(),
      isOnline: true,
      lastSeen: Date.now(),
      contacts: {},
      isAdmin: false
    });

    // Автоматически входим после регистрации
    currentUser = {
      username: name,
      nickname: username,
      avatarUrl: 'avatar/1.png'
    };

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Очищаем поля
    document.getElementById('register-name').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm').value = '';
    
    // Переходим в приложение
    screens.register.style.display = 'none';
    showApp();
    
    setOnlineStatus(true);
  } catch (error) {
    console.error('Registration error:', error);
    showError(document.getElementById('register-error'), 'Ошибка регистрации. Попробуйте позже');
  }
}

function showError(element, message) {
  element.textContent = message;
  element.style.display = 'block';
}

async function loadContacts() {
  if (!currentUser) return;
  
  try {
    const snapshot = await db.ref(`users/${currentUser.nickname}/contacts`).once('value');
    contacts = snapshot.val() ? Object.keys(snapshot.val()) : [];
    loadChatsList();
  } catch (error) {
    console.error('Error loading contacts:', error);
  }
}

async function loadChatsList() {
  if (!currentUser) return;
  
  try {
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val() || {};
    
    chatsList.innerHTML = '';
    
    // Добавляем поле поиска вверху списка чатов
    const searchHeader = document.createElement('div');
    searchHeader.className = 'chats-search-header';
    searchHeader.innerHTML = `
      <div class="chats-search-input" onclick="showSearch()">
        <i class="fas fa-search"></i>
        <span>Поиск пользователей</span>
      </div>
    `;
    chatsList.appendChild(searchHeader);
    
    if (contacts.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <div class="empty-icon">
          <i class="fas fa-comment-dots"></i>
        </div>
        <h3 class="empty-title">Начните общение</h3>
        <p>Найдите пользователей через поиск</p>
        <div class="hint-arrow" style="margin-top: 20px; font-size: 24px;">
          <i class="fas fa-arrow-up"></i>
        </div>
      `;
      chatsList.appendChild(emptyState);
    } else {
      const contactsData = [];
      
      for (const contactId of contacts) {
        if (users[contactId]) {
          const user = users[contactId];
          const lastSeen = user.lastSeen ? formatLastSeen(user.lastSeen) : 'Недавно';
          const status = user.isOnline ? 'Онлайн' : `Был(а) ${lastSeen}`;
          
          contactsData.push({
            id: contactId,
            username: user.username,
            avatarUrl: user.avatarUrl,
            status: status
          });
        }
      }
      
      renderChatList(contactsData);
    }
  } catch (error) {
    console.error('Error loading chats:', error);
  }
}

function formatLastSeen(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

async function openChat(chatId, chatName, avatarUrl = null) {
  if (currentChat === chatId) return;

  // Удаляем старые слушатели
  if (currentChat && chatListeners[currentChat]) {
    chatListeners[currentChat](); // Отключаем старый слушатель
    delete chatListeners[currentChat];
  }

  // Показываем загрузку
  messagesDiv.innerHTML = '<div class="loading-messages">Загрузка...</div>';

  // Очищаем кэш сообщений для этого чата
  cachedMessages[chatId] = [];

  // Установка фонового изображения
  const messagesContainer = document.querySelector('.messages-container');
  messagesContainer.style.backgroundImage = 'url("background/1.png")';

  // Скрываем нижнее меню
  document.querySelector('.bottom-nav').classList.add('hidden');

  // Показываем чат на весь экран
  chatView.style.height = '100vh';
  chatView.style.marginBottom = '0';

  document.querySelector('.header').classList.add('hidden');
  document.querySelector('.chat-header').classList.remove('hidden');

  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.chatId === chatId) {
      item.classList.add('active');
    }
  });

  currentChat = chatId;

  const verifiedBadge = verifiedUsers.includes(chatId) 
    ? '<span class="verified-badge" title="Официальный представитель проекта"><i class="fas fa-check-circle"></i></span>' 
    : '';

  chatTitle.innerHTML = `${chatName}${verifiedBadge}`;

  db.ref(`users/${chatId}/avatarUrl`).once('value').then(snapshot => {
    const url = snapshot.val();
    if (url) {
      chatHeaderAvatar.innerHTML = `<img src="${url}" alt="${chatName}">`;
      chatHeaderAvatarText.style.display = 'none';
    } else {
      chatHeaderAvatarText.textContent = chatName.charAt(0).toUpperCase();
      chatHeaderAvatarText.style.display = 'flex';
    }
  }).catch(error => {
    console.error('Error loading avatar:', error);
    chatHeaderAvatarText.textContent = chatName.charAt(0).toUpperCase();
    chatHeaderAvatarText.style.display = 'flex';
  });

  chatView.style.display = 'flex';
  chatsList.style.display = 'none';

  // Очищаем сообщения и сбрасываем скролл
  messagesDiv.innerHTML = '';
  messagesDiv.scrollTop = 0;

  let messagesRef;
  if (chatId === 'general') {
    messagesRef = db.ref('messages/general');
  } else {
    const chatRef = [currentUser.nickname, chatId].sort().join('_');
    messagesRef = db.ref(`messages/private/${chatRef}`);
  }

  // Загружаем сообщения один раз
  messagesRef.once('value').then((snapshot) => {
    const messages = [];
    snapshot.forEach((child) => {
      messages.push(child.val());
    });

    if (messages.length === 0) {
      renderEmptyChatState();
      // Показываем подсказку только для личных чатов
      if (chatId !== 'general') {
        showFirstMessageHint();
      }
    } else {
      messages.sort((a, b) => a.timestamp - b.timestamp);
      messages.forEach(msg => processMessage(msg));
    }

    scrollToBottom();
  });

  // Обработчик новых сообщений - сохраняем функцию отключения
  chatListeners[chatId] = messagesRef.on('child_added', (snapshot) => {
    const msg = snapshot.val();
    // Проверяем, нет ли уже такого сообщения в кэше
    if (!cachedMessages[chatId] || !cachedMessages[chatId].some(m => m.id === msg.id)) {
      processMessage(msg);
      scrollToBottom();
    }
  });

  if (chatId !== 'general') {
    const typingRef = db.ref(`typing/${currentUser.nickname}_${chatId}`);
    typingRef.on('value', (snapshot) => {
      const typingData = snapshot.val();
      if (typingData && typingData.isTyping && typingData.user !== currentUser.username) {
        typingIndicator.style.display = 'flex';
        chatStatus.textContent = 'Печатает...';
      } else {
        typingIndicator.style.display = 'none';

        db.ref(`users/${chatId}`).once('value').then(userSnapshot => {
          const user = userSnapshot.val();
          if (user) {
            const status = user.isOnline ? 'Онлайн' : `Был(а) ${formatLastSeen(user.lastSeen)}`;
            chatStatus.textContent = status;
          }
        });
      }
    });
  }
}

function processMessage(msg) {
  if (!cachedMessages[currentChat]) {
    cachedMessages[currentChat] = [];
  }
  
  if (!cachedMessages[currentChat].some(m => m.id === msg.id)) {
    cachedMessages[currentChat].push(msg);
    
    // Добавляем статус прочтения
    if (msg.user === currentUser.username) {
      msg.read = true; // В реальном приложении нужно проверять статус с сервера
    }
    
    const messageDiv = createMessageElement(msg);
    messagesDiv.appendChild(messageDiv);
  }
}

function addMessage(text, sender, isOutgoing, timestamp, replyTo) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
  messageDiv.dataset.messageId = timestamp;
  messageDiv.dataset.messageType = 'text';
  
  if (replyTo) {
    messageDiv.classList.add('message-replied');
  }
  
  const time = new Date(timestamp);
  const timeString = time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  let replyContent = '';
  if (replyTo) {
    if (replyTo.type === 'sticker') {
      replyContent = `
        <div class="reply-container">
          <div class="reply-header">${replyTo.user === currentUser.username ? 'Вы' : replyTo.user}</div>
          <div class="reply-sticker-indicator">
            <i class="fas fa-sticky-note"></i>
            <span>Стикер</span>
          </div>
        </div>
      `;
    } else {
      replyContent = `
        <div class="reply-container">
          <div class="reply-header">${replyTo.user === currentUser.username ? 'Вы' : replyTo.user}</div>
          <div class="reply-content">${replyTo.text}</div>
        </div>
      `;
    }
  }
  
  messageDiv.innerHTML = `
    ${replyContent}
    <div class="message-content">${text}</div>
    <div class="message-meta">
      ${!isOutgoing ? `<span class="message-sender">${sender}</span>` : ''}
      <span>${timeString}</span>
    </div>
  `;
  
  messageDiv.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    handleContextMenu(e);
  });
  
  // Анимация для первого сообщения
  if (messagesDiv.children.length === 0) {
    messageDiv.classList.add('animate__animated', 'animate__bounceIn');
  }
  
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addStickerMessage(pack, number, sender, isOutgoing, timestamp) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
  messageDiv.dataset.messageId = timestamp;
  messageDiv.dataset.messageType = 'sticker';
  
  const time = new Date(timestamp);
  const timeString = time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  messageDiv.innerHTML = `
    <img src="stickers/${pack}/${number}.png" class="message-sticker" alt="${pack} sticker">
    <div class="message-meta">
      ${!isOutgoing ? `<span class="message-sender">${sender}</span>` : ''}
      <span>${timeString}</span>
    </div>
  `;
  
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showChatsList() {
  // Сброс фона
  const messagesContainer = document.querySelector('.messages-container');
  messagesContainer.style.backgroundImage = 'none';
  
  // Возвращаем нижнее меню
  document.querySelector('.bottom-nav').classList.remove('hidden');
  
  // Восстанавливаем размеры чата
  chatView.style.height = '';
  chatView.style.marginBottom = '';
  
  chatView.style.display = 'none';
  chatsList.style.display = 'block';
  currentChat = null;
  
  document.querySelector('.header').classList.remove('hidden');
  document.querySelector('.chat-header').classList.add('hidden');
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
  });
}

let isSending = false;

async function sendMessage() {
  if (isSending) return;
  isSending = true;

  const text = messageInput.value.trim();
  if (!text || !currentChat) {
    isSending = false;
    return;
  }
  
  const message = {
    id: Date.now().toString(),
    text: text,
    user: currentUser.username,
    timestamp: Date.now(),
    type: 'text'
  };
  
  const replyContainer = document.querySelector('.input-reply-container');
  if (replyContainer) {
    message.replyTo = {
      messageId: selectedMessage.id,
      text: selectedMessage.text,
      type: selectedMessage.type
    };
  }
  
  try {
    messageBatch.push(message);
    
    if (messageBatch.length >= BATCH_SIZE) {
      await processMessageBatch();
    } else {
      setTimeout(processMessageBatch, BATCH_TIMEOUT);
    }
    
    messageInput.value = '';
    sendBtn.disabled = true;
    
    if (replyContainer) {
      replyContainer.remove();
      selectedMessage = null;
    }
    
    stopTyping();
  } catch (error) {
    console.error('Error sending message:', error);
  } finally {
    isSending = false;
  }
}

function updateTyping() {
  if (!currentChat || currentChat === 'general') return;
  
  const now = Date.now();
  const typingTimeout = 3000;
  
  const typingRef = db.ref(`typing/${currentUser.nickname}_${currentChat}`);
  typingRef.set({
    isTyping: true,
    user: currentUser.username,
    timestamp: Date.now()
  });
  
  setTimeout(() => {
    typingRef.update({
      isTyping: false,
      timestamp: Date.now()
    });
  }, typingTimeout);
}

function stopTyping() {
  if (!currentChat || currentChat === 'general') return;
  
  const typingRef = db.ref(`typing/${currentUser.nickname}_${currentChat}`);
  typingRef.update({
    isTyping: false,
    timestamp: Date.now()
  });
}

async function addContact() {
  const contactId = contactUsernameInput.value.trim();
  if (!contactId) return;
  
  try {
    const snapshot = await db.ref(`users/${contactId}`).once('value');
    if (!snapshot.exists()) {
      showAlert('Пользователь не найден', 'Ошибка');
      return;
    }
    
    if (contacts.includes(contactId)) {
      showAlert('Этот пользователь уже в ваших контактах', 'Ошибка');
      return;
    }
    
    await db.ref(`users/${currentUser.nickname}/contacts/${contactId}`).set(true);
    await db.ref(`users/${contactId}/contacts/${currentUser.nickname}`).set(true);
    
    addChatModal.style.display = 'none';
    contactUsernameInput.value = '';
    loadContacts();
  } catch (error) {
    console.error('Error adding contact:', error);
    showAlert('Ошибка добавления контакта', 'Ошибка');
  }
}

async function createGroup() {
  const name = groupNameInput.value.trim();
  const members = groupMembersInput.value.trim();
  
  if (!name) {
    showAlert('Введите название группы', 'Ошибка');
    return;
  }
  
  if (!members) {
    showAlert('Добавьте участников группы', 'Ошибка');
    return;
  }
  
  try {
    const groupRef = db.ref('groups').push();
    const groupId = groupRef.key;
    
    const membersList = members.split(',').map(m => m.trim()).filter(m => m);
    const membersData = {};
    
    for (const member of membersList) {
      const userSnapshot = await db.ref(`users/${member}`).once('value');
      if (!userSnapshot.exists()) {
        showAlert(`Пользователь ${member} не найден`, 'Ошибка');
        return;
      }
      membersData[member] = true;
    }
    
    membersData[currentUser.nickname] = true;
    
    await groupRef.set({
      name: name,
      members: membersData,
      createdBy: currentUser.nickname,
      createdAt: Date.now()
    });
    
    const updates = {};
    for (const member of Object.keys(membersData)) {
      updates[`users/${member}/contacts/group_${groupId}`] = true;
    }
    
    await db.ref().update(updates);
    
    addChatModal.style.display = 'none';
    groupNameInput.value = '';
    groupMembersInput.value = '';
    loadContacts();
  } catch (error) {
    console.error('Error creating group:', error);
    showAlert('Ошибка создания группы', 'Ошибка');
  }
}

function toggleAttachmentMenu() {
  attachmentMenu.style.display = attachmentMenu.style.display === 'block' ? 'none' : 'block';
}

function showStickersModal() {
  const modal = document.getElementById('stickers-modal');
  modal.style.display = 'flex';
  loadStickers('panda');
}

function loadStickers(pack) {
  const container = document.getElementById('stickers-container');
  container.innerHTML = '';
  
  const count = stickerPacks[pack];
  for (let i = 1; i <= count; i++) {
    const stickerItem = document.createElement('div');
    stickerItem.className = 'sticker-item';
    stickerItem.dataset.sticker = `${pack}${i}`;
    stickerItem.innerHTML = `<img src="stickers/${pack}/${i}.png" alt="${pack} sticker ${i}">`;
    
    stickerItem.addEventListener('click', () => {
      sendSticker(pack, i);
      document.getElementById('stickers-modal').style.display = 'none';
    });
    
    container.appendChild(stickerItem);
  }
}

async function sendSticker(pack, number) {
  if (!currentChat) return;
  
  const message = {
    id: Date.now().toString(),
    type: 'sticker',
    stickerPack: pack,
    stickerNumber: number,
    user: currentUser.username,
    timestamp: Date.now()
  };

  try {
    messageBatch.push(message);
    
    if (messageBatch.length >= BATCH_SIZE) {
      await processMessageBatch();
    } else {
      setTimeout(processMessageBatch, BATCH_TIMEOUT);
    }
  } catch (error) {
    console.error('Error sending sticker:', error);
  }
}

function setOnlineStatus(isOnline) {
  if (!currentUser) return;
  
  const updates = {};
  updates[`users/${currentUser.nickname}/isOnline`] = isOnline;
  updates[`users/${currentUser.nickname}/lastSeen`] = Date.now();
  
  db.ref().update(updates).catch(error => {
    console.error('Error updating online status:', error);
  });
}

async function handleLogout() {
  try {
    if (currentUser) {
      await setOnlineStatus(false);
    }
    
    localStorage.removeItem('currentUser');
    currentUser = null;
    location.reload();
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

function showFAQModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="modal-title">Частые вопросы</h3>
      <div class="faq-list">
        <div class="faq-item">
          <div class="faq-question">Как изменить пароль?</div>
          <div class="faq-answer">Перейдите в настройки профиля и выберите "Связаться с поддержкой"</div>
        </div>
        <div class="faq-item">
          <div class="faq-question">Как добавить чат?</div>
          <div class="faq-answer">Нажмите на кнопку "+ Чат" и выберите "Личный чат"</div>
        </div>
        <div class="faq-item">
          <div class="faq-question">Как отправить стикер?</div>
          <div class="faq-answer">Нажмите на кнопку смайлика рядом с полем ввода сообщения</div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="close-faq">Закрыть</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  
  document.getElementById('close-faq').addEventListener('click', () => {
    modal.style.display = 'none';
    setTimeout(() => modal.remove(), 300);
  });
  
  setTimeout(() => {
    modal.querySelector('.modal-content').classList.add('animate__fadeInUp');
  }, 10);
}

function showChatInfo() {
  if (!currentChat) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  if (currentChat === 'general') {
    modal.innerHTML = `
      <div class="modal-content">
        <h3 class="modal-title">Общий чат</h3>
        <div class="chat-info-content">
          <p>Групповой чат для всех пользователей Diamond Share</p>
          <p>Создан: 01.01.2023</p>
          <p>Участников: ${contacts.length + 1}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" id="close-chat-info">Закрыть</button>
        </div>
      </div>
    `;
  } else {
    db.ref(`users/${currentChat}`).once('value').then(snapshot => {
      const user = snapshot.val();
      const lastSeen = user.isOnline ? 'Онлайн' : `Был(а) ${formatLastSeen(user.lastSeen)}`;
      
      modal.innerHTML = `
        <div class="modal-content">
          <h3 class="modal-title">Информация о чате</h3>
          <div class="chat-info-content">
            <div class="chat-info-avatar">
              ${user.avatarUrl ? 
                `<img src="${user.avatarUrl}" alt="${user.username}">` : 
                `<div class="avatar-placeholder">${user.username.charAt(0)}</div>`
              }
            </div>
            <h4>${user.username}</h4>
            <p>${user.nickname}</p>
            <p>Статус: ${lastSeen}</p>
            <div class="chat-actions">
              <button class="btn btn-secondary" id="view-profile">Профиль</button>
              <button class="btn btn-primary" id="close-chat-info">Закрыть</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      modal.style.display = 'flex';
      
      document.getElementById('close-chat-info').addEventListener('click', () => {
        modal.style.display = 'none';
        setTimeout(() => modal.remove(), 300);
      });
      
      document.getElementById('view-profile')?.addEventListener('click', () => {
        showAlert('Просмотр профиля будет реализован в будущем обновлении', 'Информация');
      });
    });
  }
}

function setActiveNavItem(screen) {
  bottomNavItems.forEach(item => {
    item.classList.remove('active');
    if (item.dataset.screen === screen) {
      item.classList.add('active');
    }
  });
}

function handleContextMenu(e) {
  const messageElement = e.target.closest('.message');
  if (!messageElement) return;
  
  e.preventDefault();
  
  const isOutgoing = messageElement.classList.contains('outgoing');
  
  const messageId = messageElement.dataset.messageId;
  selectedMessage = {
    id: messageId,
    element: messageElement,
    isOutgoing: isOutgoing,
    text: messageElement.querySelector('.message-content')?.textContent || '',
    type: messageElement.dataset.messageType || 'text'
  };
  
  const contextMenu = document.getElementById('message-context-menu');
  contextMenu.style.display = 'block';
  
  const menuWidth = contextMenu.offsetWidth;
  const menuHeight = contextMenu.offsetHeight;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  let left = e.clientX;
  let top = e.clientY;
  
  if (left + menuWidth > windowWidth) {
    left = windowWidth - menuWidth - 10;
  }
  
  if (top + menuHeight > windowHeight) {
    top = windowHeight - menuHeight - 10;
  }
  
  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;
  
  document.getElementById('delete-message').style.display = isOutgoing ? 'flex' : 'none';
}

function closeContextMenu(e) {
  if (!e.target.closest('.message-context-menu')) {
    document.getElementById('message-context-menu').style.display = 'none';
  }
}

function copyMessage() {
  if (!selectedMessage) return;
  
  navigator.clipboard.writeText(selectedMessage.text).then(() => {
    showToast('Сообщение скопировано');
  }).catch(err => {
    console.error('Ошибка копирования:', err);
    showToast('Не удалось скопировать');
  });
  
  document.getElementById('message-context-menu').style.display = 'none';
}

function replyToMessage() {
  if (!selectedMessage) return;
  
  const existingReply = document.querySelector('.input-reply-container');
  if (existingReply) {
    existingReply.classList.add('fade-out');
    setTimeout(() => existingReply.remove(), 200);
  }

  const replyContainer = document.createElement('div');
  replyContainer.className = 'input-reply-container';
  
  let replyContent = '';
  if (selectedMessage.type === 'sticker') {
    replyContent = `
      <div class="input-reply-content">
        <div class="input-reply-header">
          <i class="fas fa-reply"></i>
          <span>${selectedMessage.isOutgoing ? 'Вы' : selectedMessage.text}</span>
        </div>
        <div class="reply-sticker-indicator">
          <i class="fas fa-sticky-note"></i>
          <span>Стикер</span>
        </div>
      </div>
    `;
  } else {
    replyContent = `
      <div class="input-reply-content">
        <div class="input-reply-header">
          <i class="fas fa-reply"></i>
          <span>${selectedMessage.isOutgoing ? 'Вы' : selectedMessage.text}</span>
        </div>
        <div class="input-reply-text">${selectedMessage.text}</div>
      </div>
    `;
  }
  
  replyContainer.innerHTML = `
    ${replyContent}
    <div class="input-reply-close" id="cancel-reply">
      <i class="fas fa-times"></i>
    </div>
  `;
  
  messageInput.parentNode.insertBefore(replyContainer, messageInput);
  
  document.getElementById('cancel-reply').addEventListener('click', cancelReply);
  
  setTimeout(() => {
    messageInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    messageInput.focus();
  }, 100);
  
  document.getElementById('message-context-menu').style.display = 'none';
}

function cancelReply() {
  const replyContainer = document.querySelector('.input-reply-container');
  if (replyContainer) {
    replyContainer.classList.add('fade-out');
    setTimeout(() => replyContainer.remove(), 200);
  }
  selectedMessage = null;
}

function showForwardModal() {
  if (!selectedMessage) return;
  
  const modal = document.getElementById('forward-modal');
  const chatsList = document.getElementById('forward-chats-list');
  
  chatsList.innerHTML = '';
  
  addForwardChatItem('general', 'Общий чат');
  
  contacts.forEach(contactId => {
    if (contactId !== 'general') {
      addForwardChatItem(contactId, contactId);
    }
  });
  
  modal.style.display = 'flex';
  document.getElementById('message-context-menu').style.display = 'none';
}

function addForwardChatItem(chatId, chatName) {
  const chatsList = document.getElementById('forward-chats-list');
  const chatItem = document.createElement('div');
  chatItem.className = 'forward-chat-item';
  chatItem.dataset.chatId = chatId;
  
  chatItem.innerHTML = `
    <div class="chat-avatar">${chatName.charAt(0).toUpperCase()}</div>
    <div class="chat-info">
      <div class="chat-name">${chatName}</div>
    </div>
  `;
  
  chatItem.addEventListener('click', () => {
    document.querySelectorAll('.forward-chat-item').forEach(item => {
      item.classList.remove('selected');
    });
    chatItem.classList.add('selected');
    selectedChatForForward = chatId;
  });
  
  chatsList.appendChild(chatItem);
}

function forwardMessage() {
  if (!selectedMessage || !selectedChatForForward) return;
  
  const message = {
    id: Date.now().toString(),
    text: selectedMessage.text,
    user: currentUser.username,
    timestamp: Date.now(),
    type: selectedMessage.type,
    forwarded: true
  };
  
  if (selectedMessage.type === 'text') {
    message.text = `Пересланное сообщение:\n${selectedMessage.text}`;
  }
  
  if (selectedChatForForward === 'general') {
    db.ref('messages/general').push(message);
  } else {
    const chatRef = [currentUser.nickname, selectedChatForForward].sort().join('_');
    db.ref(`messages/private/${chatRef}`).push(message);
  }
  
  document.getElementById('forward-modal').style.display = 'none';
  showToast('Сообщение переслано');
}

function deleteMessage() {
  if (!selectedMessage || !selectedMessage.isOutgoing) return;
  
  showConfirm('Удалить это сообщение?', 'Подтверждение удаления', (confirmed) => {
    if (confirmed) {
      selectedMessage.element.remove();
      showToast('Сообщение удалено');
    }
  });
  
  document.getElementById('message-context-menu').style.display = 'none';
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showAvatarModal() {
  const modal = document.getElementById('avatar-modal');
  const carousel = document.getElementById('avatar-carousel');
  const nav = document.getElementById('avatar-carousel-nav');
  
  carousel.innerHTML = '';
  nav.innerHTML = '';
  
  // Сначала добавляем кнопку загрузки
  const uploadItem = document.createElement('div');
  uploadItem.className = 'avatar-carousel-item upload-item';
  uploadItem.innerHTML = `
    <label for="avatar-upload-input">
      <i class="fas fa-plus"></i>
      <span>Загрузить</span>
    </label>
  `;
  carousel.appendChild(uploadItem);
  
  // Затем добавляем стандартные аватарки
  for (let i = 1; i <= 29; i++) {
    const avatarItem = document.createElement('div');
    avatarItem.className = 'avatar-carousel-item';
    if (currentUser.avatarUrl && currentUser.avatarUrl.includes(`/avatar/${i}.png`)) {
      avatarItem.classList.add('selected');
    }
    avatarItem.dataset.avatarId = i;
    avatarItem.innerHTML = `<img src="avatar/${i}.png" alt="Avatar ${i}">`;
    avatarItem.addEventListener('click', () => selectAvatar(i));
    carousel.appendChild(avatarItem);
    
    const navDot = document.createElement('div');
    navDot.className = 'avatar-carousel-dot';
    if (i === 1) navDot.classList.add('active');
    navDot.dataset.avatarId = i;
    navDot.addEventListener('click', () => scrollToAvatar(i));
    nav.appendChild(navDot);
  }
  
  carousel.addEventListener('scroll', updateNavDots);
  modal.style.display = 'flex';
  
  // Обработчик загрузки файла
  const fileInput = document.getElementById('avatar-upload-input');
  fileInput.onchange = async (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        showAlert('Загрузка аватарки...', 'Пожалуйста, подождите');
        const imageUrl = await uploadAvatar(file);
        await setUserAvatar(imageUrl);
        document.getElementById('avatar-modal').style.display = 'none';
      } catch (error) {
        showAlert(error.message || 'Не удалось загрузить аватар', 'Ошибка');
      } finally {
        fileInput.value = '';
      }
    }
  };
}

function selectAvatar(avatarId) {
  document.querySelectorAll('.avatar-carousel-item').forEach(item => {
    item.classList.remove('selected');
    if (item.dataset.avatarId == avatarId) {
      item.classList.add('selected');
    }
  });
}

function scrollToAvatar(avatarId) {
  const carousel = document.getElementById('avatar-carousel');
  const avatarItem = document.querySelector(`.avatar-carousel-item[data-avatar-id="${avatarId}"]`);
  if (avatarItem) {
    avatarItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function updateNavDots() {
  const carousel = document.getElementById('avatar-carousel');
  const items = document.querySelectorAll('.avatar-carousel-item');
  const dots = document.querySelectorAll('.avatar-carousel-dot');
  
  let selectedIndex = 0;
  const center = carousel.scrollLeft + carousel.clientWidth / 2;
  
  items.forEach((item, index) => {
    const itemCenter = item.offsetLeft + item.clientWidth / 2;
    if (Math.abs(itemCenter - center) < 50) {
      selectedIndex = index;
    }
  });
  
  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === selectedIndex);
  });
}

async function confirmAvatarSelection() {
  const selected = document.querySelector('.avatar-carousel-item.selected');
  if (!selected) return;
  
  const avatarId = selected.dataset.avatarId;
  const avatarUrl = `avatar/${avatarId}.png`;

  try {
    currentUser.avatarUrl = avatarUrl;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    updateAvatarInUI(avatarUrl);
    
    await db.ref(`users/${currentUser.nickname}/avatarUrl`).set(avatarUrl);
    
    document.getElementById('avatar-modal').style.display = 'none';
    showToast('Аватар обновлен');
  } catch (error) {
    console.error('Error updating avatar:', error);
    showAlert('Ошибка при обновлении аватара', 'Ошибка');
    updateAvatarInUI(avatarUrl);
  }
}

function updateAvatarInUI(avatarUrl) {
  userAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
  settingsAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
  if (currentChat) {
    chatHeaderAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
  }
}

async function uploadAvatar(file) {
  try {
    // Проверка размера файла
    if (file.size > AVATAR_UPLOAD_SIZE_LIMIT) {
      throw new Error('Размер файла не должен превышать 5MB');
    }

    // Проверка типа файла
    if (!file.type.match('image.*')) {
      throw new Error('Пожалуйста, выберите изображение');
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_API_KEY);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      return data.data.url;
    } else {
      throw new Error(data.error?.message || 'Не удалось загрузить аватар');
    }
  } catch (error) {
    console.error('Ошибка загрузки аватарки:', error);
    throw error;
  }
}

// Функция для установки аватарки
async function setUserAvatar(avatarUrl) {
  if (!currentUser) return;

  try {
    // Закрываем модальное окно загрузки
    const modal = document.getElementById('custom-modal');
    if (modal) modal.style.display = 'none';

    // Обновляем локально
    currentUser.avatarUrl = avatarUrl;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Обновляем UI
    updateAvatarInUI(avatarUrl);

    // Обновляем в базе данных
    await db.ref(`users/${currentUser.nickname}/avatarUrl`).set(avatarUrl);

    showToast('Аватар успешно обновлен');
  } catch (error) {
    console.error('Ошибка обновления аватарки:', error);
    showAlert('Не удалось обновить аватар', 'Ошибка');
  }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }
}

function showPreferences() {
  showScreen('preferences');
  loadPreferences();
}

async function loadPreferences() {
  if (!currentUser) return;

  try {
    const snapshot = await db.ref(`users/${currentUser.nickname}/preferences`).once('value');
    const preferences = snapshot.val() || {};

    // Set the values in the form
    document.getElementById('pref-color').value = preferences.favoriteColor || '';
    document.getElementById('pref-flavor').value = preferences.favoriteFlavor || '';
    document.getElementById('pref-music').value = preferences.favoriteMusic || '';
    document.getElementById('pref-season').value = preferences.favoriteSeason || '';
    document.getElementById('pref-hobby').value = preferences.favoriteHobby || '';
  } catch (error) {
    console.error('Error loading preferences:', error);
    showToast('Ошибка при загрузке предпочтений');
  }
}


async function savePreferences() {
  if (!currentUser) return;

  const preferences = {
    favoriteColor: document.getElementById('pref-color').value,
    favoriteFlavor: document.getElementById('pref-flavor').value,
    favoriteMusic: document.getElementById('pref-music').value,
    favoriteSeason: document.getElementById('pref-season').value,
    favoriteHobby: document.getElementById('pref-hobby').value
  };

  try {
    await db.ref(`users/${currentUser.nickname}/preferences`).set(preferences);
    showToast('Предпочтения сохранены');
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    showToast('Ошибка при сохранении');
  }
}

function shareQR() {
  const username = currentUser.nickname;
  const text = `Присоединяйся ко мне в Diamond Share! Мой профиль: ${username}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Diamond Share',
      text: text,
      url: `https://diamondshare.app/user/${username.replace('@', '')}`
    });
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Ссылка скопирована в буфер обмена');
    });
  }
}

function saveQR() {
  const canvas = document.querySelector('#qr-code canvas');
  if (canvas) {
    const link = document.createElement('a');
    link.download = `diamond-share-${currentUser.nickname}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }
}

function initSearch() {
  searchContainer = document.getElementById('search-container');
  searchInput = document.getElementById('search-input');
  searchResults = document.getElementById('search-results');
  searchBackBtn = document.getElementById('search-back-btn');
  clearSearchBtn = document.getElementById('clear-search');
  
  // Создаем кнопку поиска в header
  const headerSearchBtn = document.createElement('button');
  headerSearchBtn.className = 'header-search-btn';
  headerSearchBtn.innerHTML = '<i class="fas fa-search"></i>';
  headerSearchBtn.addEventListener('click', showSearch);
  
  // Добавляем кнопку поиска в header
  const headerActions = document.querySelector('.header-actions');
  headerActions.insertBefore(headerSearchBtn, headerActions.firstChild);
  
  // Убираем кнопку добавления чата
  const addChatBtn = document.getElementById('add-chat-btn');
  if (addChatBtn) {
    addChatBtn.style.display = 'none';
  }
  
  // Настройка обработчиков событий поиска
  searchInput.addEventListener('input', handleSearchInput);
  searchBackBtn.addEventListener('click', hideSearch);
  clearSearchBtn.addEventListener('click', clearSearch);
  
  // Обработчик клавиши Enter в поиске
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value.trim());
    }
  });
}

function showSearch() {
  searchContainer.style.display = 'flex';
  searchInput.focus();
  loadAllUsers();
}

// Функция скрытия поиска
function hideSearch() {
  searchContainer.style.display = 'none';
  searchInput.value = '';
  clearSearchBtn.style.display = 'none';
  showSearchEmptyState();
}

// Функция очистки поиска
function clearSearch() {
  searchInput.value = '';
  clearSearchBtn.style.display = 'none';
  searchInput.focus();
  showSearchEmptyState();
}

// Обработчик ввода в поиске
function handleSearchInput(e) {
  const query = e.target.value.trim();
  
  if (query.length > 0) {
    clearSearchBtn.style.display = 'block';
  } else {
    clearSearchBtn.style.display = 'none';
    showSearchEmptyState();
    return;
  }
  
  // Дебаунс поиска
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(query);
  }, 300);
}

// Загрузка всех пользователей
async function loadAllUsers() {
  try {
    const snapshot = await db.ref('users').once('value');
    const users = snapshot.val() || {};
    
    allUsers = Object.entries(users).map(([nickname, userData]) => ({
      nickname: nickname,
      username: userData.username,
      avatarUrl: userData.avatarUrl,
      isOnline: userData.isOnline || false,
      lastSeen: userData.lastSeen || Date.now()
    }));
  } catch (error) {
    console.error('Error loading users:', error);
    showAlert('Ошибка загрузки пользователей', 'Ошибка');
  }
}

// Выполнение поиска
async function performSearch(query) {
  if (query.length < 2) {
    showSearchEmptyState('Введите минимум 2 символа');
    return;
  }
  
  showSearchLoading();
  
  try {
    // Ищем среди загруженных пользователей
    const results = allUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.nickname.toLowerCase().includes(query.toLowerCase())
    );
    
    // Исключаем текущего пользователя
    const filteredResults = results.filter(user => user.nickname !== currentUser.nickname);
    
    if (filteredResults.length === 0) {
      showNoResults(query);
    } else {
      displaySearchResults(filteredResults);
    }
  } catch (error) {
    console.error('Search error:', error);
    showSearchEmptyState('Ошибка поиска');
  }
}

// Показать состояние загрузки
function showSearchLoading() {
  searchResults.innerHTML = `
    <div class="search-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Поиск...</p>
    </div>
  `;
}

// Показать пустое состояние
function showSearchEmptyState(message = 'Введите имя пользователя для поиска') {
  searchResults.innerHTML = `
    <div class="search-empty-state">
      <i class="fas fa-search"></i>
      <p>${message}</p>
    </div>
  `;
}

// Показать отсутствие результатов
function showNoResults(query) {
  searchResults.innerHTML = `
    <div class="search-no-results">
      <i class="fas fa-search"></i>
      <p>Пользователи по запросу "${query}" не найдены</p>
    </div>
  `;
}

// Отобразить результаты поиска
function displaySearchResults(users) {
  const fragment = document.createDocumentFragment();
  
  users.forEach(user => {
    const userItem = createSearchUserItem(user);
    fragment.appendChild(userItem);
  });
  
  searchResults.innerHTML = '';
  searchResults.appendChild(fragment);
}

// Создать элемент пользователя в результатах поиска
function createSearchUserItem(user) {
  const userItem = document.createElement('div');
  userItem.className = 'search-user-item';
  userItem.dataset.username = user.nickname;
  
  const avatarContent = user.avatarUrl 
    ? `<img src="${user.avatarUrl}" alt="${user.username}">`
    : user.username.charAt(0).toUpperCase();
  
  const status = user.isOnline ? 'Онлайн' : `Был(а) ${formatLastSeen(user.lastSeen)}`;
  const isContact = contacts.includes(user.nickname);
  
  userItem.innerHTML = `
    <div class="search-user-avatar">${avatarContent}</div>
    <div class="search-user-info">
      <div class="search-user-name">${user.username}</div>
      <div class="search-user-username">${user.nickname} • ${status}</div>
    </div>
    ${isContact ? '<div class="search-user-status"><i class="fas fa-check" style="color: #25D366;"></i></div>' : ''}
  `;
  
  userItem.addEventListener('click', () => {
    handleSearchUserClick(user);
  });
  
  return userItem;
}

// Обработчик клика по пользователю в поиске
async function handleSearchUserClick(user) {
  if (contacts.includes(user.nickname)) {
    // Если пользователь уже в контактах, открываем чат
    openChat(user.nickname, user.username, user.avatarUrl);
    hideSearch();
  } else {
    // Если пользователя нет в контактах, добавляем и открываем чат
    try {
      showSearchLoading();
      
      await db.ref(`users/${currentUser.nickname}/contacts/${user.nickname}`).set(true);
      await db.ref(`users/${user.nickname}/contacts/${currentUser.nickname}`).set(true);
      
      contacts.push(user.nickname);
      loadContacts();
      
      openChat(user.nickname, user.username, user.avatarUrl);
      hideSearch();
      
      showToast(`Пользователь ${user.username} добавлен в контакты`);
    } catch (error) {
      console.error('Error adding contact:', error);
      showAlert('Ошибка добавления контакта', 'Ошибка');
    }
  }
}

window.addEventListener('DOMContentLoaded', async () => {
    await init();
    hideLoading(); // Скрываем loading-overlay после полной инициализации
});
