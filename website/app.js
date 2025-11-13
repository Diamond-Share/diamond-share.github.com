// =======================================================
// 1. ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ BASE64-КОДИРОВАНИЯ
// =======================================================
// =======================================================
// АВТОМАТИЧЕСКАЯ ЗАЩИТА document.getElementById
// !!! ВСТАВИТЬ В САМОЕ НАЧАЛО app.js !!!
// =======================================================

// 1. Сохраняем оригинальную функцию (document.getElementById)
const _originalGetElementById = document.getElementById;

/**
 * Перехватывает все вызовы document.getElementById.
 * Логирует ошибку, если элемент не найден, но позволяет коду продолжить работу.
 */
document.getElementById = function(id) {
    // Вызываем оригинальную функцию, используя ID
    const element = _originalGetElementById.call(document, id);

    if (element === null) {
        // 🔴 Выводим ошибку в консоль, чтобы ее было видно
        console.error(`🔴 ОШИБКА DOM: Элемент с ID "${id}" не найден!`, element);
        
        // 🔍 Пытаемся определить строку кода, которая вызвала проблему
        // (Stack trace помогает найти место вызова в вашем коде)
        const stackLines = (new Error()).stack.split('\n');
        // Обычно 2-я или 3-я строка в стеке содержит нужную информацию
        const callerInfo = stackLines[2] || 'Не удалось определить источник вызова.';
        
        console.warn(`\n  - Проверьте правильность написания ID "${id}" в файле index.html.`);
        console.log(`\n  - Вероятный источник проблемы (строка кода):`, callerInfo.trim());
        
        // Важно: возвращаем null, чтобы код, который использует этот элемент 
        // (например, .classList.add) выдал ожидаемую ошибку, но уже с контекстом!
        // (Хотя эта функция предотвращает только ошибки *нахождения* элемента, 
        // а не ошибки его *использования*).
    }
    
    return element;
};

// =======================================================

/**
 * Читает объект File и преобразует его в строку Base64.
 * Требуется для API FreeImage.host (параметр 'source').
 * @param {File} file - Файл для чтения.
 * @returns {Promise<string>} Чистая Base64-строка изображения.
 */
// =======================================================
// 1. ОБНОВЛЕННАЯ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ BASE64-КОДИРОВАНИЯ С СЖАТИЕМ ДО 720P
// =======================================================

/**
 * Читает объект File, СЖИМАЕТ его до максимальной ширины/высоты 720px
 * и преобразует в строку Base64.
 * @param {File} file - Файл для чтения.
 * @returns {Promise<string>} Чистая Base64-строка уменьшенного изображения.
 */
function readFileAsBase64(file) {
    // Максимальные размеры для сжатия (720 пикселей)
    const MAX_WIDTH = 720; 
    const MAX_HEIGHT = 720;
    // Качество сжатия JPEG (85%)
    const COMPRESSION_QUALITY = 0.85; 

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (readerEvent) => {
            const image = new Image();
            image.onload = () => {
                let width = image.width;
                let height = image.height;

                // 1. Расчет новых размеров (пропорциональное уменьшение до 720px)
                // Если изображение меньше, чем 720x720, мы его не трогаем.
                if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                    if (width > height) {
                        // Ландшафтный (горизонтальный) кадр
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    } else {
                        // Портретный (вертикальный) кадр
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                // Убедимся, что размеры не превышают MAX_WIDTH/MAX_HEIGHT после первого расчета
                if (width > MAX_WIDTH) { width = MAX_WIDTH; }
                if (height > MAX_HEIGHT) { height = MAX_HEIGHT; }

                // 2. Создание Canvas для рисования
                const canvas = document.createElement('canvas');
                // Округляем размеры до целого числа
                canvas.width = Math.round(width);
                canvas.height = Math.round(height);
                const ctx = canvas.getContext('2d');
                
                // Рисуем изображение с новыми размерами
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                // 3. Получение Base64 строки с сжатием
                // Используем PNG для изображений с прозрачностью, JPEG для остальных
                const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const resizedBase64 = canvas.toDataURL(mimeType, COMPRESSION_QUALITY);
                
                // Возвращаем только чистую Base64-часть
                const base64Data = resizedBase64.split(',')[1];
                resolve(base64Data);

            };
            image.onerror = reject;
            image.src = readerEvent.target.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// =======================================================
// 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ GITHUB
// =======================================================

/**
 * Генерирует уникальное имя файла с расширением.
 * @param {string} originalFileName - Имя оригинального файла.
 * @returns {string} Новое уникальное имя файла.
 */
function generateUniqueFileName(originalFileName) {
    const timestamp = Date.now();
    // Генерируем случайный суффикс для уникальности
    const randomSuffix = Math.random().toString(36).substring(2, 8); 
    let extension = originalFileName.split('.').pop();
    if (extension === originalFileName || !extension) {
        // Если расширение не найдено, используем .jpg по умолчанию
        extension = 'jpg'; 
    }
    // Очистка от потенциальных query-параметров в расширении
    extension = extension.split('?')[0]; 
    return `${timestamp}-${randomSuffix}.${extension}`;
}


/**
 * Загружает файл в репозиторий GitHub.
 * @param {File} file - Объект файла для загрузки.
 * @param {string} filePath - Путь и имя файла в репозитории (например, 'avatar/@user/image.png').
 * @returns {Promise<string>} Прямой URL загруженного изображения (https://raw.github...).
 */
async function uploadFileToGitHub(file, filePath) {
    if (!GITHUB_TOKEN || GITHUB_TOKEN === '') {
        throw new Error('Ошибка конфигурации: Отсутствует или не заменен GitHub Personal Access Token.');
    }

    // 1. Чтение файла в Base64 (функция readFileAsBase64 уже существует)
    const base64Content = await readFileAsBase64(file); 
    
    // 2. Формирование запроса к GitHub API
    const apiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filePath}`;
    const commitMessage = `Upload ${filePath} via Diamond Share`;

    const requestData = {
        message: commitMessage,
        content: base64Content,
        branch: GITHUB_BRANCH
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'PUT', // Используем PUT для создания/обновления файла
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const resultData = await response.json();

        if (response.ok && resultData.content) {
            // 3. Генерация прямой ссылки (RAW URL)
            const directLink = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;
            return directLink;
        } else {
            console.error('GitHub API Error:', resultData);
            const errorMessage = resultData.message || 'Неизвестная ошибка GitHub API.';
            throw new Error(`Ошибка загрузки в GitHub: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Ошибка при отправке в GitHub:', error);
        throw new Error('Не удалось подключиться к GitHub API.');
    }
}

// =======================================================
// 2. ФУНКЦИЯ ЗАГРУЗКИ ФОТОГРАФИИ (для сообщений)
// =======================================================

/**
 * Загружает фотографию на FreeImage.host для использования в сообщениях.
 * @param {File} file - Объект файла для загрузки.
 * @returns {Promise<string>} Прямой URL загруженного изображения.
 */
// =======================================================
// 2. ФУНКЦИЯ ЗАГРУЗКИ ФОТОГРАФИИ (для сообщений) - ИСПОЛЬЗУЕТ GITHUB
// =======================================================

/**
 * Загружает фотографию сообщения в репозиторий GitHub.
 * Путь: photo/[тег1]-[тег2]/[файл] или photo/[id_группы]/[файл]
 * @param {File} file - Объект файла для загрузки.
 * @returns {Promise<string>} Прямой URL загруженного изображения.
 */
async function uploadPhotoToFreeHost(file) { // Переименована/заменена
    try {
        const chatId = currentChat; // currentChat должен быть доступен
        
        // 1. Определяем теги чата для пути
        let chatTags;
        if (chatId.startsWith(GROUP_CHAT_PREFIX)) {
             // Групповой чат: используем ID группы, очищенный от префикса 'group_'
             chatTags = chatId.replace(GROUP_CHAT_PREFIX, '');
        } else {
            // Приватный чат: [тег текущего]-[тег собеседника] (сортировка)
            const users = [currentUser.nickname, chatId].sort(); // currentUser.nickname должен быть доступен
            chatTags = users.join('-');
        }

        const uniqueFileName = generateUniqueFileName(file.name);
        // Формируем путь: photo/[теги]/[файл]
        const filePath = `photo/${chatTags}/${uniqueFileName}`;
        
        // 2. Загрузка в GitHub
        const directUrl = await uploadFileToGitHub(file, filePath);
        
        return directUrl;
        
    } catch (error) {
        console.error('Ошибка загрузки фото в GitHub:', error);
        throw new Error('Не удалось загрузить фото в репозиторий GitHub.');
    }
}


// =======================================================
// 3. ФУНКЦИЯ ЗАГРУЗКИ АВАТАРКИ - ИСПОЛЬЗУЕТ GITHUB
// =======================================================

/**
 * Загружает изображение в репозиторий GitHub для использования в качестве аватара.
 * Путь: avatar/[тег чедовека]/[файл]
 * @param {File} file - Объект файла для загрузки.
 * @returns {Promise<string>} Прямой URL загруженного аватара.
 */
async function uploadAvatarToFreeHost(file) { // Переименована/заменена
    try { 
        // 1. Проверки размера и типа
        if (file.size > AVATAR_UPLOAD_SIZE_LIMIT) { 
            throw new Error('Размер файла не должен превышать 5MB'); 
        } 
        if (!file.type.match('image.*')) { 
            throw new Error('Пожалуйста, выберите изображение'); 
        } 
        
        // 2. Определяем путь для хранения
        const userTag = currentUser.nickname; // currentUser.nickname должен быть доступен
        const uniqueFileName = generateUniqueFileName(file.name); 
        // Формируем путь: avatar/[тег]/[файл]
        const filePath = `avatar/${userTag}/${uniqueFileName}`;
        
        // 3. Загрузка в GitHub
        const directUrl = await uploadFileToGitHub(file, filePath);
        
        return directUrl;
        
    } catch (error) { 
        console.error('Ошибка загрузки аватарки в GitHub:', error); 
        throw new Error('Не удалось загрузить аватар в репозиторий GitHub.');
    } 
}


// НОВЫЙ КОД: Данные для закрепленного чата "Diamond GPT"

// ===================================================
// НОВЫЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ СТРИМИНГА
// ===================================================
const DIAMOND_GPT_MESSAGES_KEY = 'diamond_gpt_messages';

/**
 * Загружает сохраненные сообщения Diamond GPT из localStorage.
 * @returns {Array<Object>} Массив сообщений.
 */
function loadDiamondGptMessages() {
    try {
        const json = localStorage.getItem(DIAMOND_GPT_MESSAGES_KEY);
        // Возвращаем пустой массив, если данных нет или ошибка парсинга
        return json ? JSON.parse(json) : [];
    } catch (e) {
        console.error('Ошибка загрузки сообщений Diamond GPT из localStorage:', e);
        return [];
    }
}

/**
 * Сохраняет сообщения Diamond GPT в localStorage.
 * @param {Array<Object>} messages - Массив сообщений.
 */
function saveDiamondGptMessages(messages) {
    if (messages.length === 0) {
        localStorage.removeItem(DIAMOND_GPT_MESSAGES_KEY);
        return;
    }
    try {
        localStorage.setItem(DIAMOND_GPT_MESSAGES_KEY, JSON.stringify(messages));
    } catch (e) {
        console.error('Ошибка сохранения сообщений Diamond GPT в localStorage:', e);
    }
}

/**
 * Сохраняет одно сообщение в localStorage (должна вызываться для исходящих и входящих).
 * @param {Object} message - Объект сообщения.
 */
function saveDiamondGptMessage(message) {
    // Сохраняем, только если это чат Diamond GPT
    if (currentChat === DIAMOND_GPT_CHAT.id) {
        const savedMessages = loadDiamondGptMessages();
        savedMessages.push(message);
        saveDiamondGptMessages(savedMessages);
    }
}

/**
 * Загружает и отображает визуальную историю чата Diamond GPT из localStorage.
 * Возвращает true, если это чат Diamond GPT и мы загрузили историю.
 */
function loadDiamondGptChatHistory() {
    if (currentChat !== DIAMOND_GPT_CHAT.id) return false;
    
    // Очищаем текущий чат
    messagesDiv.innerHTML = '';
    
    const messages = loadDiamondGptMessages();
    
    if (messages.length === 0) {
        // Вызываем функцию для пустого чата (если она есть)
        if (typeof renderEmptyChatState === 'function') {
             renderEmptyChatState();
        }
        return true; 
    }
    
    // Отображаем сообщения
    messages.forEach(message => {
        // Временно подменяем currentUser.username, если это сообщение от AI,
        // чтобы createMessageElement корректно создал входящее сообщение.
        const originalUsername = currentUser.username;
        const isIncoming = message.user === DIAMOND_GPT_CHAT.id;
        
        if (isIncoming) {
            currentUser.username = 'temp_for_ui_logic'; 
        }
        
        const messageDiv = createMessageElement(message); 
        messagesDiv.appendChild(messageDiv);
        
        currentUser.username = originalUsername; // Возвращаем обратно
    });
    
    // Прокрутка вниз
    if (typeof scrollToBottom === 'function') {
        scrollToBottom();
    }
    
    return true; // Указывает, что история Diamond GPT была загружена
}

const decoder = new TextDecoder("utf-8");

// Вспомогательная функция для парсинга данных из OpenRouter (Server-Sent Events)
function parseOpenRouterStreamChunk(chunk) {
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
    for (const line of lines) {
        const jsonString = line.substring(6);
        if (jsonString === '[DONE]') return null;
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            // Игнорируем неполные или некорректные JSON-блоки
        }
    }
    return null;
}

/**
 * Создает пустой элемент для приема стримингового сообщения.
 * Возвращает элемент, куда нужно добавлять текст.
 */
function createStreamingMessageElement() {
    // Используем существующую логику создания сообщения с пустым текстом
    const message = {
        id: Date.now().toString(),
        user: DIAMOND_GPT_CHAT.id, 
        text: '', 
        timestamp: Date.now(),
        type: 'text'
    };
    
    // Временно меняем имя пользователя, чтобы createMessageElement создал входящее сообщение
    const originalUsername = currentUser.username;
    currentUser.username = 'temp_for_ui_logic'; 
    
    // Предполагается, что createMessageElement возвращает корневой div сообщения
    const messageDiv = createMessageElement(message); 
    messagesDiv.appendChild(messageDiv);
    
    currentUser.username = originalUsername; // Возвращаем обратно
    
    // Ищем элемент, куда вставляется текст (обычно это message-bubble)
    let contentElement = messageDiv.querySelector('.message-bubble'); 
    if (!contentElement) {
         // Если не нашли, используем сам div сообщения
         contentElement = messageDiv;
    }

    return { messageDiv, contentElement };
}

// Функция для добавления входящего сообщения AI в UI
// Использует существующие функции: createMessageElement, scrollToBottom
function addIncomingAiMessage(message) {
    if (currentChat !== DIAMOND_GPT_CHAT.id) return;
    
    // ДОБАВЛЕНО: Сохраняем сообщение в localStorage для визуальной истории
    saveDiamondGptMessage(message); 
    // КОНЕЦ ДОБАВЛЕНИЯ

    // Временно меняем имя текущего пользователя, чтобы создать входящее сообщение
    const originalUsername = currentUser.username;
    currentUser.username = 'temp_for_ui_logic'; 
    
    // Предполагается, что messagesDiv, createMessageElement и scrollToBottom доступны в app.js
    const messageDiv = createMessageElement(message); 
    messagesDiv.appendChild(messageDiv);
    
    currentUser.username = originalUsername; // Возвращаем обратно
    
    if (typeof scrollToBottom === 'function') {
        scrollToBottom(); 
    }
}

// =======================================================
// НОВАЯ ФУНКЦИЯ: ГАРАНТИРОВАННОЕ ВКЛЮЧЕНИЕ ПРОКРУТКИ ЧАТОВ
// =======================================================
function fixChatsListScroll() {
    const chatsList = document.getElementById('chats-list');
    const header = document.querySelector('.header');
    const bottomNav = document.querySelector('.bottom-nav');

    if (!chatsList || !header || !bottomNav) {
        // Если элементы не найдены, прекращаем выполнение, чтобы избежать ошибок
        return;
    }

    // 1. Получаем высоту шапки (header) и нижней навигации (bottom-nav)
    const headerHeight = header.offsetHeight;
    const bottomNavHeight = bottomNav.offsetHeight;

    // 2. Вычисляем доступную высоту: Вся высота экрана - высота шапки - высота навигации
    const availableHeight = window.innerHeight - headerHeight - bottomNavHeight;

    // 3. Устанавливаем принудительную высоту с помощью inline-стиля (самый высокий приоритет)
    // Уменьшаем на 1px для запаса и гарантированного появления скроллбара
    chatsList.style.height = `${availableHeight - 1}px`;
    chatsList.style.overflowY = 'auto';
    chatsList.style.overflowX = 'hidden';
}

// Прикрепляем функцию к событию изменения размера окна (для мобильных устройств)
window.addEventListener('resize', fixChatsListScroll);



/**
 * Отправляет сообщение пользователя AI и обрабатывает ответ.
 */
async function sendToDiamondGpt(userMessage) {
    if (!userMessage.trim()) return;

    // 1. Добавляем сообщение пользователя в историю
    diamondGptHistory.push({ role: "user", content: userMessage });

    // 2. Включаем индикатор печати
    // Предполагается, что в основном приложении есть элемент для индикации печати
    const chatStatusElement = document.getElementById('chat-status'); // Или другой ID для статуса
    if (chatStatusElement) {
        chatStatusElement.textContent = 'Diamond GPT печатает...';
    }
    
    const typingIndicator = document.getElementById('typing_indicator'); // Если есть отдельный элемент
    if (typingIndicator) typingIndicator.style.display = 'block';

    try {
        // 3. Вызываем API (логика из contact.html)
        const response = await fetch(AI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`,
                'HTTP-Referer': window.location.href, 
                'X-Title': 'Diamond GPT' 
            },
            body: JSON.stringify({
                model: AI_MODEL_NAME, 
                messages: diamondGptHistory,
                max_tokens: 500, // Из contact.html
                temperature: 0.7 // Из contact.html
            })
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: 'Неизвестная ошибка API' }));
             throw new Error(`Ошибка ответа API: ${response.status} - ${errorData.message || 'API error'}`);
        }

        const data = await response.json();
        
        const aiResponseText = data.choices?.[0]?.message?.content || "Извините, произошла ошибка попробуйте  перефразировать вопрос.";
        
        // 4. Добавляем ответ AI в историю и на экран
        diamondGptHistory.push({ role: "assistant", content: aiResponseText });
        
        // Ограничиваем историю, как в contact.html: 6 пар сообщений + system prompt
        if (diamondGptHistory.length > 13) { 
            diamondGptHistory = [diamondGptHistory[0], ...diamondGptHistory.slice(-12)]; //
        }
        
        const aiMessage = {
            id: Date.now().toString(),
            user: DIAMOND_GPT_CHAT.id, // Отправитель - Diamond GPT
            text: aiResponseText,
            timestamp: Date.now(),
            type: 'text'
        };

        addIncomingAiMessage(aiMessage); 

    } catch (error) {
        console.error("Ошибка Diamond GPT:", error);
        
        addIncomingAiMessage({
            id: Date.now().toString(),
            user: DIAMOND_GPT_CHAT.id,
            text: `⚠️ Ошибка: ${error.message}. Проверьте работу API Deepseek.`,
            timestamp: Date.now(),
            type: 'text'
        });
        
        // Удаляем последнее сообщение пользователя
        diamondGptHistory.pop(); 
    } finally {
        // 5. Скрываем индикатор печати и возвращаем статус
        if (chatStatusElement) {
             chatStatusElement.textContent = DIAMOND_GPT_CHAT.status; // Или 'Online'
        }
        if (typingIndicator) typingIndicator.style.display = 'none';
    }
}
// ===================================================
// КОНЕЦ КОДА DIAMOND GPT
// ===================================================

async function generateEncryptionKey() {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ENCRYPTION_KEY);
  const keyBuffer = await crypto.subtle.digest('SHA-256', keyData);
  
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function handleDeepLink() {
    const url = new URL(window.location.href);
    const path = url.pathname; 

    const usernameMatch = path.match(/^\/(@\w+)/);
    if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];

        if (contacts && contacts.includes(username)) {
            openChat(username, username);
        } else {
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

window.addEventListener('load', handleDeepLink);

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

let messageCache = new Map();
let messageBatch = [];
const BATCH_SIZE = 5;
const BATCH_TIMEOUT = 100;

let isSelectMode = false;
let selectedChats = new Set();

let cachedMessages = {};
let isFirstLoad = true;

async function processMessage(msg) {
    if (!cachedMessages[currentChat]) {
        cachedMessages[currentChat] = [];
    }
    
    if (!cachedMessages[currentChat].some(m => m.id === msg.id)) {
        if (msg.encrypted && msg.type === 'text') {
            try {
                msg.originalText = msg.text;
                msg.text = await decryptText(msg.text);
                msg.decrypted = true;
            } catch (error) {
                console.error('Failed to decrypt message:', error);
                msg.text = '🔒 Зашифрованное сообщение';
                msg.failedDecryption = true;
            }
        }
        
        cachedMessages[currentChat].push(msg);
        
        const messageDiv = createMessageElement(msg);
        messagesDiv.appendChild(messageDiv);

        if (msg.user !== currentUser.username && currentChat) {
            playMessageSound();
        }
    }
}

function setupMessageVirtualization() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const messageId = entry.target.dataset.messageId;
        if (!messageCache.has(messageId)) {
        }
      }
    });
  }, { root: messagesDiv, threshold: 0.1 });

  document.querySelectorAll('.message').forEach(msg => {
    observer.observe(msg);
  });
}

// app.js

// app.js

function renderChatList(contacts) {
  // chatsList — глобальная переменная, определенная в app.js
  // 1. Убеждаемся, что Diamond GPT не дублируется
  const diamondChatExists = contacts.some(c => c.id === DIAMOND_GPT_CHAT.id);
  const filteredContacts = diamondChatExists 
      ? contacts.filter(c => c.id !== DIAMOND_GPT_CHAT.id) 
      : contacts;
      
  // 2. Добавляем закрепленный чат в начало списка
  const allChats = [DIAMOND_GPT_CHAT, ...filteredContacts];

  const fragment = document.createDocumentFragment();
  
  allChats.forEach(contact => {
    const chatItem = createChatItem(contact);
    fragment.appendChild(chatItem);
  });
  
  if (chatsList) { // Проверка на наличие элемента списка чатов
    chatsList.innerHTML = '';
    chatsList.appendChild(fragment);
  }
}

// app.js

function createChatItem(contact) {
    // НОВЫЙ КОД: Проверка на Diamond GPT и добавление класса
    const isDiamondGPT = contact.id === DIAMOND_GPT_CHAT.id;
    
    const chatItem = document.createElement('div');
    // Добавляем класс 'pinned-chat' для стилизации
    chatItem.className = 'chat-item' + (isDiamondGPT ? ' pinned-chat' : ''); 
    
    chatItem.dataset.chatId = contact.id;
    chatItem.dataset.isGroup = contact.isGroup || false;
    
    let avatarContent;
    if (contact.isGroup) {
        avatarContent = '<div class="avatar-text"><i class="fas fa-users"></i></div>';
    } else {
        // Логика аватара остается прежней, она автоматически возьмет avatarUrl из константы
        avatarContent = contact.avatarUrl 
            ? `<img src="${contact.avatarUrl}" alt="${contact.username}">` 
            : `<div class="avatar-text">${contact.username.charAt(0).toUpperCase()}</div>`;
    }
    
    // Используем contact.status для отображения текста
    chatItem.innerHTML = `
        <div class="chat-avatar ${contact.isGroup ? 'group-avatar' : ''}">
            ${avatarContent}
        </div>
        <div class="chat-info">
            <div class="chat-name-wrapper">
                <span class="chat-name">${contact.username}</span>
                </div>
            <div class="chat-status">${contact.status}</div>
        </div>
    `;
    
    // ОБРАБОТЧИК КЛИКА: Этот код остается без изменений, 
    // он откроет чат с ID '@diamond_gpt', который будет обрабатываться как обычный чат.
    chatItem.addEventListener('click', () => {
        if (contact.isGroup) {
            openChat(contact.id, contact.username, null, true);
        } else {
            openChat(contact.id, contact.username, contact.avatarUrl);
        }
    });
    
    return chatItem;
}

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

let friendSearchInterval;
let userIcons = [];

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
const attachmentBtn = document.getElementById('attachment-btn');
const attachmentMenu = document.getElementById('attachment-menu');
const typingIndicator = document.getElementById('typing-indicator');
const emojiBtn = document.getElementById('emoji-btn');

const bottomNavItems = document.querySelectorAll('.nav-item');

const settingsBackBtn = document.getElementById('settings-back-btn');
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
    // 1. Скрываем все основные экраны (кроме главного контейнера 'app')
    Object.keys(screens).forEach(key => {
        const screenElement = screens[key];
        // Исключаем главный контейнер 'app', модальные окна, и экраны, которые не являются основными
        if (screenElement && screenElement.id !== 'app' && screenElement.id !== 'qrModal' && !screenElement.classList.contains('modal')) {
            screenElement.style.display = 'none';
        }
    });

    // 2. Показываем целевой экран
    const targetScreen = screens[screenName];
    if (targetScreen) {
        // Используем 'flex' для правильного отображения, если это основной экран
        targetScreen.style.display = 'flex'; 
        
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Устанавливаем z-index для экрана настроек, чтобы он точно был выше
        if (screenName === 'settings') {
            targetScreen.style.zIndex = '10'; // Любое значение выше 1, но ниже модальных окон
        }
    }
    
    // 3. КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Скрываем `.loading-overlay`
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none'; 
    }
    
    // 4. Устанавливаем активный элемент в нижней навигации
    setActiveNavItem(screenName);
}

function setupBottomNavListeners() {
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const screenName = item.dataset.screen;
            
            // Проверяем, что навигационный элемент имеет data-screen, например, 'settings'
            if (screenName) {
                showScreen(screenName); 
            }
        });
    });
}

// Вызовите эту функцию после инициализации всех переменных (например, в конце app.js или в window.onload)

async function preloadData() {
  try {
    const snapshot = await db.ref(`users/${currentUser.nickname}/contacts`).once('value');
    contacts = snapshot.val() ? Object.keys(snapshot.val()) : [];

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

// Функция для форматирования текста с поддержкой Markdown
function advancedFormatMessage(text) {
    return text
        // Жирный **текст**
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        
        // Курсив *текст* 
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        
        // Зачёркнутый ~~текст~~
        .replace(/~~(.*?)~~/g, '<s>$1</s>')
        
        // Код `код`
        .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
        
        // Многострочный код ```код```
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        
        // Ссылки [текст](url)
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
        
        // Заголовки ## Заголовок
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        
        // Горизонтальная линия ---
        .replace(/^\-\-\-$/gim, '<hr>')
        
        // Переносы строк
        .replace(/\n/g, '<br>');
}

// ----------------------------------------------------
// ФУНКЦИЯ: createMessageElement (С ВОССТАНОВЛЕННОЙ ЛОГИКОЙ СТИКЕРОВ)
// ----------------------------------------------------
function createMessageElement(msg) {
    try {
        const isOutgoing = msg.user === currentUser.username;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        messageDiv.dataset.messageId = msg.id || msg.timestamp;
        
        const date = new Date(msg.timestamp);
        const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        const readStatusIcon = isOutgoing 
            ? `<i class="fas ${msg.read ? 'fa-check-double read-status-icon' : 'fa-check read-status-icon'}"></i>`
            : '';

        let finalHTML = '';
        const messageType = msg.type || 'text'; 
        let messageBubbleClasses = 'message-content';

        if (messageType === 'sticker') {
            const stickerUrl = `stickers/${msg.stickerPack}/${msg.stickerNumber}.png`; 
            
            if (!msg.stickerPack || !msg.stickerNumber) return messageDiv; 
            
            messageDiv.className += ' sticker';
            finalHTML = `
                <img src="${stickerUrl}" alt="Sticker" class="message-sticker" 
                     onload="this.style.opacity='1'" 
                     onerror="this.style.display='none'">
                <div class="message-time-sticker-overlay">
                    <span class="message-time-sticker">${timeString}</span>
                    ${readStatusIcon}
                </div>
            `;

        } else if (messageType === 'image') {
            const imageUrl = msg.imageUrl;
            if (!imageUrl) return messageDiv; 
            
            const captionText = msg.text ? `<div class="image-caption">${advancedFormatMessage(msg.text)}</div>` : ''; 
            messageBubbleClasses += ' message-image-content';
            
            const contentHTML = `
                <img src="" data-src="${imageUrl}" alt="Image" 
                     class="cached-image" 
                     onclick="if(typeof showImageModal === 'function') showImageModal(this.src || this.dataset.src);"
                     style="opacity: 0.5; transition: opacity 0.3s ease;">
                ${captionText}
                <div class="message-time-image-overlay">
                    <span class="message-time">${timeString}</span>
                    ${readStatusIcon}
                </div>
            `;
            finalHTML = `<div class="${messageBubbleClasses}">${contentHTML}</div>`;

        } else { 
            const textContent = msg.text || '';
            const formattedText = advancedFormatMessage(textContent); // АКТИВАЦИЯ ФОРМАТИРОВАНИЯ
            
            const emojiRegex = /(\p{Emoji})/gu; 
            const textWithoutSpaces = textContent.trim();
            const matches = textWithoutSpaces.match(emojiRegex);
            
            const isOnlyLargeEmoji = (textWithoutSpaces.length > 0) && 
                                     (matches && matches.length === Array.from(textWithoutSpaces).length) && 
                                     (matches.length <= 4);

            if (isOnlyLargeEmoji) {
                messageDiv.className += ' large-emoji-message';
                finalHTML = `
                    <span class="large-emoji">${textWithoutSpaces}</span>
                    <div class="message-time-sticker-overlay">
                        <span class="message-time-sticker">${timeString}</span>
                        ${readStatusIcon}
                    </div>
                `;
            } else {
                // ИСПОЛЬЗУЕМ ОТФОРМАТИРОВАННЫЙ ТЕКСТ
                const contentHTML = `
                    <div class="message-text">${formattedText}</div>
                    <div class="message-time-wrapper">
                        <span class="message-time">${timeString}</span>
                        ${readStatusIcon}
                    </div>
                `;
                finalHTML = `<div class="${messageBubbleClasses}">${contentHTML}</div>`;
            }
        }

        messageDiv.innerHTML = finalHTML;
        
        // Загружаем изображения с кэшированием после создания элемента
        if (messageType === 'image') {
            const imgElement = messageDiv.querySelector('img.cached-image');
            if (imgElement) {
                const imageUrl = imgElement.dataset.src;
                displayCachedImage(imgElement, imageUrl, 'images')
                    .catch(error => {
                        console.error('Ошибка загрузки изображения:', error);
                        imgElement.src = imageUrl;
                        imgElement.style.opacity = '1';
                    });
            }
        }
        
        // Обработчики событий
        messageDiv.addEventListener('longpress', () => {
            if (typeof handleMessageLongPress === 'function') {
                handleMessageLongPress(messageDiv, msg);
            }
        });
        messageDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (typeof handleContextMenu === 'function') {
                handleContextMenu(e);
            }
        });

        return messageDiv;

    } catch (error) {
        console.error(`Ошибка при создании элемента сообщения ID ${msg.id}.`, error);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message incoming';
        errorDiv.innerHTML = `<div class="message-content" style="color: red;">[ОШИБКА ОТОБРАЖЕНИЯ] Сообщение ID ${msg.id}.</div>`;
        return errorDiv;
    }
}

function showChatInfoScreen() {
    chatView.style.display = 'none';

    const chatInfoScreen = document.createElement('div');
    chatInfoScreen.id = 'chat-info-screen';
    chatInfoScreen.className = 'chat-info-container';
    chatInfoScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--card);
        z-index: 1001;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    `;
    
    chatInfoScreen.innerHTML = `
        <div class="chat-info-header">
            <div class="header-left">
                <button class="back-button" id="chat-info-back-btn">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="header-title">Информация о чате</div>
            </div>
            <div class="header-actions">
                <button class="header-icon" id="searchHeaderButton">
                    <i class="fas fa-search"></i>
                </button>
                <button class="header-icon" id="moreOptionsButton">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        </div>

        <div class="chat-content">
            <div class="chat-info-section" style="text-align: center; padding: 20px;">
                <div class="chat-avatar" id="chatAvatar" style="width: 100px; height: 100px; margin: 0 auto 16px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 36px; color: white; font-weight: bold; overflow: hidden;">
                    <span id="avatarText" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${currentChat ? currentChat.charAt(0).toUpperCase() : 'А'}</span>
                </div>
                <div class="chat-name" id="chatName" style="font-size: 24px; font-weight: 600; color: var(--text); margin-bottom: 8px; text-align: center;">${currentChat || 'Пользователь'}</div>
                <div class="chat-status" id="chatStatus" style="display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-secondary); font-size: 14px;">
                    <div class="online-indicator" style="width: 8px; height: 8px; border-radius: 50%; background: #4CAF50;"></div>
                    онлайн • был(а) 5 минут назад
                </div>
            </div>

            <div class="quick-actions" style="display: flex; justify-content: center; gap: 20px; padding: 20px; border-bottom: 1px solid var(--border);">
                <div class="action-button" id="searchButton" style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;">
                    <div class="action-icon" style="width: 50px; height: 50px; border-radius: 50%; background: var(--bg); display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--primary);">
                        <i class="fas fa-search"></i>
                    </div>
                    <div class="action-text" style="font-size: 12px; color: var(--text);">Поиск</div>
                </div>
                <div class="action-button" id="muteButton" style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;">
                    <div class="action-icon" style="width: 50px; height: 50px; border-radius: 50%; background: var(--bg); display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--primary);">
                        <i class="fas fa-bell-slash"></i>
                    </div>
                    <div class="action-text" style="font-size: 12px; color: var(--text);">Отключить звук</div>
                </div>
                <div class="action-button" id="mediaButton" style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;">
                    <div class="action-icon" style="width: 50px; height: 50px; border-radius: 50%; background: var(--bg); display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--primary);">
                        <i class="fas fa-photo-video"></i>
                    </div>
                    <div class="action-text" style="font-size: 12px; color: var(--text);">Медиа</div>
                </div>
            </div>

            <div class="friends-section" style="padding: 20px; border-bottom: 1px solid var(--border);">
                <div class="section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <span id="friends-title" style="font-weight: 600; color: var(--text);">Общие друзья (загрузка...)</span>
                    <span class="see-all" id="seeAllFriends" style="color: var(--primary); font-size: 14px; cursor: pointer;">Все друзья</span>
                </div>
                <div class="friends-list" id="friendsList">
                    <div class="loading-friends" style="text-align: center; color: var(--text-secondary); padding: 20px;">Загрузка общих друзей...</div>
                </div>
            </div>

            <div class="settings-section" style="padding: 0;">
                <div class="settings-item" id="notificationsSettings" style="display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer;">
                    <div class="settings-icon" style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg); display: flex; align-items: center; justify-content: center; margin-right: 12px; color: var(--primary);">
                        <i class="fas fa-bell"></i>
                    </div>
                    <div class="settings-text" style="flex: 1;">
                        <div class="settings-title" style="font-weight: 600; color: var(--text); margin-bottom: 2px;">Уведомления</div>
                        <div class="settings-desc" style="font-size: 14px; color: var(--text-secondary);">Включены</div>
                    </div>
                    <div class="settings-arrow" style="color: var(--text-secondary);">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
                <div class="settings-item" id="privacySettings" style="display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer;">
                    <div class="settings-icon" style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg); display: flex; align-items: center; justify-content: center; margin-right: 12px; color: var(--primary);">
                        <i class="fas fa-lock"></i>
                    </div>
                    <div class="settings-text" style="flex: 1;">
                        <div class="settings-title" style="font-weight: 600; color: var(--text); margin-bottom: 2px;">Приватность</div>
                        <div class="settings-desc" style="font-size: 14px; color: var(--text-secondary);">Настройки конфиденциальности</div>
                    </div>
                    <div class="settings-arrow" style="color: var(--text-secondary);">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
                <div class="settings-item" id="themeSettings" style="display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer;">
                    <div class="settings-icon" style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg); display: flex; align-items: center; justify-content: center; margin-right: 12px; color: var(--primary);">
                        <i class="fas fa-palette"></i>
                    </div>
                    <div class="settings-text" style="flex: 1;">
                        <div class="settings-title" style="font-weight: 600; color: var(--text); margin-bottom: 2px;">Оформление</div>
                        <div class="settings-desc" style="font-size: 14px; color: var(--text-secondary);">Светлая тема</div>
                    </div>
                    <div class="settings-arrow" style="color: var(--text-secondary);">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>

            <div class="danger-section" style="padding: 0; margin-top: 20px;">
                <div class="settings-item" id="clearHistory" style="display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer;">
                    <div class="settings-icon" style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg); display: flex; align-items: center; justify-content: center; margin-right: 12px; color: #ff6b6b;">
                        <i class="fas fa-trash"></i>
                    </div>
                    <div class="settings-text" style="flex: 1;">
                        <div class="settings-title" style="font-weight: 600; color: var(--text); margin-bottom: 2px;">Очистить историю</div>
                        <div class="settings-desc" style="font-size: 14px; color: var(--text-secondary);">Удалить все сообщения</div>
                    </div>
                    <div class="settings-arrow" style="color: var(--text-secondary);">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
                <div class="settings-item" id="blockUser" style="display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer;">
                    <div class="settings-icon" style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg); display: flex; align-items: center; justify-content: center; margin-right: 12px; color: #ff6b6b;">
                        <i class="fas fa-ban"></i>
                    </div>
                    <div class="settings-text" style="flex: 1;">
                        <div class="settings-title" style="font-weight: 600; color: var(--text); margin-bottom: 2px;">Заблокировать пользователя</div>
                        <div class="settings-desc" style="font-size: 14px; color: var(--text-secondary);">Прекратить получение сообщений</div>
                    </div>
                    <div class="settings-arrow" style="color: var(--text-secondary);">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(chatInfoScreen);

    loadRealUserAvatar();

    document.getElementById('chat-info-back-btn').addEventListener('click', function() {
        hideChatInfoScreen();
    });

    loadMutualFriends(currentChat);

    setupChatInfoHandlers();
}

async function loadRealUserAvatar() {
    if (!currentChat) return;
    
    try {

        const userSnapshot = await db.ref(`users/${currentChat}`).once('value');
        const userData = userSnapshot.val();
        
        const chatAvatar = document.getElementById('chatAvatar');
        const avatarText = document.getElementById('avatarText');
        const chatName = document.getElementById('chatName');
        const chatStatus = document.getElementById('chatStatus');
        
        if (userData) {
            if (userData.avatarUrl) {

                chatAvatar.innerHTML = '';
                const avatarImg = document.createElement('img');
                avatarImg.src = userData.avatarUrl;
                avatarImg.alt = currentChat;
                avatarImg.style.cssText = `
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                `;
                chatAvatar.appendChild(avatarImg);
            } else if (userData.username) {

                avatarText.textContent = userData.username.charAt(0).toUpperCase();
                avatarText.style.display = 'flex';
            }
       
            if (userData.username && chatName) {
                chatName.textContent = userData.username;
            }
            
            if (chatStatus) {
                const lastSeen = userData.lastSeen ? formatLastSeen(userData.lastSeen) : 'Недавно';
                const status = userData.isOnline ? 'Онлайн' : `Был(а) ${lastSeen}`;
                const onlineColor = userData.isOnline ? '#4CAF50' : '#9e9e9e';
                
                chatStatus.innerHTML = `
                    <div class="online-indicator" style="width: 8px; height: 8px; border-radius: 50%; background: ${onlineColor};"></div>
                    ${status}
                `;
            }
        }
        
    } catch (error) {
        console.error('Error loading user avatar:', error);
    }
}

async function loadMutualFriends(contactId) {
    if (!contactId || !currentUser) return;

    try {
        const friendsList = document.getElementById('friendsList');
        const friendsTitle = document.getElementById('friends-title');
        
        friendsList.innerHTML = '<div class="loading-friends">Поиск общих друзей...</div>';

        const currentUserContactsSnapshot = await db.ref(`users/${currentUser.nickname}/contacts`).once('value');
        const currentUserContacts = currentUserContactsSnapshot.val() || {};
        
        const contactUserContactsSnapshot = await db.ref(`users/${contactId}/contacts`).once('value');
        const contactUserContacts = contactUserContactsSnapshot.val() || {};

        console.log('Текущий пользователь контакты:', Object.keys(currentUserContacts));
        console.log('Контакт пользователь контакты:', Object.keys(contactUserContacts));

        const currentUserContactIds = Object.keys(currentUserContacts);
        const contactUserContactIds = Object.keys(contactUserContacts);
        
        const mutualFriends = currentUserContactIds.filter(contact => 
            contactUserContactIds.includes(contact) && 
            contact !== currentUser.nickname && 
            contact !== contactId &&
            !contact.startsWith('group_') // Исключаем групповые чаты
        );

        console.log('Найдено общих друзей:', mutualFriends);

        const displayFriends = mutualFriends.slice(0, 3);
        
        friendsTitle.textContent = `Общие друзья (${mutualFriends.length})`;

        if (mutualFriends.length === 0) {
            friendsList.innerHTML = `
                <div class="no-mutual-friends">
                    <i class="fas fa-user-friends" style="font-size: 32px; color: #ccc; margin-bottom: 8px;"></i>
                    <p style="color: var(--text-secondary); font-size: 14px;">Нет общих друзей</p>
                </div>
            `;
            return;
        }

        const friendsData = [];
        for (const friendId of displayFriends) {
            try {
                const friendSnapshot = await db.ref(`users/${friendId}`).once('value');
                const friendData = friendSnapshot.val();
                if (friendData) {
                    friendsData.push({
                        id: friendId,
                        username: friendData.username || friendId,
                        nickname: friendId,
                        isOnline: friendData.isOnline || false,
                        lastSeen: friendData.lastSeen || Date.now(),
                        avatarUrl: friendData.avatarUrl
                    });
                }
            } catch (friendError) {
                console.error(`Error loading friend ${friendId}:`, friendError);
            }
        }

        console.log('Данные друзей для отображения:', friendsData);

        friendsList.innerHTML = '';
        
        if (friendsData.length === 0) {
            friendsList.innerHTML = `
                <div class="no-mutual-friends">
                    <i class="fas fa-user-friends" style="font-size: 32px; color: #ccc; margin-bottom: 8px;"></i>
                    <p style="color: var(--text-secondary); font-size: 14px;">Не удалось загрузить данные друзей</p>
                </div>
            `;
            return;
        }

        friendsData.forEach(friend => {
            const friendItem = createMutualFriendItem(friend);
            friendsList.appendChild(friendItem);
        });

        if (mutualFriends.length > 3) {
            const seeAllBtn = document.createElement('div');
            seeAllBtn.className = 'see-all-friends-btn';
            seeAllBtn.innerHTML = `
                <div class="see-all-content">
                    <div class="see-all-avatar">
                        <i class="fas fa-ellipsis-h"></i>
                    </div>
                    <div class="see-all-text">
                        Показать всех общих друзей (${mutualFriends.length})
                    </div>
                </div>
            `;
            seeAllBtn.addEventListener('click', () => showAllMutualFriends(mutualFriends));
            friendsList.appendChild(seeAllBtn);
        }

    } catch (error) {
        console.error('Error loading mutual friends:', error);
        friendsList.innerHTML = `
            <div class="error-loading-friends">
                <i class="fas fa-exclamation-triangle" style="color: #ff6b6b; font-size: 32px; margin-bottom: 8px;"></i>
                <p style="color: var(--text-secondary); font-size: 14px;">Ошибка загрузки</p>
            </div>
        `;
    }
}

function createMutualFriendItem(friend) {
    const friendItem = document.createElement('div');
    friendItem.className = 'friend-item';
    friendItem.style.cursor = 'pointer';
    
    const status = friend.isOnline ? 'Онлайн' : `Был(а) ${formatLastSeen(friend.lastSeen)}`;
    const statusClass = friend.isOnline ? 'online' : '';
    
    const avatarContent = friend.avatarUrl 
        ? `<img src="${friend.avatarUrl}" alt="${friend.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
        : `<span style="color: white; font-weight: 600;">${friend.username.charAt(0).toUpperCase()}</span>`;

    friendItem.innerHTML = `
        <div class="friend-avatar ${friend.isOnline ? 'online' : ''}" style="position: relative; width: 44px; height: 44px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
            ${avatarContent}
            ${friend.isOnline ? '<div class="online-dot" style="position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background: #4CAF50; border: 2px solid white; border-radius: 50%;"></div>' : ''}
        </div>
        <div class="friend-info" style="flex: 1; min-width: 0;">
            <div class="friend-name" style="font-weight: 600; color: var(--text); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${friend.username}</div>
            <div class="friend-username" style="font-size: 13px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${friend.nickname}</div>
        </div>
        <div class="friend-status ${statusClass}" style="font-size: 12px; color: ${friend.isOnline ? '#4CAF50' : 'var(--text-secondary)'}; font-weight: ${friend.isOnline ? '500' : 'normal'}; flex-shrink: 0; margin-left: 8px;">
            ${status}
        </div>
    `;

    friendItem.addEventListener('click', (e) => {
        e.stopPropagation();
        hideChatInfoScreen();
        openChat(friend.nickname, friend.username, friend.avatarUrl);
    });

    return friendItem;
}

async function showAllMutualFriends(mutualFriendIds) {
    try {
        const chatInfoScreen = document.getElementById('chat-info-screen');
        if (chatInfoScreen) {
            chatInfoScreen.style.display = 'none';
        }

        const modal = document.createElement('div');
        modal.className = 'modal mutual-friends-modal';
        modal.style.zIndex = '1002'; 
        modal.innerHTML = `
            <div class="modal-content">
                <h3 class="modal-title">Все общие друзья (${mutualFriendIds.length})</h3>
                <div class="modal-body">
                    <div class="mutual-friends-list" id="allMutualFriendsList">
                        <div class="loading">Загрузка...</div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" id="closeMutualFriends">Закрыть</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        const allFriendsData = [];
        for (const friendId of mutualFriendIds) {
            const friendSnapshot = await db.ref(`users/${friendId}`).once('value');
            const friendData = friendSnapshot.val();
            if (friendData) {
                allFriendsData.push({
                    id: friendId,
                    username: friendData.username,
                    nickname: friendId,
                    isOnline: friendData.isOnline || false,
                    lastSeen: friendData.lastSeen || Date.now(),
                    avatarUrl: friendData.avatarUrl
                });
            }
        }

        allFriendsData.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return 0;
        });

        const friendsList = document.getElementById('allMutualFriendsList');
        friendsList.innerHTML = '';

        if (allFriendsData.length === 0) {
            friendsList.innerHTML = `
                <div class="no-mutual-friends">
                    <i class="fas fa-user-friends" style="font-size: 48px; color: #ccc; margin-bottom: 10px;"></i>
                    <p>Нет общих друзей</p>
                </div>
            `;
        } else {
            allFriendsData.forEach(friend => {
                const friendItem = createMutualFriendItem(friend);
                friendsList.appendChild(friendItem);
            });
        }

        document.getElementById('closeMutualFriends').addEventListener('click', () => {
            modal.style.display = 'none';
            setTimeout(() => {
                modal.remove();
                if (chatInfoScreen) {
                    chatInfoScreen.style.display = 'flex';
                }
            }, 300);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                setTimeout(() => {
                    modal.remove();
                    if (chatInfoScreen) {
                        chatInfoScreen.style.display = 'flex';
                    }
                }, 300);
            }
        });

    } catch (error) {
        console.error('Error showing all mutual friends:', error);
        showAlert('Ошибка загрузки списка друзей', 'Ошибка');
        
        const chatInfoScreen = document.getElementById('chat-info-screen');
        if (chatInfoScreen) {
            chatInfoScreen.style.display = 'flex';
        }
    }
}

function setupChatInfoHandlers() {
    document.getElementById('muteButton').addEventListener('click', function() {
        const button = this;
        const icon = button.querySelector('.action-icon i');
        const text = button.querySelector('.action-text');
        
        if (icon.classList.contains('fa-bell-slash')) {
            icon.className = 'fas fa-bell';
            text.textContent = 'Включить звук';
            showToast('Уведомления включены');
        } else {
            icon.className = 'fas fa-bell-slash';
            text.textContent = 'Отключить звук';
            showToast('Уведомления отключены');
        }
    });

    document.getElementById('searchButton').addEventListener('click', function() {
        showAlert('Функция поиска по сообщениям будет доступна в следующем обновлении');
    });
    
    document.getElementById('seeAllFriends').addEventListener('click', async function() {
        try {
            const currentUserContactsSnapshot = await db.ref(`users/${currentUser.nickname}/contacts`).once('value');
            const currentUserContacts = Object.keys(currentUserContactsSnapshot.val() || {});
            
            const contactUserContactsSnapshot = await db.ref(`users/${currentChat}/contacts`).once('value');
            const contactUserContacts = Object.keys(contactUserContactsSnapshot.val() || {});

            const mutualFriends = currentUserContacts.filter(contact => 
                contactUserContacts.includes(contact) && contact !== currentUser.nickname && contact !== currentChat
            );

            if (mutualFriends.length === 0) {
                showAlert('У вас нет общих друзей', 'Общие друзья');
                return;
            }

            showAllMutualFriends(mutualFriends);
        } catch (error) {
            console.error('Error loading all mutual friends:', error);
            showAlert('Ошибка загрузки списка друзей', 'Ошибка');
        }
    });

    document.getElementById('mediaButton').addEventListener('click', function() {
        showAlert('Просмотр медиафайлов будет доступен в следующем обновлении');
    });

    document.getElementById('notificationsSettings').addEventListener('click', function() {
        showNotificationSettingsModal();
    });

    document.getElementById('privacySettings').addEventListener('click', function() {
        showPrivacySettingsModal();
    });

    document.getElementById('themeSettings').addEventListener('click', function() {
        showThemeSettingsModal();
    });

    document.getElementById('clearHistory').addEventListener('click', function() {
        showConfirm('Вы уверены, что хотите очистить историю переписки?', 'Очистка истории', (confirmed) => {
            if (confirmed) {
                showToast('История переписки очищена');
            }
        });
    });

    document.getElementById('blockUser').addEventListener('click', function() {
        showConfirm('Вы уверены, что хотите заблокировать этого пользователя?', 'Блокировка пользователя', (confirmed) => {
            if (confirmed) {
                showToast('Пользователь заблокирован');
                hideChatInfoScreen();
            }
        });
    });

    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            themeIcon.className = 'fas fa-moon';
            document.querySelector('#themeSettings .settings-desc').textContent = 'Светлая тема';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeIcon.className = 'fas fa-sun';
            document.querySelector('#themeSettings .settings-desc').textContent = 'Тёмная тема';
        }
    });
}

function hideChatInfoScreen() {
    const chatInfoScreen = document.getElementById('chat-info-screen');
    if (chatInfoScreen) {
        chatInfoScreen.remove();

        if (currentChat) {
            chatView.style.display = 'flex';
        }
    }
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

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function init() {
  await initializeFirebase();
  
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
  
  setupLongPress();
  
  initSearch();
  
  loadUser();
  loadSettings();
  setupEventListeners();
  optimizeAnimations();
  
  document.querySelectorAll('.auth-screen, .welcome-screen').forEach(screen => {
    screen.classList.add('screen');
  });
  
  if (currentUser) {
  //  await preloadData();
    showApp();
    
    window.addEventListener('focus', () => setOnlineStatus(true));
    window.addEventListener('blur', () => setOnlineStatus(false));
    setOnlineStatus(true);
  } else {
    screens.welcome.style.display = 'flex';
    setTimeout(() => {
      
      document.querySelector('.welcome-title').classList.add('animate__fadeInUp');
      document.querySelector('.welcome-subtitle').classList.add('animate__fadeInUp');
      
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
      '--text': '#1e293b',
      '--text-secondary': '#64748b',
      '--border': '#e2e8f0'
    },
    dark: {
      '--primary': '#6366f1',
      '--primary-dark': '#4f46e5',
      '--bg': '#0f172a',
      '--card': '#1e293b',
      '--text': '#f8fafc',
      '--text-secondary': '#94a3b8',
      '--border': '#334155'
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
  
  document.addEventListener('DOMContentLoaded', function() {
      const startButton = document.getElementById('startButton');
      const welcomeScreen = document.getElementById('welcome-screen');
      const usernameScreen = document.getElementById('username-screen');
    
      startButton.addEventListener('click', function() {
          welcomeScreen.style.display = 'none';
          usernameScreen.style.display = 'flex';
      });
   });
   
   document.getElementById('chat-info-btn').addEventListener('click', () => {
    if (currentChat && currentChat.startsWith(GROUP_CHAT_PREFIX)) {
        showGroupInfoScreen();
    } else {
        showChatInfoScreen();
    }
});
   
   document.getElementById('startButton').addEventListener('click', function() {
       screens.welcome.classList.add('hidden');
    
       setTimeout(() => {
           screens.welcome.style.display = 'none';
           screens.username.style.display = 'flex';
           screens.welcome.classList.remove('hidden');
       }, 750);
   });
  
  document.querySelector('.settings-tile[onclick="showPreferences()"]').addEventListener('click', showPreferences);
  
  document.getElementById('login-username').addEventListener('input', (e) => {
    const username = e.target.value.trim();
    document.getElementById('login-continue-btn').disabled = !username;
    
    if (username && !username.startsWith('@')) {
      e.target.value = '@' + username;
    }
  });
  
  document.addEventListener('click', function(e) {
    const verifiedBadge = e.target.closest('.verified-badge');
    if (verifiedBadge) {
      e.preventDefault();
      showFullscreenVerification();
    }
  });
  
  document.querySelectorAll('.verified-badge').forEach(badge => {
    badge.style.cursor = 'pointer';
  });
  
  document.getElementById('close-fullscreen-animation').addEventListener('click', function() {
    document.getElementById('fullscreen-animation-modal').style.display = 'none';
  });
  
  document.getElementById('chat-info-btn').addEventListener('click', () => {
    if (currentChat && currentChat.startsWith(GROUP_CHAT_PREFIX)) {
      showGroupInfoScreen();
    } else {
      showChatInfo();
    }
  });
  
  document.getElementById('fullscreen-animation-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      this.style.display = 'none';
    }
  });
  
document.addEventListener('DOMContentLoaded', function() {
  const loginInput = document.getElementById('login-username');
  const loginError = document.getElementById('username-error');
  
  loginInput.addEventListener('input', function(e) {
    if (!this.value.startsWith('@') && this.value.length > 0) {
      this.value = '@' + this.value.replace('@', '');
    }
    
    document.getElementById('login-continue-btn').disabled = !this.value.trim();
  });
  
  loginInput.autofocus = false;
});
  
  document.getElementById('login-continue-btn').addEventListener('click', () => {
  const username = document.getElementById('login-username').value.trim();
  if (!username) return;

  screens.username.classList.add('slide-out-left');
  
  setTimeout(() => {
    screens.username.style.display = 'none';
    screens.username.classList.remove('slide-out-left');
    
    screens.password.style.display = 'flex';
    screens.password.classList.add('slide-in-right');
    
    document.getElementById('password-user-login').textContent = username;
    
    setTimeout(() => {
      screens.password.classList.remove('slide-in-right');
    }, 300);
    
  }, 300);
});
  
  document.getElementById('back-to-username').addEventListener('click', () => {
  screens.password.classList.add('slide-out-right');
  
  setTimeout(() => {
    screens.password.style.display = 'none';
    screens.password.classList.remove('slide-out-right');
    
    screens.username.style.display = 'flex';
    screens.username.classList.add('slide-in-left');
    
    setTimeout(() => {
      screens.username.classList.remove('slide-in-left');
    }, 300);
    
  }, 300);
});

  document.getElementById('back-to-login').addEventListener('click', () => {
    screens.register.style.display = 'none';
    screens.username.style.display = 'flex';
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
  
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('login-password');

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function() {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.classList.add('hide');
      } else {
        passwordInput.type = 'password';
        togglePassword.classList.remove('hide');
      }
    });
  }

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
  
  settingsQrBtn.addEventListener('click', async () => {
    await generateQRCode(currentUser.nickname.replace('@', ''));
    document.getElementById('qr-modal').style.display = 'flex';
  });
  
  qrClose.addEventListener('click', () => {
    screens.qrModal.style.display = 'none';
  });
  
  settingsProfileUsername.addEventListener('click', () => {
    navigator.clipboard.writeText(currentUser.nickname).then(() => {
      showToast('Никнейм скопирован');
    });
  });
  
  settingsLogoutBtn.addEventListener('click', () => {
    showConfirm('Вы уверены, что хотите выйти?', 'Подтверждение выхода', (confirmed) => {
      if (confirmed) handleLogout();
    });
  });
  
  settingsDeleteBtn.addEventListener('click', () => {
    showAlert('Ваш аккаунт будет удалён через 30 дней', 'Удаление профиля', () => {
    });
  });
  
  document.querySelector('#help-screen .settings-item:nth-child(2)').addEventListener('click', () => {
    window.open('https://t.me/diamond_support', '_blank');
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
  
  document.addEventListener('DOMContentLoaded', function() {
    const appearanceScreen = document.getElementById('appearance-screen');
    if (appearanceScreen) {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            if (appearanceScreen.style.display === 'flex') {
              initAppearanceScreen();
            }
          }
        });
      });

      observer.observe(appearanceScreen, {
        attributes: true,
        attributeFilter: ['style']
      });
    }
  });
  
  document.getElementById('confirm-forward').addEventListener('click', forwardMessage);
  
  document.addEventListener('click', (e) => {
    const shareModal = document.getElementById('share-modal');
    if (shareModal.style.display === 'flex' && !e.target.closest('.modal-content') && e.target !== userAvatar) {
      shareModal.style.display = 'none';
    }
  });
}

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
        
        const imageUrl = await uploadPhotoToFreeHost(file);
        
        sendImageMessage(imageUrl);
        
      } catch (error) {
        console.error('Image upload error:', error);
        showAlert('Не удалось загрузить изображение', 'Ошибка');
      }
    }
  });

  return fileInput;
}

async function showImagePreview(imageUrl) {
  try {
    showAlert('Дешифровка изображения...', 'Пожалуйста, подождите');
    
    const response = await fetch(imageUrl);
    const encryptedBlob = await response.blob();
    
    const decryptedBlob = await decryptImage(encryptedBlob);
    
    const decryptedUrl = URL.createObjectURL(decryptedBlob);
    
    previewImage.src = decryptedUrl;
    imagePreviewModal.style.display = 'flex';
    
    const modal = document.getElementById('custom-modal');
    if (modal) modal.style.display = 'none';
    
  } catch (error) {
    console.error('Image decryption error:', error);
    showAlert('Не удалось расшифровать изображение', 'Ошибка');
    previewImage.src = imageUrl;
    imagePreviewModal.style.display = 'flex';
  }
}

const style = document.createElement('style');
style.textContent = `
  .message.encrypted::before {
    content: '🔒 ';
    font-size: 12px;
    opacity: 0.7;
    margin-right: 4px;
  }
  
  .message-decryption-failed {
    color: #ff4757;
    font-style: italic;
  }
`;
document.head.appendChild(style);

async function sendImageMessage(imageUrl) {
    if (!currentChat) return;

    const imageId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!acquireSendLock('image', imageId)) {
        console.log('Image sending blocked: duplicate prevention');
        return;
    }

    try {
        // Сразу кэшируем отправленное изображение
        setTimeout(async () => {
            try {
                await loadImageWithCache(imageUrl, 'images');
                console.log('Отправленное изображение закэшировано');
            } catch (cacheError) {
                console.error('Ошибка кэширования отправленного изображения:', cacheError);
            }
        }, 1000);

        const message = {
            id: imageId,
            type: 'image',
            imageUrl: imageUrl,
            user: currentUser.username,
            timestamp: Date.now(),
            encrypted: false
        };

        let messagePath;
        if (currentChat === 'general') {
            messagePath = `messages/general/${message.id}`;
        } else if (currentChat.startsWith(GROUP_CHAT_PREFIX)) {
            const groupId = currentChat.replace(GROUP_CHAT_PREFIX, '');
            messagePath = `messages/groups/${groupId}/${message.id}`;
        } else {
            const chatRef = [currentUser.nickname, currentChat].sort().join('_');
            messagePath = `messages/private/${chatRef}/${message.id}`;
        }
        
        const existingSnapshot = await db.ref(messagePath).once('value');
        if (existingSnapshot.exists()) {
            console.log('Duplicate image detected, skipping');
            return;
        }
        
        await db.ref(messagePath).set(message);
        
        playMessageSound();
        
        const modal = document.getElementById('custom-modal');
        if (modal) modal.style.display = 'none';
    } catch (error) {
        console.error('Error sending image:', error);
        showAlert('Ошибка при отправке изображения', 'Ошибка');
        
        const lockKey = `image_${imageId}`;
        messageSendLock.delete(lockKey);
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
  
  hideError(document.getElementById('password-error'));
  
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
    const hashedPassword = await hashPassword(password);
    
    if (user.password !== hashedPassword) {
      showError(document.getElementById('password-error'), 'Неверный пароль');
      return;
    }
    
    currentUser = {
      username: user.username,
      nickname: username,
      avatarUrl: user.avatarUrl || 'avatar/1.png'
    };

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
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

  hideError(document.getElementById('register-error'));

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
    const snapshot = await db.ref(`users/${username}`).once('value');
    if (snapshot.exists()) {
      showError(document.getElementById('register-error'), 'Этот никнейм уже занят');
      return;
    }

    const hashedPassword = await hashPassword(password);

    await db.ref(`users/${username}`).set({
      username: name,
      password: hashedPassword,
      nickname: username,
      avatarUrl: 'avatar/1.png',
      createdAt: Date.now(),
      isOnline: true,
      lastSeen: Date.now(),
      contacts: {},
      isAdmin: false
    });

    currentUser = {
      username: name,
      nickname: username,
      avatarUrl: 'avatar/1.png'
    };

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    document.getElementById('register-name').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm').value = '';
    
    screens.register.style.display = 'none';
    showApp();
    
    setOnlineStatus(true);
  } catch (error) {
    console.error('Registration error:', error);
    showError(document.getElementById('register-error'), 'Ошибка регистрации. Попробуйте позже');
  }
}

function hideError(element) {
  if (element) {
    element.textContent = '';
    element.style.display = 'none';
  }
}

function showError(element, message) {
  element.textContent = message;
  element.style.display = 'block';
}

async function loadContacts() {
  if (!currentUser) return;
  setTimeout(fixAvatarAlignment, 100);
  
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
                <p>Найдите пользователей через поиск или создайте группу</p>
            `;
            chatsList.appendChild(emptyState);
        } else {
            const contactsData = [];
            
            for (const contactId of contacts) {
                if (contactId.startsWith(GROUP_CHAT_PREFIX)) {
                    const groupId = contactId.replace(GROUP_CHAT_PREFIX, '');
                    try {
                        const groupSnapshot = await db.ref(`groups/${groupId}`).once('value');
                        const groupData = groupSnapshot.val();
                        
                        if (groupData) {
                            contactsData.push({
                                id: contactId,
                                username: groupData.name,
                                avatarUrl: null,
                                status: `Группа • ${Object.keys(groupData.members || {}).length} участников`,
                                isGroup: true
                            });
                        }
                    } catch (error) {
                        console.error('Error loading group data:', error);
                    }
                } else if (users[contactId]) {
                    const user = users[contactId];
                    const lastSeen = user.lastSeen ? formatLastSeen(user.lastSeen) : 'Недавно';
                    const status = user.isOnline ? 'Онлайн' : `Был(а) ${lastSeen}`;
                    
                    contactsData.push({
                        id: contactId,
                        username: user.username,
                        avatarUrl: user.avatarUrl,
                        status: status,
                        isGroup: false
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

async function openChat(chatId, chatName, avatarUrl = null, isGroup = false) {
    if (currentChat === chatId) return;

    if (currentChat && chatListeners[currentChat]) {
        chatListeners[currentChat]();
        delete chatListeners[currentChat];
    }

    messagesDiv.innerHTML = '<div class="loading-messages">Загрузка...</div>';

    cachedMessages[chatId] = [];

    const messagesContainer = document.querySelector('.messages-container');
    messagesContainer.style.backgroundImage = 'url("background/1.png")';

    document.querySelectorAll('.header').forEach(header => {
        header.style.display = 'none';
    });
    document.querySelector('.bottom-nav').style.display = 'none';

    chatView.style.display = 'flex';
    chatsList.style.display = 'none';

    document.querySelector('.chat-header').style.display = 'flex';

    chatView.classList.add('fullscreen');

    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === chatId) {
            item.classList.add('active');
        }
    });

    currentChat = chatId;

    const isGroupChat = chatId.startsWith(GROUP_CHAT_PREFIX);

    if (isGroupChat) {
        chatHeaderAvatar.innerHTML = '<i class="fas fa-users"></i>';
        chatHeaderAvatarText.style.display = 'none';
 
        const groupId = chatId.replace(GROUP_CHAT_PREFIX, '');
        try {
            const groupSnapshot = await db.ref(`groups/${groupId}`).once('value');
            const groupData = groupSnapshot.val();
            if (groupData) {
                chatName = groupData.name;
            }
        } catch (error) {
            console.error('Error loading group data:', error);
        }
    } else {
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
    }

    const verifiedBadge = verifiedUsers.includes(chatId) 
        ? '<span class="verified-badge" title="Официальный представитель проекта"><lottie-player src="https://diamond-share.github.io/verification.json" background="transparent" speed="1" autoplay loop style="width: 29px; height: 29px;"></lottie-player></span>' 
        : '';

    chatTitle.innerHTML = `
        <div class="chat-name-wrapper">${chatName}${verifiedBadge}</div>
        <div class="chat-status" id="chat-status">${isGroupChat ? 'Групповой чат' : 'Онлайн'}</div>
    `;

    messagesDiv.innerHTML = '';
    messagesDiv.scrollTop = 0;

    let messagesRef;
    if (chatId === 'general') {
        messagesRef = db.ref('messages/general');
    } else if (isGroupChat) {
        messagesRef = db.ref(`messages/groups/${chatId.replace(GROUP_CHAT_PREFIX, '')}`);
    } else {
        const chatRef = [currentUser.nickname, chatId].sort().join('_');
        messagesRef = db.ref(`messages/private/${chatRef}`);
    }

    let isFirstLoad = true;

    chatListeners[chatId] = messagesRef.on('child_added', (snapshot) => {
        const msg = snapshot.val();
        
        if (isFirstLoad) return;
        
        if (!cachedMessages[chatId] || !cachedMessages[chatId].some(m => m.id === msg.id)) {
            processMessage(msg);
            scrollToBottom();
        }
    });

    messagesRef.once('value').then((snapshot) => {
        const messages = [];
        snapshot.forEach((child) => {
            messages.push(child.val());
        });

        if (messages.length === 0) {
            renderEmptyChatState();
            if (!isGroupChat && chatId !== 'general') {
                showFirstMessageHint();
            }
        } else {
            messages.sort((a, b) => a.timestamp - b.timestamp);
            messages.forEach(msg => processMessage(msg));
        }

        scrollToBottom();
        isFirstLoad = false;
    });
}

async function processMessage(msg) {
    if (!cachedMessages[currentChat]) {
        cachedMessages[currentChat] = [];
    }
    
    if (cachedMessages[currentChat].some(m => m.id === msg.id)) {
        return;
    }
    
    try {
        const shouldDecrypt = msg.encrypted && msg.type === 'text';
        
        if (shouldDecrypt) {
            try {
                msg.originalText = msg.text;
                
                if (msg.text.startsWith('[UNENCRYPTED]')) {
                    msg.text = msg.text.replace('[UNENCRYPTED]', '');
                    msg.decrypted = true;
                    msg.wasUnencrypted = true;
                } else if (msg.text.startsWith('🔒')) {
                    msg.decrypted = false;
                    msg.failedDecryption = true;
                } else {
                    msg.text = await decryptText(msg.text);
                    msg.decrypted = true;
                }
            } catch (decryptionError) {
                console.error('Failed to decrypt message:', decryptionError);
                msg.text = '🔒 Зашифрованное сообщение (ошибка расшифровки)';
                msg.failedDecryption = true;
                msg.decrypted = false;
            }
        } else if (msg.type === 'text' && !msg.encrypted) {
            msg.isUnencrypted = true;
        }
        
    
        cachedMessages[currentChat].push(msg);
        
        // Создаем элемент сообщения
        const messageDiv = createMessageElement(msg);
        messagesDiv.appendChild(messageDiv);
        
        // [НОВЫЙ КОД - PUSH-УВЕДОМЛЕНИЕ И ЗВУК]
        if (msg.user !== currentUser.username) {
            
            let senderName = msg.user;
            
            // Форматирование имени отправителя для заголовка уведомления
            // Проверка на специальный чат Diamond GPT
            if (typeof DIAMOND_GPT_CHAT !== 'undefined' && senderName === DIAMOND_GPT_CHAT.id) {
                senderName = DIAMOND_GPT_CHAT.username;
            } else if (senderName.startsWith('@')) {
                // Удаляем '@' из ника для более чистого отображения в заголовке
                senderName = senderName.substring(1);
            }
            
            // Формируем заголовок и текст уведомления
            const notificationTitle = `Сообщение от: ${senderName}`;
            const notificationBody = msg.text; 

            // Отправляем пуш-уведомление с заголовком и текстом
            // Эта функция (из chat.html) должна сработать, даже если приложение активно.
            if (window.App && typeof App.showNotificationg === 'function') {
                App.showNotificationg(notificationTitle, notificationBody); 
            }
            
            // Воспроизводим звук, сохраняя оригинальное условие (если чат открыт)
            if (currentChat) {
                 playMessageSound();
            }
        }
        // [КОНЕЦ НОВОГО КОДА]
        
    } catch (error) {
        console.error('Error processing message:', error);
        // Создаем fallback сообщение
        const fallbackMsg = {
            ...msg,
            text: '🔒 Ошибка обработки сообщения',
            failedProcessing: true
        };
        
        cachedMessages[currentChat].push(fallbackMsg);
        const messageDiv = createMessageElement(fallbackMsg);
        messagesDiv.appendChild(messageDiv);
    }
}

// Функция для мониторинга состояния шифрования
function setupEncryptionMonitor() {
    let encryptionStats = {
        totalSent: 0,
        encrypted: 0,
        failed: 0,
        unencrypted: 0
    };

    // Перехватываем отправку сообщений для сбора статистики
    const originalSendMessage = window.sendMessage;
    window.sendMessage = async function() {
        encryptionStats.totalSent++;
        
        // Вызываем оригинальную функцию
        return originalSendMessage.apply(this, arguments);
    };

    // Периодически логируем статистику
    setInterval(() => {
        if (encryptionStats.totalSent > 0) {
            console.log('Encryption Stats:', encryptionStats);
        }
    }, 30000); // Каждые 30 секунд

    // Возвращаем объект для внешнего доступа
    return {
        stats: encryptionStats,
        increment: (type) => {
            if (encryptionStats[type] !== undefined) {
                encryptionStats[type]++;
            }
        }
    };
}

// Инициализируем монитор при загрузке
const encryptionMonitor = setupEncryptionMonitor();

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
  
  // Показываем верхнее меню и нижнюю навигацию
  document.querySelectorAll('.header').forEach(header => {
      header.style.display = 'flex';
  });
  document.querySelector('.bottom-nav').style.display = 'flex';

  // Скрываем новую шапку чата
  document.querySelector('.chat-header').style.display = 'none';

  // Убираем класс полноэкранного режима
  chatView.classList.remove('fullscreen');

  chatView.style.display = 'none';
  chatsList.style.display = 'block';
  currentChat = null;
  
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
  });
}

let isSending = false;

// Обновите функцию sendMessage
async function sendMessage() {
    if (isSending) return;
    
    const text = messageInput.value.trim();
    if (!text || !currentChat) {
        return;
    }
    
    if (currentChat === DIAMOND_GPT_CHAT.id) {
        // 1. Создаем и добавляем исходящее сообщение в UI (как обычное сообщение)
        const message = {
            id: Date.now().toString() + '_' + currentUser.username,
            user: currentUser.username, // Имя текущего пользователя для исходящего сообщения
            text: text,
            timestamp: Date.now(),
            type: 'text'
        };

        // Используем существующие функции для отображения сообщения
        const messageDiv = createMessageElement(message);
        messagesDiv.appendChild(messageDiv);
        scrollToBottom();
        
        // Очистка поля ввода
        messageInput.value = '';
        
        // 2. Отправляем сообщение AI обработчику
        await sendToDiamondGpt(text);
        
        return; // КЛЮЧЕВОЙ МОМЕНТ: Завершаем функцию, чтобы не отправлять сообщение в Firebase
    }
    
    if (currentChat === DIAMOND_GPT_CHAT.id) {
        saveDiamondGptMessage(userMessageObject); 
        
        // 4. Вызов функции нейросети
        sendToDiamondGpt(userMessageText);
    } 
    
    const messageId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!acquireSendLock('text', messageId)) {
        console.log('Message sending blocked: duplicate prevention');
        return;
    }
    
    isSending = true;

    try {
        // Шифруем сообщение
        let encryptedText;
        let encryptionSuccess = true;
        
        try {
            encryptedText = await encryptText(text);
            
            // Проверяем результат шифрования
            if (encryptedText.startsWith('[UNENCRYPTED]')) {
                encryptionSuccess = false;
                encryptedText = encryptedText.replace('[UNENCRYPTED]', '');
                console.warn('Сообщение отправлено без шифрования:', text);
            } else if (!encryptedText || encryptedText === text) {
                encryptionSuccess = false;
                console.warn('Шифрование не удалось, отправляем как есть:', text);
            }
        } catch (encryptionError) {
            console.error('Encryption failed:', encryptionError);
            encryptedText = text;
            encryptionSuccess = false;
        }
        
        const message = {
            id: messageId,
            text: encryptedText,
            user: currentUser.username,
            timestamp: Date.now(),
            type: 'text',
            encrypted: encryptionSuccess,
            encryptionFailed: !encryptionSuccess,
            originalLength: text.length // Для отладки
        };
        
        // Добавляем информацию о reply если есть
        const replyContainer = document.querySelector('.input-reply-container');
        if (replyContainer && selectedMessage) {
            message.replyTo = {
                messageId: selectedMessage.id,
                text: selectedMessage.text,
                type: selectedMessage.type,
                user: selectedMessage.user
            };
        }
        
        // Определяем путь для сообщения
        let messagePath;
        if (currentChat === 'general') {
            messagePath = `messages/general/${message.id}`;
        } else if (currentChat.startsWith(GROUP_CHAT_PREFIX)) {
            const groupId = currentChat.replace(GROUP_CHAT_PREFIX, '');
            messagePath = `messages/groups/${groupId}/${message.id}`;
        } else {
            const chatRef = [currentUser.nickname, currentChat].sort().join('_');
            messagePath = `messages/private/${chatRef}/${message.id}`;
        }
        
        // Проверяем, не было ли уже отправлено такое сообщение
        const existingSnapshot = await db.ref(messagePath).once('value');
        if (existingSnapshot.exists()) {
            console.log('Duplicate message detected, skipping');
            return;
        }
        
        // Отправляем сообщение
        await db.ref(messagePath).set(message);
        
        // Логируем для отладки
        console.log('Message sent:', {
            encrypted: encryptionSuccess,
            length: text.length,
            preview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
        });
        
        playMessageSound();
        
        // Очищаем поле ввода
        messageInput.value = '';
        sendBtn.disabled = true;
        
        // Убираем reply если был
        if (replyContainer) {
            replyContainer.remove();
            selectedMessage = null;
        }
        
        stopTyping();
        
    } catch (error) {
        console.error('Error sending message:', error);
        showAlert('Ошибка при отправке сообщения', 'Ошибка');
        
        // Снимаем блокировку при ошибке
        const lockKey = `text_${messageId}`;
        messageSendLock.delete(lockKey);
    } finally {
        isSending = false;
    }
}

function enterSelectMode(chatId = null) {
  isSelectMode = true;
  selectedChats.clear();
  
  // Затемняем все чаты
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.add('dimmed');
    item.classList.remove('selected');
  });
  
  if (chatId) {
    selectedChats.add(chatId);
    const chatItemElement = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (chatItemElement) {
      chatItemElement.classList.add('selected');
      chatItemElement.classList.remove('dimmed'); // Убираем затемнение у выбранного
    }
  }
  
  // Показываем специальный header
  const selectHeader = document.createElement('div');
  selectHeader.className = 'select-mode-header';
  selectHeader.innerHTML = `
    <div class="select-mode-title">Выбрано: ${selectedChats.size}</div>
    <div class="select-mode-actions">
      <button class="select-mode-btn share" onclick="openForwardChatModal()">
        <i class="fas fa-share"></i>
      </button>
      <button class="select-mode-btn delete" onclick="deleteSelectedChats()">
        <i class="fas fa-trash"></i>
      </button>
      <button class="select-mode-btn" onclick="exitSelectMode()">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  // Добавляем header и применяем стили
  const chatsList = document.getElementById('chats-list');
  chatsList.classList.add('select-mode');
  chatsList.insertBefore(selectHeader, chatsList.firstChild);
  selectHeader.classList.add('visible');
  
  // Добавляем обработчик клика вне чатов для выхода из режима
  setTimeout(() => {
    document.addEventListener('click', handleClickOutsideSelectMode);
  }, 100);
}

function showGroupInfoScreen() {
    // Скрываем чат
    chatView.style.display = 'none';
    
    // Создаем или получаем экран информации о группе
    let groupInfoScreen = document.getElementById('group-info-screen');
    if (!groupInfoScreen) {
        groupInfoScreen = document.createElement('div');
        groupInfoScreen.id = 'group-info-screen';
        groupInfoScreen.className = 'group-info-container';
        groupInfoScreen.innerHTML = `
            <div class="group-header">
                <button class="back-button" id="group-info-back-btn">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="header-title">Информация о группе</div>
            </div>

            <div class="group-info-section">
                <div class="group-avatar" id="group-info-avatar">
                    <span id="group-avatar-text">Г</span>
                </div>
                <div class="group-name" id="group-info-name">Загрузка...</div>
                <div class="group-members-count" id="group-info-members">Загрузка...</div>
            </div>

            <div class="quick-actions">
                <div class="action-button" id="search-group-btn">
                    <div class="action-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <div class="action-text">Поиск</div>
                </div>
                <div class="action-button" id="media-group-btn">
                    <div class="action-icon">
                        <i class="fas fa-images"></i>
                    </div>
                    <div class="action-text">Медиа</div>
                </div>
                <div class="action-button" id="notifications-group-btn">
                    <div class="action-icon">
                        <i class="fas fa-bell"></i>
                    </div>
                    <div class="action-text">Уведомления</div>
                </div>
            </div>

            <div class="members-section">
                <div class="section-title">Участники</div>
                <div class="members-list" id="group-members-list">
                    <div class="loading">Загрузка участников...</div>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-item" id="add-members-btn">
                    <div class="settings-icon">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <div class="settings-text">
                        <div class="settings-title">Добавить участников</div>
                        <div class="settings-desc">Пригласить новых участников в группу</div>
                    </div>
                    <div class="settings-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>

            <div class="danger-section">
                <div class="settings-item" id="leave-group-btn">
                    <div class="settings-icon">
                        <i class="fas fa-sign-out-alt"></i>
                    </div>
                    <div class="settings-text">
                        <div class="settings-title">Покинуть группу</div>
                        <div class="settings-desc">Вы больше не будете получать сообщения</div>
                    </div>
                    <div class="settings-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(groupInfoScreen);
        
        // Добавляем обработчики ОДИН РАЗ при создании
        document.getElementById('group-info-back-btn').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            hideGroupInfoScreen();
        });
        
        // Заменяем заглушки на пустые обработчики
        document.getElementById('add-members-btn').addEventListener('click', function() {
            // Ничего не происходит
        });
        
        document.getElementById('leave-group-btn').addEventListener('click', function() {
            showConfirm('Вы уверены, что хотите покинуть группу?', 'Покинуть группу', (confirmed) => {
                if (confirmed) {
                    leaveGroup();
                }
            });
        });
        
        // Обработчики для кнопок действий - ничего не делают
        document.getElementById('search-group-btn').addEventListener('click', function() {
            // Ничего не происходит
        });
        
        document.getElementById('media-group-btn').addEventListener('click', function() {
            // Ничего не происходит
        });
        
        document.getElementById('notifications-group-btn').addEventListener('click', function() {
            // Ничего не происходит
        });
    }
    
    // Показываем экран
    groupInfoScreen.style.display = 'block';
    
    // Загружаем актуальную информацию о группе
    loadGroupInfo();
}

// Новая функция для скрытия экрана информации о группе
// Исправленная функция для скрытия экрана информации о группе
function hideGroupInfoScreen() {
    const groupInfoScreen = document.getElementById('group-info-screen');
    if (groupInfoScreen) {
        // Добавляем анимацию исчезновения
        groupInfoScreen.style.opacity = '0';
        groupInfoScreen.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            groupInfoScreen.style.display = 'none';
            groupInfoScreen.style.opacity = '1';
            groupInfoScreen.style.transform = 'translateX(0)';
            
            // Возвращаемся к чату
            if (currentChat) {
                chatView.style.display = 'flex';
                // Обновляем сообщения если нужно
                renderCachedMessages(currentChat);
            }
        }, 300);
    }
}

// Функция для загрузки информации о группе
// Функция для загрузки информации о группе
async function loadGroupInfo() {
    if (!currentChat || !currentChat.startsWith(GROUP_CHAT_PREFIX)) return;
    
    const groupId = currentChat.replace(GROUP_CHAT_PREFIX, '');
    
    try {
        const groupSnapshot = await db.ref(`groups/${groupId}`).once('value');
        const groupData = groupSnapshot.val();
        
        if (!groupData) {
            showAlert('Группа не найдена', 'Ошибка');
            hideGroupInfoScreen();
            return;
        }
        
        // Обновляем основную информацию
        document.getElementById('group-info-name').textContent = groupData.name;
        
        // Получаем количество участников
        const membersCount = Object.keys(groupData.members || {}).length;
        document.getElementById('group-info-members').textContent = `${membersCount} участников`;
        
        // Обновляем аватар группы (первая буква названия)
        const groupAvatar = document.getElementById('group-info-avatar');
        const groupAvatarText = document.getElementById('group-avatar-text');
        if (groupData.name) {
            groupAvatarText.textContent = groupData.name.charAt(0).toUpperCase();
        }
        
        // Обновляем список участников
        await updateGroupMembersList(groupId, groupData.members);
        
    } catch (error) {
        console.error('Error loading group info:', error);
        showAlert('Ошибка загрузки информации о группе', 'Ошибка');
    }
}

async function updateGroupMembersList(groupId, members) {
  const membersList = document.getElementById('group-members-list');
  
  if (!members) {
    membersList.innerHTML = '<div class="no-members">Нет участников</div>';
    return;
  }
  
  try {
    // Получаем данные всех пользователей
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val() || {};
    
    // Получаем данные группы для определения создателя
    const groupSnapshot = await db.ref('groups/' + groupId).once('value');
    const groupData = groupSnapshot.val();
    
    let membersHTML = '';
    
    // Создаем элементы для каждого участника
    for (const [memberId, isMember] of Object.entries(members)) {
      if (!isMember) continue;
      
      const user = users[memberId];
      const displayName = user ? user.username : memberId;
      const firstLetter = displayName.charAt(0).toUpperCase();
      const isCreator = groupData && groupData.createdBy === memberId;
      const role = isCreator ? 'Админ' : 'Участник';
      
      membersHTML += 
        '<div class="member-item">' +
          '<div class="member-avatar">' +
            '<span>' + firstLetter + '</span>' +
          '</div>' +
          '<div class="member-info">' +
            '<div class="member-name">' + displayName + '</div>' +
            '<div class="member-username">' + memberId + '</div>' +
          '</div>' +
          '<div class="member-role">' + role + '</div>' +
        '</div>';
    }
    
    membersList.innerHTML = membersHTML;
    
  } catch (error) {
    console.error('Error loading group members:', error);
    membersList.innerHTML = '<div class="error-message">Ошибка загрузки участников</div>';
  }
}

// Функция для загрузки списка участников
async function loadGroupMembers(groupId, members) {
  const membersList = document.getElementById('group-members-list');
  membersList.innerHTML = '';
  
  if (!members) return;
  
  try {
    // Получаем данные всех пользователей
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val() || {};
    
    // Создаем элементы для каждого участника
    for (const [memberId, isMember] of Object.entries(members)) {
      if (!isMember) continue;
      
      const user = users[memberId];
      const memberItem = document.createElement('div');
      memberItem.className = 'member-item';
      
      const avatarContent = user && user.avatarUrl 
        ? `<img src="${user.avatarUrl}" alt="${user.username}">`
        : `<div class="member-avatar">${user ? user.username.charAt(0).toUpperCase() : 'U'}</div>`;
      
      const displayName = user ? user.username : memberId;
      const isOnline = user && user.isOnline;
      
      memberItem.innerHTML = `
        <div class="member-info">
          ${avatarContent}
          <div class="member-details">
            <div class="member-name">${displayName}</div>
            <div class="member-username">${memberId}</div>
          </div>
        </div>
        <div class="member-status">
          ${isOnline ? '<span class="online-dot"></span> Онлайн' : 'Не в сети'}
          ${memberId === currentUser.nickname ? '<span class="you-badge">Вы</span>' : ''}
        </div>
      `;
      
      membersList.appendChild(memberItem);
    }
    
  } catch (error) {
    console.error('Error loading group members:', error);
    membersList.innerHTML = '<div class="error-message">Ошибка загрузки участников</div>';
  }
}

// Функция для выхода из группы
async function leaveGroup() {
    if (!currentChat || !currentChat.startsWith(GROUP_CHAT_PREFIX)) return;
    
    const groupId = currentChat.replace(GROUP_CHAT_PREFIX, '');
    
    try {
        // Удаляем себя из участников группы
        await db.ref(`groups/${groupId}/members/${currentUser.nickname}`).remove();
        
        // Удаляем группу из своих контактов
        await db.ref(`users/${currentUser.nickname}/contacts/group_${groupId}`).remove();
        
        // Обновляем локальные контакты
        const index = contacts.indexOf(`group_${groupId}`);
        if (index > -1) {
            contacts.splice(index, 1);
        }
        
        // Скрываем инфо о группе
        hideGroupInfoScreen();
        
        // Возвращаемся к списку чатов
        showChatsList();
        loadContacts();
        
        // Показываем уведомление
        showToast('Вы покинули группу');
        
    } catch (error) {
        console.error('Error leaving group:', error);
        showAlert('Ошибка при выходе из группы', 'Ошибка');
    }
}

async function updateGroupMembersList(groupId, members) {
  const membersList = document.getElementById('group-members-list');
  
  if (!members) {
    membersList.innerHTML = '<div class="no-members">Нет участников</div>';
    return;
  }
  
  try {
    // Получаем данные всех пользователей
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val() || {};
    
    // Получаем данные группы для определения создателя
    const groupSnapshot = await db.ref('groups/' + groupId).once('value');
    const groupData = groupSnapshot.val();
    
    let membersHTML = '';
    
    // Создаем элементы для каждого участника
    for (const [memberId, isMember] of Object.entries(members)) {
      if (!isMember) continue;
      
      const user = users[memberId];
      const displayName = user ? user.username : memberId;
      const firstLetter = displayName.charAt(0).toUpperCase();
      const isCreator = groupData && groupData.createdBy === memberId;
      const role = isCreator ? 'Админ' : 'Участник';
      const isCurrentUser = memberId === currentUser.nickname;
      
      membersHTML += 
        '<div class="member-item">' +
          '<div class="member-avatar">' +
            '<span>' + firstLetter + '</span>' +
          '</div>' +
          '<div class="member-info">' +
            '<div class="member-name">' + displayName + (isCurrentUser ? ' (Вы)' : '') + '</div>' +
            '<div class="member-username">' + memberId + '</div>' +
          '</div>' +
          '<div class="member-role">' + role + '</div>' +
        '</div>';
    }
    
    membersList.innerHTML = membersHTML;
    
  } catch (error) {
    console.error('Error loading group members:', error);
    membersList.innerHTML = '<div class="error-message">Ошибка загрузки участников</div>';
  }
}

function exitSelectMode() {
  isSelectMode = false;
  selectedChats.clear();
  
  const chatsList = document.getElementById('chats-list');
  chatsList.classList.remove('select-mode');
  
  // Убираем затемнение со всех чатов
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('dimmed', 'selected');
  });
  
  // Удаляем header
  const selectHeader = document.querySelector('.select-mode-header');
  if (selectHeader) {
    selectHeader.remove();
  }
  
  // Убираем обработчик
  document.removeEventListener('click', handleClickOutsideSelectMode);
}

function toggleChatSelection(chatId) {
  const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
  
  if (selectedChats.has(chatId)) {
    selectedChats.delete(chatId);
    chatItem.classList.remove('selected');
    chatItem.classList.add('dimmed');
  } else {
    selectedChats.add(chatId);
    chatItem.classList.add('selected');
    chatItem.classList.remove('dimmed');
  }
  
  // Обновляем счетчик
  const counter = document.querySelector('.select-mode-title');
  if (counter) {
    counter.textContent = `Выбрано: ${selectedChats.size}`;
  }
}

function handleClickOutsideSelectMode(e) {
  const chatsList = document.getElementById('chats-list');
  if (!chatsList.contains(e.target) && !e.target.closest('.select-mode-header')) {
    exitSelectMode();
  }
}

// Обработчик долгого нажатия на чат
function setupLongPress() {
  let pressTimer;
  const chatsList = document.getElementById('chats-list');
  
  chatsList.addEventListener('mousedown', function(e) {
    const chatItem = e.target.closest('.chat-item');
    if (chatItem) {
      pressTimer = setTimeout(() => {
        if (!isSelectMode) {
          enterSelectMode(chatItem.dataset.chatId);
        } else {
          toggleChatSelection(chatItem.dataset.chatId);
        }
      }, 500);
    }
  });
  
  chatsList.addEventListener('mouseup', function() {
    clearTimeout(pressTimer);
  });
  
  chatsList.addEventListener('mouseleave', function() {
    clearTimeout(pressTimer);
  });
  
  // Для touch устройств
  chatsList.addEventListener('touchstart', function(e) {
    const chatItem = e.target.closest('.chat-item');
    if (chatItem) {
      pressTimer = setTimeout(() => {
        if (!isSelectMode) {
          enterSelectMode(chatItem.dataset.chatId);
          e.preventDefault();
        } else {
          toggleChatSelection(chatItem.dataset.chatId);
        }
      }, 500);
    }
  });
  
  chatsList.addEventListener('touchend', function() {
    clearTimeout(pressTimer);
  });
  
  // Обычный клик в режиме выбора
  chatsList.addEventListener('click', function(e) {
    if (isSelectMode) {
      const chatItem = e.target.closest('.chat-item');
      if (chatItem) {
        e.preventDefault();
        toggleChatSelection(chatItem.dataset.chatId);
      }
    }
  });
}

// Удаление выбранных чатов
async function deleteSelectedChats() {
  if (selectedChats.size === 0) return;
  
  showConfirm(`Удалить ${selectedChats.size} чат(ов)?`, 'Подтверждение удаления', async (confirmed) => {
    if (confirmed) {
      try {
        for (const chatId of selectedChats) {
          await db.ref(`users/${currentUser.nickname}/contacts/${chatId}`).remove();
          // Также удаляем из локального массива
          const index = contacts.indexOf(chatId);
          if (index > -1) {
            contacts.splice(index, 1);
          }
        }
        
        showToast('Чаты удалены');
        loadContacts(); // Перезагружаем список
        exitSelectMode();
      } catch (error) {
        console.error('Error deleting chats:', error);
        showAlert('Ошибка при удалении чатов', 'Ошибка');
      }
    }
  });
}

// Модальное окно для пересылки чата
function openForwardChatModal() {
  if (selectedChats.size === 0) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal forward-chat-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="modal-title">Переслать чат</h3>
      <p>Выберите контакт для пересылки</p>
      <div class="forward-chat-list" id="forward-chat-list"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
        <button class="btn btn-primary" onclick="forwardSelectedChat()">Отправить</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  
  // Заполняем список контактов
  const contactList = modal.querySelector('#forward-chat-list');
  contacts.forEach(contactId => {
    if (contactId !== 'general' && !selectedChats.has(contactId)) {
      const contactItem = document.createElement('div');
      contactItem.className = 'forward-chat-item';
      contactItem.dataset.contactId = contactId;
      contactItem.innerHTML = `
        <div class="forward-chat-avatar">${contactId.charAt(1).toUpperCase()}</div>
        <div class="forward-chat-info">
          <div class="forward-chat-name">${contactId}</div>
          <div class="forward-chat-username">${contactId}</div>
        </div>
      `;
      
      contactItem.addEventListener('click', function() {
        modal.querySelectorAll('.forward-chat-item').forEach(item => {
          item.classList.remove('selected');
        });
        this.classList.add('selected');
      });
      
      contactList.appendChild(contactItem);
    }
  });
}

// Пересылка выбранного чата
async function forwardSelectedChat() {
  const selectedContact = document.querySelector('.forward-chat-item.selected');
  if (!selectedContact) {
    showAlert('Выберите контакт для пересылки', 'Ошибка');
    return;
  }
  
  const contactId = selectedContact.dataset.contactId;
  const modal = document.querySelector('.forward-chat-modal');
  
  try {
    // Для каждого выбранного чата отправляем сообщение с информацией
    for (const chatId of selectedChats) {
      const message = {
        id: Date.now().toString(),
        type: 'chat_forward',
        forwardedChat: chatId,
        user: currentUser.username,
        timestamp: Date.now(),
        text: `Переслан чат: ${chatId}`
      };
      
      const chatRef = [currentUser.nickname, contactId].sort().join('_');
      await db.ref(`messages/private/${chatRef}`).push(message);
    }
    
    modal.remove();
    showToast('Чат переслан');
    exitSelectMode();
  } catch (error) {
    console.error('Error forwarding chat:', error);
    showAlert('Ошибка при пересылке чата', 'Ошибка');
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

// Создание группы
async function createGroup(selectedMembersArray) {
    const groupName = document.getElementById('group-name-input').value.trim();
    
    if (!groupName) {
        showAlert('Введите название группы', 'Ошибка');
        return;
    }
    
    if (selectedMembersArray.length === 0) {
        showAlert('Выберите хотя бы одного участника', 'Ошибка');
        return;
    }
    
    try {
        // Создаем группу в базе данных
        const groupRef = db.ref('groups').push();
        const groupId = groupRef.key;
        
        // Формируем данные участников
        const membersData = {};
        selectedMembersArray.forEach(memberId => {
            membersData[memberId] = true;
        });
        // Добавляем создателя в участники
        membersData[currentUser.nickname] = true;
        
        // Сохраняем группу
        await groupRef.set({
            name: groupName,
            members: membersData,
            createdBy: currentUser.nickname,
            createdAt: Date.now(),
            type: 'group'
        });
        
        // Добавляем группу в контакты всех участников
        const updates = {};
        Object.keys(membersData).forEach(memberId => {
            updates[`users/${memberId}/contacts/group_${groupId}`] = {
                name: groupName,
                type: 'group',
                createdAt: Date.now()
            };
        });
        
        await db.ref().update(updates);
        
        // Обновляем локальные контакты
        contacts.push(`group_${groupId}`);
        
        // Показываем уведомление
        showToast(`Группа "${groupName}" создана`);
        
        // Перезагружаем список чатов
        loadContacts();
        
    } catch (error) {
        console.error('Error creating group:', error);
        showAlert('Ошибка при создании группы', 'Ошибка');
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
    
    // Создаем уникальный ID для стикера
    const stickerId = `sticker_${pack}_${number}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Проверяем блокировку
    if (!acquireSendLock('sticker', stickerId)) {
        console.log('Sticker sending blocked: duplicate prevention');
        return;
    }
    
    const message = {
        id: stickerId,
        type: 'sticker',
        stickerPack: pack,
        stickerNumber: number,
        user: currentUser.username,
        timestamp: Date.now(),
        encrypted: false
    };

    try {
        // Определяем путь для сообщения
        let messagePath;
        if (currentChat === 'general') {
            messagePath = `messages/general/${message.id}`;
        } else if (currentChat.startsWith(GROUP_CHAT_PREFIX)) {
            const groupId = currentChat.replace(GROUP_CHAT_PREFIX, '');
            messagePath = `messages/groups/${groupId}/${message.id}`;
        } else {
            const chatRef = [currentUser.nickname, currentChat].sort().join('_');
            messagePath = `messages/private/${chatRef}/${message.id}`;
        }
        
        // Проверяем, не было ли уже отправлен такой стикер
        const existingSnapshot = await db.ref(messagePath).once('value');
        if (existingSnapshot.exists()) {
            console.log('Duplicate sticker detected, skipping');
            return;
        }
        
        // Отправляем стикер
        await db.ref(messagePath).set(message);
        
        // Воспроизводим звук отправки стикера
        playMessageSound();
    } catch (error) {
        console.error('Error sending sticker:', error);
        showAlert('Ошибка при отправке стикера', 'Ошибка');
        
        // Снимаем блокировку при ошибке
        const lockKey = `sticker_${stickerId}`;
        messageSendLock.delete(lockKey);
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

function showCрhatInfo() {
  if (!currentChat) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  if (currentChat === 'general') {
    modal.innerHTML = `
      <div class="modal-content">
        <h3 class="modal-title">Общий чат</h3>
        <div class="chat-info-content">
          <p>Групповой чат для всех пользователей Diamond Share</p>
          <p>Создан: 01.01.2025</p>
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

  const uploadItem = document.createElement('div');
  uploadItem.className = 'avatar-carousel-item upload-item';
  uploadItem.innerHTML = `
    <label for="avatar-upload-input">
      <i class="fas fa-plus"></i>
      <span>Загрузить</span>
    </label>
  `;
  carousel.appendChild(uploadItem);

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
  
  const fileInput = document.getElementById('avatar-upload-input');
  fileInput.onchange = async (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        showAlert('Загрузка аватарки...', 'Пожалуйста, подождите');
        const imageUrl = await uploadAvatarToFreeHost(file);
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
    if (file.size > AVATAR_UPLOAD_SIZE_LIMIT) {
      throw new Error('Размер файла не должен превышать 5MB');
    }

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

async function setUserAvatar(avatarUrl) {
    if (!currentUser) return;

    try {
        const modal = document.getElementById('custom-modal');
        if (modal) modal.style.display = 'none';

        // Кэшируем новую аватарку
        await loadImageWithCache(avatarUrl, 'avatars');

        currentUser.avatarUrl = avatarUrl;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        updateAvatarInUI(avatarUrl);

        await db.ref(`users/${currentUser.nickname}/avatarUrl`).set(avatarUrl);

        showToast('Аватар успешно обновлен');
    } catch (error) {
        console.error('Ошибка обновления аватарки:', error);
        showAlert('Не удалось обновить аватар', 'Ошибка');
    }
}

// Обновленная функция отображения аватара
function updateAvatarInUI(avatarUrl) {
    const updateAvatarElement = async (element) => {
        if (element) {
            const cachedAvatar = ImageCache.getCachedImage(avatarUrl, 'avatars');
            if (cachedAvatar) {
                element.innerHTML = `<img src="${cachedAvatar}" alt="Avatar">`;
            } else {
                element.innerHTML = `<img src="${avatarUrl}" alt="Avatar" 
                    onload="this.style.opacity='1'" 
                    onerror="this.style.opacity='1'"
                    style="opacity: 0.5; transition: opacity 0.3s ease;">`;
                
                // Фоновая загрузка в кэш
                setTimeout(async () => {
                    try {
                        await loadImageWithCache(avatarUrl, 'avatars');
                    } catch (error) {
                        console.error('Ошибка кэширования аватара:', error);
                    }
                }, 100);
            }
        }
    };

    updateAvatarElement(userAvatar);
    updateAvatarElement(settingsAvatar);
    if (currentChat) {
        updateAvatarElement(chatHeaderAvatar);
    }
}

// Функция предзагрузки изображений при хорошем соединении
async function preloadImportantImages() {
    if (!navigator.onLine) return;
    
    try {
        // Предзагружаем аватарки контактов
        const contactsSnapshot = await db.ref(`users/${currentUser.nickname}/contacts`).once('value');
        const contacts = contactsSnapshot.val() || {};
        
        for (const contactId of Object.keys(contacts)) {
            if (contactId.startsWith('group_')) continue;
            
            try {
                const userSnapshot = await db.ref(`users/${contactId}`).once('value');
                const userData = userSnapshot.val();
                
                if (userData && userData.avatarUrl) {
                    // Запускаем фоновую загрузку
                    loadImageWithCache(userData.avatarUrl, 'avatars')
                        .catch(error => console.log(`Не удалось предзагрузить аватар ${contactId}:`, error));
                }
            } catch (error) {
                console.log(`Ошибка предзагрузки аватара ${contactId}:`, error);
            }
        }
        
        console.log('Предзагрузка важных изображений завершена');
    } catch (error) {
        console.error('Ошибка предзагрузки изображений:', error);
    }
}

// Вызывайте эту функцию при загрузке приложения и при подключении к WiFi
window.addEventListener('online', () => {
    setTimeout(preloadImportantImages, 2000);
});

// Функции управления кэшем
function clearImageCache() {
    try {
        localStorage.removeItem(CACHE_KEYS.AVATARS);
        localStorage.removeItem(CACHE_KEYS.IMAGES);
        showToast('Кэш изображений очищен');
    } catch (error) {
        console.error('Ошибка очистки кэша:', error);
        showAlert('Ошибка очистки кэша', 'Ошибка');
    }
}

function getCacheSize() {
    try {
        let totalSize = 0;
        Object.values(CACHE_KEYS).forEach(key => {
            const data = localStorage.getItem(key);
            if (data) totalSize += new Blob([data]).size;
        });
        return (totalSize / 1024 / 1024).toFixed(2); // Размер в MB
    } catch (error) {
        console.error('Ошибка расчета размера кэша:', error);
        return '0';
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
  
  const headerSearchBtn = document.createElement('button');
  headerSearchBtn.className = 'header-search-btn';
  headerSearchBtn.innerHTML = '<i class="fas fa-search"></i>';
  headerSearchBtn.addEventListener('click', showSearch);
  
  const headerActions = document.querySelector('.header-actions');
  headerActions.insertBefore(headerSearchBtn, headerActions.firstChild);
  
  searchInput.addEventListener('input', handleSearchInput);
  searchBackBtn.addEventListener('click', hideSearch);
  clearSearchBtn.addEventListener('click', clearSearch);
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value.trim());
    }
  });
}

function showSearch() {
  searchContainer.style.display = 'flex';
  loadAllUsers();
  
  showCreateGroupButton();
}

function showCreateGroupButton() {
  const existingButton = document.querySelector('.search-create-group-btn');
  if (existingButton) {
    return;
  }
  
  const createGroupBtn = document.createElement('div');
  createGroupBtn.className = 'search-create-group-btn';
  createGroupBtn.innerHTML = `
    <div class="search-create-group-content">
      <i class="fas fa-users"></i>
      <div class="search-create-group-text">
        <div class="search-create-group-title">Создать группу</div>
        <div class="search-create-group-subtitle">Общайтесь с несколькими людьми сразу</div>
      </div>
    </div>
  `;
  
  createGroupBtn.addEventListener('click', () => {
    hideSearch();
    showGroupCreationModal();
  });
  
  if (searchResults.firstChild) {
    searchResults.insertBefore(createGroupBtn, searchResults.firstChild);
  } else {
    searchResults.appendChild(createGroupBtn);
  }
}

function hideSearch() {
  searchContainer.style.display = 'none';
  searchInput.value = '';
  clearSearchBtn.style.display = 'none';
  showSearchEmptyState();
}

function clearSearch() {
  searchInput.value = '';
  clearSearchBtn.style.display = 'none';
  showSearchEmptyState();
}

function handleSearchInput(e) {
  const query = e.target.value.trim();
  
  if (query.length > 0) {
    clearSearchBtn.style.display = 'block';
  } else {
    clearSearchBtn.style.display = 'none';
    showSearchEmptyState();
    return;
  }
  
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(query);
  }, 300);
}

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

async function performSearch(query) {
  if (query.length < 2) {
    showSearchEmptyState('Введите минимум 2 символа');
    return;
  }
  
  showSearchLoading();
  
  try {
    const results = allUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.nickname.toLowerCase().includes(query.toLowerCase())
    );
    
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

function showSearchLoading() {
  searchResults.innerHTML = `
    <div class="search-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Поиск...</p>
    </div>
  `;
}

function showSearchEmptyState(message = 'Введите имя пользователя для поиска') {
  searchResults.innerHTML = '';
  showCreateGroupButton();
  
  const emptyState = document.createElement('div');
  emptyState.className = 'search-empty-state';
  emptyState.innerHTML = `
    <i class="fas fa-search"></i>
    <p>${message}</p>
  `;
  searchResults.appendChild(emptyState);
}

function showNoResults(query) {
  searchResults.innerHTML = `
    <div class="search-no-results">
      <i class="fas fa-search"></i>
      <p>Пользователи по запросу "${query}" не найдены</p>
    </div>
  `;
}

function displaySearchResults(users) {
  const fragment = document.createDocumentFragment();
  
  users.forEach(user => {
    const userItem = createSearchUserItem(user);
    fragment.appendChild(userItem);
  });
  
  searchResults.innerHTML = '';
  searchResults.appendChild(fragment);
}

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

async function handleSearchUserClick(user) {
  if (contacts.includes(user.nickname)) {
    openChat(user.nickname, user.username, user.avatarUrl);
    hideSearch();
  } else {
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

function showFriendSearch() {
  const modal = document.getElementById('friend-search-modal');
  const animationScreen = document.getElementById('friend-search-animation');
  const resultsScreen = document.getElementById('friend-results');
  
  modal.style.display = 'flex';
  animationScreen.style.display = 'flex';
  resultsScreen.style.display = 'none';
  
  startNewFriendSearchAnimation();
  
  // Через 5 секунд показываем результаты
  setTimeout(() => {
    showFriendResults();
  }, 5000);
}

// Новая функция для запуска анимации из ads.html
function startNewFriendSearchAnimation() {
  const animationContainer = document.querySelector('.searching-icon');
  animationContainer.innerHTML = ''; // Очищаем контейнер
  
  // Создаем контейнер для анимации
  const container = document.createElement('div');
  container.className = 'friend-search-animation-container';
  container.style.cssText = `
    position: relative;
    width: 200px;
    height: 200px;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  // Создаем центральную иконку
  const profileIcon = document.createElement('div');
  profileIcon.className = 'friend-search-profile-icon';
  profileIcon.style.cssText = `
    position: relative;
    width: 60px;
    height: 60px;
    background: white;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
  `;
  
  profileIcon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="#2a5298" style="width: 35px; height: 35px;">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  `;
  
  // Создаем волны
  for (let i = 0; i < 3; i++) {
    const wave = document.createElement('div');
    wave.className = 'friend-search-wave';
    wave.style.cssText = `
      position: absolute;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      animation: friendSearchWaveAnimation 3s infinite;
      animation-delay: ${i}s;
    `;
    
    const size = 80 + (i * 30);
    wave.style.width = `${size}px`;
    wave.style.height = `${size}px`;
    
    container.appendChild(wave);
  }
  
  // Создаем плавающие иконки
  const floatingIcons = [
    { tx: -60, ty: -50, delay: 3 },
    { tx: 70, ty: -30, delay: 6 },
    { tx: -40, ty: 60, delay: 9 },
    { tx: 50, ty: 50, delay: 12 }
  ];
  
  floatingIcons.forEach((icon, index) => {
    const floatingIcon = document.createElement('div');
    floatingIcon.className = 'friend-search-floating-icon';
    floatingIcon.style.cssText = `
      position: absolute;
      width: 25px;
      height: 25px;
      border-radius: 50%;
      background: white;
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0;
      animation: friendSearchFloatIcon 8s infinite;
      animation-delay: ${icon.delay}s;
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
      --tx: ${icon.tx}px;
      --ty: ${icon.ty}px;
    `;
    
    floatingIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="#2a5298" style="width: 15px; height: 15px;">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"/>
      </svg>
    `;
    
    container.appendChild(floatingIcon);
  });
  
  // Добавляем контейнер в DOM
  animationContainer.appendChild(container);
  
  // Добавляем стили для анимации
  const style = document.createElement('style');
  style.textContent = `
    @keyframes friendSearchWaveAnimation {
      0% {
        transform: scale(0.5);
        opacity: 0.7;
      }
      100% {
        transform: scale(2.5);
        opacity: 0;
      }
    }
    
    @keyframes friendSearchFloatIcon {
      0% {
        opacity: 0;
        transform: translate(0, 0) scale(0);
      }
      10% {
        opacity: 1;
        transform: translate(0, -15px) scale(1);
      }
      30% {
        opacity: 1;
        transform: translate(var(--tx), var(--ty)) scale(1);
      }
      90% {
        opacity: 0.2;
        transform: translate(var(--tx), var(--ty)) scale(0.8);
      }
      100% {
        opacity: 0;
        transform: translate(var(--tx), var(--ty)) scale(0);
      }
    }
  `;
  
  document.head.appendChild(style);
}

// Функция для скрытия поиска друзей
function hideFriendSearch() {
  const modal = document.getElementById('friend-search-modal');
  modal.style.display = 'none';
  
  // Очищаем анимацию
  stopFriendSearchAnimation();
}

// Функция для перезапуска поиска
function restartFriendSearch() {
  const animationScreen = document.getElementById('friend-search-animation');
  const resultsScreen = document.getElementById('friend-results');
  
  animationScreen.style.display = 'flex';
  resultsScreen.style.display = 'none';
  
  // Очищаем старые результаты
  stopFriendSearchAnimation();
  
  // Запускаем заново
  startFriendSearchAnimation();
  
  setTimeout(() => {
    showFriendResults();
  }, 5000);
}

// Запуск анимации поиска
function startFriendSearchAnimation() {
  const searchingIcon = document.querySelector('.searching-icon');
  
  // Создаем случайные иконки пользователей
  friendSearchInterval = setInterval(() => {
    if (userIcons.length < 8) { // Максимум 8 иконок
      createRandomUserIcon(searchingIcon);
    }
  }, 800);
}

// Остановка анимации поиска
function stopFriendSearchAnimation() {
  clearInterval(friendSearchInterval);
  
  // Удаляем все созданные элементы анимации
  const container = document.querySelector('.friend-search-animation-container');
  if (container) {
    container.remove();
  }
  
  // Удаляем добавленные стили
  const style = document.querySelector('style[data-friend-search]');
  if (style) {
    style.remove();
  }
  
  // Удаляем все созданные иконки
  userIcons.forEach(icon => {
    if (icon.parentNode) {
      icon.parentNode.removeChild(icon);
    }
  });
  userIcons = [];
}

// Создание случайной иконки пользователя
function createRandomUserIcon(container) {
  const userIcon = document.createElement('div');
  userIcon.className = 'user-icon';
  userIcon.innerHTML = '<i class="fas fa-user"></i>';
  
  // Случайная позиция
  const angle = Math.random() * Math.PI * 2;
  const distance = 80 + Math.random() * 60; // 80-140px от центра
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  
  userIcon.style.left = `calc(50% + ${x}px)`;
  userIcon.style.top = `calc(50% + ${y}px)`;
  userIcon.style.transform = 'translate(-50%, -50%)';
  
  container.appendChild(userIcon);
  userIcons.push(userIcon);
  
  // Автоматическое удаление через 2 секунды
  setTimeout(() => {
    if (userIcon.parentNode) {
      userIcon.parentNode.removeChild(userIcon);
      userIcons = userIcons.filter(icon => icon !== userIcon);
    }
  }, 2000);
}

// Показать результаты поиска
async function showFriendResults() {
  const animationScreen = document.getElementById('friend-search-animation');
  const resultsScreen = document.getElementById('friend-results');
  const resultsList = document.getElementById('results-list');
  
  // Останавливаем анимацию
  stopFriendSearchAnimation();
  
  // Получаем результаты
  const results = await findFriendsByPreferences();
  
  // Показываем результаты
  animationScreen.style.display = 'none';
  resultsScreen.style.display = 'block';
  
  // Очищаем список
  resultsList.innerHTML = '';
  
  if (results.length === 0) {
    resultsList.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
        <p>Не найдено пользователей с совпадающими предпочтениями</p>
      </div>
    `;
    return;
  }
  
  // Добавляем результаты
  results.forEach(user => {
    const item = createFriendResultItem(user);
    resultsList.appendChild(item);
  });
}

// Поиск друзей по предпочтениям
async function findFriendsByPreferences() {
  if (!currentUser) return [];
  
  try {
    // Получаем предпочтения текущего пользователя
    const userPrefs = await db.ref(`users/${currentUser.nickname}/preferences`).once('value');
    const currentPreferences = userPrefs.val() || {};
    
    // Получаем всех пользователей
    const allUsersSnapshot = await db.ref('users').once('value');
    const allUsers = allUsersSnapshot.val() || {};
    
    const results = [];
    
    // Фильтруем пользователей по предпочтениям
    Object.entries(allUsers).forEach(([nickname, userData]) => {
      // Пропускаем текущего пользователя и пользователей без предпочтений
      if (nickname === currentUser.nickname || !userData.preferences) {
        return;
      }
      
      // Считаем совпадения
      let matchCount = 0;
      const userPreferences = userData.preferences;
      
      // Проверяем совпадения по каждому предпочтению
      Object.entries(currentPreferences).forEach(([key, value]) => {
        if (userPreferences[key] === value && value) {
          matchCount++;
        }
      });
      
      // Добавляем в результаты если есть хотя бы 2 совпадения
      if (matchCount >= 2) {
        results.push({
          nickname: nickname,
          username: userData.username,
          avatarUrl: userData.avatarUrl,
          preferences: userPreferences,
          matchCount: matchCount
        });
      }
    });
    
    // Сортируем по количеству совпадений
    results.sort((a, b) => b.matchCount - a.matchCount);
    
    return results.slice(0, 10); // Ограничиваем 10 результатами
    
  } catch (error) {
    console.error('Error finding friends:', error);
    return [];
  }
}

function playMessageSound() {
  try {
    const audio = new Audio('sound/notification.mp3');
    audio.volume = 0.3; // Устанавливаем громкость (от 0 до 1)
    audio.play().catch(error => {
      console.log('Audio play failed:', error);
      // Игнорируем ошибки воспроизведения, так как они не критичны
    });
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

function createFriendResultItem(user) {
  const item = document.createElement('div');
  item.className = 'friend-result-item';
  
  const avatarContent = user.avatarUrl 
    ? `<img src="${user.avatarUrl}" alt="${user.username}">`
    : user.username.charAt(0).toUpperCase();
  
  const matchingPrefs = getMatchingPreferences(user.preferences);
  
  item.innerHTML = `
    <div class="friend-avatar">${avatarContent}</div>
    <div class="friend-info">
      <div class="friend-name">${user.username}</div>
      <div class="friend-username">${user.nickname}</div>
      <div class="friend-preferences">
        ${matchingPrefs.map(pref => `
          <span class="preference-tag">${pref}</span>
        `).join('')}
      </div>
    </div>
    <button class="friend-action" onclick="startChatWithFriend('${user.nickname}', '${user.username}')">
      Написать
    </button>
  `;
  
  return item;
}

function getMatchingPreferences(userPreferences) {
  if (!currentUser.preferences) return [];
  
  const matching = [];
  const currentPrefs = currentUser.preferences;
  
  Object.entries(userPreferences).forEach(([key, value]) => {
    if (currentPrefs[key] === value && value) {
      matching.push(`${key}: ${value}`);
    }
  });
  
  return matching.slice(0, 3);
}

async function encryptText(text) {
  if (text.startsWith('[UNENCRYPTED]') || text.startsWith('🔒')) {
    console.log('Текст содержит маркеры, пропускаем шифрование');
    return text;
  }

  try {
    const key = await generateEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );

    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    const encryptedBase64 = btoa(String.fromCharCode.apply(null, combined));
    
    if (!encryptedBase64) {
      throw new Error('Пустой результат шифрования');
    }
    
    return encryptedBase64;
    
  } catch (error) {
    console.error('Encryption error:', error);
    return `[UNENCRYPTED]${text}`;
  }
}

async function decryptText(encryptedText) {
  if (encryptedText.startsWith('[UNENCRYPTED]')) {
    return encryptedText.replace('[UNENCRYPTED]', '');
  }
  
  if (!encryptedText) {
    console.log('Пустой текст для дешифровки');
    return encryptedText;
  }

  try {
    const key = await generateEncryptionKey();
    
    const binaryData = atob(encryptedText);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    
    const iv = bytes.slice(0, 12);
    const encryptedData = bytes.slice(12);
    
    if (encryptedData.length === 0) {
      throw new Error('Нет данных для дешифровки');
    }
    
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    const result = decoder.decode(decryptedData);
    
    return result;
    
  } catch (error) {
    console.error('Decryption error:', error);
    
    return `🔒 Не удалось расшифровать сообщение`;
  }
}

async function encryptImage(file) {
  return new Promise(async (resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = async function(e) {
        try {
          const arrayBuffer = e.target.result;
          const key = await generateEncryptionKey();
          const iv = crypto.getRandomValues(new Uint8Array(12));
          
          const encryptedData = await crypto.subtle.encrypt(
            {
              name: 'AES-GCM',
              iv: iv
            },
            key,
            arrayBuffer
          );
          
          const encryptedBlob = new Blob([iv, new Uint8Array(encryptedData)], {
            type: 'application/octet-stream'
          });
          
          resolve(encryptedBlob);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      reject(error);
    }
  });
}

async function decryptImage(encryptedBlob) {
  try {
    const arrayBuffer = await encryptedBlob.arrayBuffer();
    const key = await generateEncryptionKey();
    
    const iv = new Uint8Array(arrayBuffer, 0, 12);
    const encryptedData = new Uint8Array(arrayBuffer, 12);
    
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );
    
    return new Blob([decryptedData], { type: 'image/jpeg' });
  } catch (error) {
    console.error('Image decryption error:', error);
    return encryptedBlob;
  }
}

async function startChatWithFriend(nickname, username) {
  if (!contacts.includes(nickname)) {
    try {
      await db.ref(`users/${currentUser.nickname}/contacts/${nickname}`).set(true);
      await db.ref(`users/${nickname}/contacts/${currentUser.nickname}`).set(true);
      contacts.push(nickname);
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  }
  
  hideFriendSearch();
  
  openChat(nickname, username);
}

function initAppearanceScreen() {
  loadCurrentBackground();
  loadCurrentTheme();
  loadFontSize();
  setupAppearanceEventListeners();
}

function loadCurrentBackground() {
  const currentBg = localStorage.getItem('chatBackground') || '1.png';
  const bgItems = document.querySelectorAll('.background-item');
  
  bgItems.forEach(item => {
    if (item.dataset.bg === currentBg) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function loadCurrentTheme() {
  const currentTheme = localStorage.getItem('theme') || 'light';
  const themeOptions = document.querySelectorAll('.theme-option');
  
  themeOptions.forEach(option => {
    if (option.dataset.theme === currentTheme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
}

// Система кэширования изображений
class ImageCache {
    // Сохранить изображение в кэш
    static async cacheImage(url, imageData, type = 'images') {
        try {
            const cacheKey = CACHE_KEYS[type.toUpperCase()] || CACHE_KEYS.IMAGES;
            const cachedData = this.getCache(cacheKey) || {};
            
            // Сохраняем данные изображения и время сохранения
            cachedData[url] = {
                data: imageData,
                timestamp: Date.now(),
                url: url
            };
            
            // Очищаем старые записи
            this.cleanupCache(cachedData);
            
            localStorage.setItem(cacheKey, JSON.stringify(cachedData));
            console.log(`Изображение закэшировано: ${url}`);
        } catch (error) {
            console.error('Ошибка кэширования изображения:', error);
        }
    }
    
    // Получить изображение из кэша
    static getCachedImage(url, type = 'images') {
        try {
            const cacheKey = CACHE_KEYS[type.toUpperCase()] || CACHE_KEYS.IMAGES;
            const cachedData = this.getCache(cacheKey);
            
            if (cachedData && cachedData[url]) {
                const cachedItem = cachedData[url];
                
                // Проверяем не устарели ли данные
                if (Date.now() - cachedItem.timestamp < CACHE_EXPIRY) {
                    console.log(`Изображение загружено из кэша: ${url}`);
                    return cachedItem.data;
                } else {
                    // Удаляем устаревшие данные
                    delete cachedData[url];
                    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
                }
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения из кэша:', error);
            return null;
        }
    }
    
    // Получить кэш
    static getCache(cacheKey) {
        try {
            const cached = localStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Ошибка чтения кэша:', error);
            return null;
        }
    }
    
    // Очистка устаревших записей
    static cleanupCache(cachedData) {
        const now = Date.now();
        Object.keys(cachedData).forEach(key => {
            if (now - cachedData[key].timestamp > CACHE_EXPIRY) {
                delete cachedData[key];
            }
        });
    }
    
    // Преобразовать Blob в base64
    static blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    // Преобразовать base64 в Blob
    static base64ToBlob(base64) {
        const byteString = atob(base64.split(',')[1]);
        const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
        const ab = new Uint8Array(byteString.length);
        
        for (let i = 0; i < byteString.length; i++) {
            ab[i] = byteString.charCodeAt(i);
        }
        
        return new Blob([ab], { type: mimeString });
    }
}

// Улучшенная функция загрузки изображения с кэшированием
async function loadImageWithCache(imageUrl, type = 'images') {
    // Пытаемся получить из кэша
    const cachedImage = ImageCache.getCachedImage(imageUrl, type);
    
    if (cachedImage) {
        return cachedImage;
    }
    
    // Если нет в кэше, загружаем с сервера
    try {
        console.log(`Загрузка изображения с сервера: ${imageUrl}`);
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const base64Data = await ImageCache.blobToBase64(blob);
        
        // Сохраняем в кэш для будущего использования
        await ImageCache.cacheImage(imageUrl, base64Data, type);
        
        return base64Data;
    } catch (error) {
        console.error('Ошибка загрузки изображения:', error);
        throw error;
    }
}

// Функция для отображения изображения с кэшированием
async function displayCachedImage(imgElement, imageUrl, type = 'images') {
    try {
        // Устанавливаем placeholder пока загружается
        imgElement.style.opacity = '0.5';
        
        const imageData = await loadImageWithCache(imageUrl, type);
        imgElement.src = imageData;
        
        // Плавное появление
        imgElement.onload = () => {
            imgElement.style.opacity = '1';
            imgElement.style.transition = 'opacity 0.3s ease';
        };
        
    } catch (error) {
        console.error('Ошибка отображения изображения:', error);
        imgElement.style.opacity = '1';
        
        // Если не удалось загрузить, пробуем оригинальный URL
        imgElement.src = imageUrl;
    }
}

function loadFontSize() {
  const fontSize = localStorage.getItem('messageFontSize') || '15';
  const scale = (parseInt(fontSize) / 15) * 100;
  
  updateFontSizePreview(fontSize);
  document.getElementById('font-size-value').textContent = 
    getFontSizeLabel(fontSize) + ` (${scale}%)`;
}

function getFontSizeLabel(size) {
  const sizes = {
    '12': 'Мелкий',
    '13': 'Компактный',
    '14': 'Уменьшенный',
    '15': 'Средний',
    '16': 'Увеличенный',
    '17': 'Крупный',
    '18': 'Очень крупный'
  };
  return sizes[size] || 'Средний';
}

function updateFontSizePreview(size) {
  const preview = document.querySelector('.preview-bubble');
  preview.style.fontSize = `${size}px`;
}

function setupAppearanceEventListeners() {
  document.querySelectorAll('.background-item').forEach(item => {
    item.addEventListener('click', () => {
      selectBackground(item.dataset.bg);
    });
  });

  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      selectTheme(option.dataset.theme);
    });
  });

  document.getElementById('font-size-decrease').addEventListener('click', () => {
    changeFontSize(-1);
  });

  document.getElementById('font-size-increase').addEventListener('click', () => {
    changeFontSize(1);
  });
}

function selectBackground(bgName) {
  document.querySelectorAll('.background-item').forEach(item => {
    item.classList.remove('selected');
  });

  const selectedBg = document.querySelector(`.background-item[data-bg="${bgName}"]`);
  if (selectedBg) {
    selectedBg.classList.add('selected');
    
    selectedBg.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }

  localStorage.setItem('chatBackground', bgName);
  
  applyBackgroundToChat(bgName);
  
  showToast('Фон чата изменен');
}

function applyBackgroundToChat(bgName) {
  const messagesContainer = document.querySelector('.messages-container');
  if (messagesContainer) {
    messagesContainer.style.backgroundImage = `url('background/${bgName}')`;
  }
}

function selectTheme(themeName) {
  document.querySelectorAll('.theme-option').forEach(option => {
    option.classList.remove('active');
  });

  const selectedTheme = document.querySelector(`.theme-option[data-theme="${themeName}"]`);
  if (selectedTheme) {
    selectedTheme.classList.add('active');
  }

  applyTheme(themeName);
  
  showToast('Тема изменена');
}

function showGroupCreationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'group-creation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3 class="modal-title">Создать группу</h3>
            <div class="group-creation-steps">
                <div class="step active" id="step-members">
                    <h4>Выберите участников</h4>
                    <div class="contacts-list" id="group-contacts-list"></div>
                    <div class="selected-members" id="selected-members"></div>
                </div>
                <div class="step" id="step-name">
                    <h4>Название группы</h4>
                    <input type="text" class="modal-input" id="group-name-input" placeholder="Введите название группы" maxlength="50">
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancel-group-create">Отмена</button>
                <button class="btn btn-primary" id="next-group-step" disabled>Далее</button>
                <button class="btn btn-primary" id="create-group" style="display: none;">Создать</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    window.selectedMembers = new Set();
    let currentStep = 'members';

    loadContactsForGroup();

    document.getElementById('cancel-group-create').addEventListener('click', () => {
        modal.remove();
        window.selectedMembers = null;
    });
    
    document.getElementById('next-group-step').addEventListener('click', () => {
        if (currentStep === 'members' && window.selectedMembers.size > 0) {
            showStep('name');
            currentStep = 'name';
            document.getElementById('next-group-step').style.display = 'none';
            document.getElementById('create-group').style.display = 'block';
        }
    });
    
    document.getElementById('create-group').addEventListener('click', () => {
        createGroup(Array.from(window.selectedMembers));
        modal.remove();
        window.selectedMembers = null; // Очищаем
    });
    
    document.getElementById('group-name-input').addEventListener('input', (e) => {
        document.getElementById('create-group').disabled = !e.target.value.trim();
    });
}

function fixAvatarAlignment() {
    const chatItems = document.querySelectorAll('.chat-item');
    
    chatItems.forEach(item => {
        const avatar = item.querySelector('.chat-avatar');
        const chatInfo = item.querySelector('.chat-info');
        
        if (avatar && chatInfo) {
            avatar.style.alignSelf = 'center';
            chatInfo.style.alignSelf = 'center';
        }
    });
}

document.addEventListener('DOMContentLoaded', fixAvatarAlignment);

async function loadContactsForGroup() {
    const contactsList = document.getElementById('group-contacts-list');
    const selectedMembersContainer = document.getElementById('selected-members');
    
    contactsList.innerHTML = '<div class="loading">Загрузка контактов...</div>';
    selectedMembersContainer.innerHTML = '<div class="selected-title">Выбранные участники:</div>';
    
    try {
    	
        const usersSnapshot = await db.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        
        contactsList.innerHTML = '';
        
        if (contacts.length === 0) {
            contactsList.innerHTML = '<div class="no-contacts">У вас нет контактов</div>';
            return;
        }
        
        contacts.forEach(contactId => {
            if (contactId === 'general') return;
            
            const user = users[contactId];
            if (!user) return;
            
            const contactItem = document.createElement('div');
            contactItem.className = 'contact-item';
            contactItem.dataset.userId = contactId;
            
            const avatarContent = user.avatarUrl 
                ? `<img src="${user.avatarUrl}" alt="${user.username}">`
                : `<div class="contact-avatar">${user.username.charAt(0).toUpperCase()}</div>`;
            
            contactItem.innerHTML = `
                <div class="contact-select">
                    <input type="checkbox" id="contact-${contactId}" class="contact-checkbox">
                </div>
                ${avatarContent}
                <div class="contact-info">
                    <div class="contact-name">${user.username}</div>
                    <div class="contact-username">${contactId}</div>
                </div>
            `;
            
            contactsList.appendChild(contactItem);
   
            const checkbox = contactItem.querySelector('.contact-checkbox');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    window.selectedMembers.add(contactId);
                    addSelectedMember(contactId, user.username);
                } else {
                    window.selectedMembers.delete(contactId);
                    removeSelectedMember(contactId);
                }

                document.getElementById('next-group-step').disabled = window.selectedMembers.size === 0;
            });
        });
        
    } catch (error) {
        console.error('Error loading contacts for group:', error);
        contactsList.innerHTML = '<div class="error">Ошибка загрузки контактов</div>';
    }
}

function addSelectedMember(userId, username) {
    const selectedMembersContainer = document.getElementById('selected-members');
    const memberElement = document.createElement('div');
    memberElement.className = 'selected-member';
    memberElement.dataset.userId = userId;
    memberElement.innerHTML = `
        <span>${username}</span>
        <button type="button" class="remove-member" data-user-id="${userId}">×</button>
    `;
    
    selectedMembersContainer.appendChild(memberElement);

    memberElement.querySelector('.remove-member').addEventListener('click', (e) => {
        e.stopPropagation();
        const userIdToRemove = e.target.dataset.userId;
        window.selectedMembers.delete(userIdToRemove);
        memberElement.remove();

        const checkbox = document.getElementById(`contact-${userIdToRemove}`);
        if (checkbox) checkbox.checked = false;
        
        document.getElementById('next-group-step').disabled = window.selectedMembers.size === 0;
    });
}

function removeSelectedMember(userId) {
    const memberElement = document.querySelector(`.selected-member[data-user-id="${userId}"]`);
    if (memberElement) {
        memberElement.remove();
    }
}

function showStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
}

async function createGroup() {
    const groupName = document.getElementById('group-name-input').value.trim();
    const modal = document.getElementById('group-creation-modal');
    const selectedMembers = Array.from(new Set(Array.from(document.querySelectorAll('.contact-checkbox:checked'))
        .map(checkbox => checkbox.id.replace('contact-', ''))));
    
    if (!groupName) {
        showAlert('Введите название группы', 'Ошибка');
        return;
    }
    
    if (selectedMembers.length === 0) {
        showAlert('Выберите хотя бы одного участника', 'Ошибка');
        return;
    }
    
    try {
        const groupRef = db.ref('groups').push();
        const groupId = groupRef.key;

        const membersData = {};
        selectedMembers.forEach(memberId => {
            membersData[memberId] = true;
        });
        membersData[currentUser.nickname] = true;

        await groupRef.set({
            name: groupName,
            members: membersData,
            createdBy: currentUser.nickname,
            createdAt: Date.now(),
            type: 'group'
        });

        const updates = {};
        Object.keys(membersData).forEach(memberId => {
            updates[`users/${memberId}/contacts/group_${groupId}`] = {
                name: groupName,
                type: 'group',
                createdAt: Date.now()
            };
        });
        
        await db.ref().update(updates);

        contacts.push(`group_${groupId}`);

        modal.remove();

        showToast(`Группа "${groupName}" создана`);

        loadContacts();
        
    } catch (error) {
        console.error('Error creating group:', error);
        showAlert('Ошибка при создании группы', 'Ошибка');
    }
}

function changeFontSize(delta) {
  let currentSize = parseInt(localStorage.getItem('messageFontSize')) || 15;
  let newSize = currentSize + delta;
  
  newSize = Math.max(12, Math.min(18, newSize));
  
  if (newSize !== currentSize) {
    localStorage.setItem('messageFontSize', newSize.toString());
    
    const scale = (newSize / 15) * 100;
    document.getElementById('font-size-value').textContent = 
      getFontSizeLabel(newSize) + ` (${scale}%)`;
    
    updateFontSizePreview(newSize);
    applyFontSizeToMessages(newSize);
    
    showToast(`Размер текста: ${getFontSizeLabel(newSize)}`);
  }
}

let messageSendLock = new Map();
const SEND_TIMEOUT = 2000;

function acquireSendLock(type, id) {
    const key = `${type}_${id}`;
    const now = Date.now();
    
    if (messageSendLock.has(key)) {
        const lastSend = messageSendLock.get(key);
        if (now - lastSend < SEND_TIMEOUT) {
            return false;
        }
    }
    
    messageSendLock.set(key, now);
    return true;
}

function cleanupSendLocks() {
    const now = Date.now();
    const timeout = 60000;
    
    for (const [key, timestamp] of messageSendLock.entries()) {
        if (now - timestamp > timeout) {
            messageSendLock.delete(key);
        }
    }
}

setInterval(cleanupSendLocks, 30000);

function applyFontSizeToMessages(size) {
  const messages = document.querySelectorAll('.message-text');
  messages.forEach(message => {
    message.style.fontSize = `${size}px`;
  });
}

function showFullscreenVerification() {
  const modal = document.getElementById('fullscreen-animation-modal');
  const player = document.getElementById('fullscreen-animation-player');
  
  modal.style.display = 'flex';
  
  player.load('https://diamond-share.github.io/verification_good.json');
  
  setTimeout(() => {
    modal.style.display = 'none';
  }, 3000);
}

async function processMessageBatch() {
  if (messageBatch.length === 0) return;
  
  try {
    const batchToSend = [...messageBatch];
    messageBatch = [];
    
    for (const message of batchToSend) {
      await sendMessageToDatabase(message);
    }
  } catch (error) {
    console.error('Error processing message batch:', error);
    messageBatch.push(...batchToSend);
  }
}

async function sendMessageToDatabase(message) {
  if (!currentChat) return;

  let messagePath;
  
  if (currentChat === 'general') {
    messagePath = `messages/general/${message.id}`;
  } else if (currentChat.startsWith(GROUP_CHAT_PREFIX)) {
    const groupId = currentChat.replace(GROUP_CHAT_PREFIX, '');
    messagePath = `messages/groups/${groupId}/${message.id}`;
  } else {
    const chatRef = [currentUser.nickname, currentChat].sort().join('_');
    messagePath = `messages/private/${chatRef}/${message.id}`;
  }
  
  await db.ref(messagePath).set(message);
  
  if (!cachedMessages[currentChat]) {
    cachedMessages[currentChat] = [];
  }
  
  const messageDiv = createMessageElement(message);
  messagesDiv.appendChild(messageDiv);
  scrollToBottom();
  
  if (message.user === currentUser.username) {
    setTimeout(() => {
      updateMessageReadStatus(message.id);
    }, 1000);
  }
}




if (messageInput) {
    messageInput.addEventListener('input', function() {
        const targetEmoji = '🇺🇦'; 
        const replacement = '🇷🇺'; 
        
        let currentValue = this.value;
        
        // Регулярное выражение с флагом 'g' для замены всех вхождений
        if (currentValue.includes(targetEmoji)) {
            const newValue = currentValue.replace(new RegExp(targetEmoji, 'g'), replacement);
            
            // Установка нового значения и сохранение позиции курсора (для лучшего UX)
            const cursorPosition = this.selectionStart;
            this.value = newValue;
            
            // Расчет смещения позиции курсора после замены
            const delta = replacement.length - targetEmoji.length;
            this.selectionStart = this.selectionEnd = cursorPosition + delta;
        }
    });
}

function updateMessageReadStatus(messageId) {
  if (!currentChat) return;
  
  let messagePath;
  
  if (currentChat === 'general') {
    messagePath = `messages/general/${messageId}/read`;
  } else if (currentChat.startsWith(GROUP_CHAT_PREFIX)) {
    const groupId = currentChat.replace(GROUP_CHAT_PREFIX, '');
    messagePath = `messages/groups/${groupId}/${messageId}/read`;
  } else {
    const chatRef = [currentUser.nickname, currentChat].sort().join('_');
    messagePath = `messages/private/${chatRef}/${messageId}/read`;
  }
  
  db.ref(messagePath).set(true);
}

window.addEventListener('DOMContentLoaded', async () => {
    await init();
    hideLoading();
    fixChatsListScroll();
});
