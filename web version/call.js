// call.js - Система видеозвонков для Diamond Share

// Firebase конфигурация для звонков (отдельная база)

// Agora конфигурация
const AGORA_CONFIG = {
    appId: "fc97c0f924ce4bec9389fa2cf4899e48",
    token: null
};

class VideoCallSystem {
    constructor() {
        this.callApp = null;
        this.callDb = null;
        this.client = null;
        this.localTracks = { videoTrack: null, audioTrack: null };
        this.currentCall = null;
        this.currentCallId = null;
        this.callTimerInterval = null;
        this.callTimer = 0;
        this.micActive = true;
        this.cameraActive = true;
        this.usingFrontCamera = true;
        this.callListeners = {};
        
        this.isInitialized = false;
    }

    // Инициализация системы звонков
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Инициализируем Firebase для звонков
            this.callApp = firebase.initializeApp(CALL_FIREBASE_CONFIG, "CallApp");
            this.callDb = this.callApp.database();
            
            // Инициализируем Agora
            this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            this.setupAgoraListeners();
            
            this.isInitialized = true;
            console.log("Система звонков инициализирована");
            
        } catch (error) {
            console.error("Ошибка инициализации системы звонков:", error);
        }
    }

    // Настройка слушателей Agora
    setupAgoraListeners() {
        this.client.on("user-published", async (user, mediaType) => {
            console.log("Пользователь опубликовал медиа:", mediaType);
            
            await this.client.subscribe(user, mediaType);
            
            if (mediaType === "video") {
                const remoteVideo = document.getElementById('remote-video');
                if (remoteVideo) {
                    user.videoTrack.play(remoteVideo);
                    this.hideVideoPlaceholder();
                }
            }
            if (mediaType === "audio") {
                user.audioTrack.play();
            }
            
            this.showCallNotification('Участник присоединился');
        });

        this.client.on("user-left", (user) => {
            console.log("Пользователь вышел:", user.uid);
            this.showVideoPlaceholder();
            
            // Если все вышли, завершаем звонок
            this.checkIfCallShouldEnd();
        });

        this.client.on("network-quality", (stats) => {
            // Мониторинг качества сети
            console.log("Качество сети:", stats);
        });
    }

    // Начать звонок
    async startCall(chatId, targetUser) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!currentUser) {
            showAlert('Ошибка', 'Пользователь не авторизован');
            return;
        }

        try {
            // Создаем ID звонка на основе чата
            this.currentCallId = `call_${chatId}_${Date.now()}`;
            this.currentCall = {
                id: this.currentCallId,
                chatId: chatId,
                participants: {
                    [currentUser.nickname]: {
                        username: currentUser.username,
                        status: 'calling',
                        joinedAt: null
                    },
                    [targetUser]: {
                        username: targetUser,
                        status: 'waiting',
                        joinedAt: null
                    }
                },
                status: 'calling',
                startedAt: Date.now(),
                initiator: currentUser.nickname
            };

            // Сохраняем информацию о звонке
            await this.callDb.ref(`calls/${this.currentCallId}`).set(this.currentCall);
            
            // Обновляем статус звонка в чате
            await db.ref(`callStatus/${chatId}`).set({
                active: true,
                callId: this.currentCallId,
                initiator: currentUser.nickname,
                startedAt: Date.now()
            });

            // Показываем интерфейс ожидания
            this.showCallInterface('waiting', `Звонок ${targetUser}`);
            
            // Запускаем слушатель ответа на звонок
            this.setupCallAnswerListener(chatId, targetUser);
            
            console.log("Звонок начат:", this.currentCallId);
            
        } catch (error) {
            console.error("Ошибка начала звонка:", error);
            showAlert('Ошибка', 'Не удалось начать звонок');
        }
    }

    // Ответить на звонок
    async answerCall(callId, chatId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Получаем информацию о звонке
            const callSnapshot = await this.callDb.ref(`calls/${callId}`).once('value');
            const callData = callSnapshot.val();
            
            if (!callData || callData.status !== 'calling') {
                showAlert('Ошибка', 'Звонок больше не активен');
                return;
            }

            this.currentCallId = callId;
            this.currentCall = callData;

            // Обновляем статус участника
            await this.callDb.ref(`calls/${callId}/participants/${currentUser.nickname}/status`).set('joined');
            await this.callDb.ref(`calls/${callId}/participants/${currentUser.nickname}/joinedAt`).set(Date.now());
            await this.callDb.ref(`calls/${callId}/status`).set('active');

            // Подключаемся к Agora каналу
            await this.joinAgoraChannel(callId);
            
            // Показываем интерфейс звонка
            const initiator = callData.participants[callData.initiator].username;
            this.showCallInterface('active', `Звонок с ${initiator}`);
            
            console.log("Ответ на звонок:", callId);
            
        } catch (error) {
            console.error("Ошибка ответа на звонок:", error);
            showAlert('Ошибка', 'Не удалось присоединиться к звонку');
        }
    }

    // Подключение к Agora каналу
    async joinAgoraChannel(channelId) {
        try {
            console.log("Подключаемся к Agora каналу:", channelId);
            
            await this.client.join(AGORA_CONFIG.appId, channelId, AGORA_CONFIG.token, currentUser.nickname);
            console.log("Успешно подключились к Agora каналу");

            // Создаем и публикуем треки
            this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            this.localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();
            
            await this.client.publish([this.localTracks.audioTrack, this.localTracks.videoTrack]);
            console.log("Треки опубликованы");

            // Воспроизводим локальное видео
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = new MediaStream([this.localTracks.videoTrack.getMediaStreamTrack()]);
                this.localTracks.videoTrack.play(localVideo);
            }

            this.startCallTimer();
            
        } catch (error) {
            console.error("Ошибка подключения к Agora:", error);
            throw error;
        }
    }

    // Завершить звонок
    async endCall() {
        try {
            if (this.currentCallId) {
                // Обновляем статус звонка
                await this.callDb.ref(`calls/${this.currentCallId}/status`).set('ended');
                await this.callDb.ref(`calls/${this.currentCallId}/endedAt`).set(Date.now());
                
                // Очищаем статус звонка в чате
                if (this.currentCall) {
                    await db.ref(`callStatus/${this.currentCall.chatId}`).remove();
                }
            }

            // Останавливаем медиа треки
            if (this.localTracks.audioTrack) {
                this.localTracks.audioTrack.stop();
                this.localTracks.audioTrack.close();
            }
            if (this.localTracks.videoTrack) {
                this.localTracks.videoTrack.stop();
                this.localTracks.videoTrack.close();
            }

            // Выходим из канала
            if (this.client) {
                await this.client.leave();
            }

            this.stopCallTimer();
            this.hideCallInterface();
            
            this.currentCall = null;
            this.currentCallId = null;
            
            console.log("Звонок завершен");
            
        } catch (error) {
            console.error("Ошибка завершения звонка:", error);
        }
    }

    // Слушатель ответа на звонок
    setupCallAnswerListener(chatId, targetUser) {
        const callRef = this.callDb.ref(`calls/${this.currentCallId}`);
        
        this.callListeners.answer = callRef.on('value', async (snapshot) => {
            const callData = snapshot.val();
            
            if (!callData) {
                // Звонок удален (отменен)
                this.showCallNotification('Звонок отменен');
                this.hideCallInterface();
                this.cleanupCallListeners();
                return;
            }

            if (callData.status === 'active') {
                // Кто-то ответил на звонок
                this.cleanupCallListeners();
                await this.joinAgoraChannel(this.currentCallId);
                this.showCallInterface('active', `Звонок с ${targetUser}`);
            } else if (callData.status === 'ended') {
                // Звонок завершен
                this.showCallNotification('Звонок завершен');
                this.hideCallInterface();
                this.cleanupCallListeners();
            }
        });
    }

    // Слушатель входящих звонков
    setupIncomingCallListener() {
        if (!currentUser) return;

        const callStatusRef = db.ref(`callStatus`);
        
        this.callListeners.incoming = callStatusRef.on('child_added', async (snapshot) => {
            const callStatus = snapshot.val();
            const chatId = snapshot.key;

            // Проверяем, относится ли звонок к текущему пользователю
            if (callStatus.active && 
                chatId === currentChat && 
                callStatus.initiator !== currentUser.nickname) {
                
                this.showIncomingCallNotification(chatId, callStatus.callId, callStatus.initiator);
            }
        });

        callStatusRef.on('child_removed', (snapshot) => {
            const chatId = snapshot.key;
            if (chatId === currentChat) {
                this.hideIncomingCallNotification();
            }
        });
    }

    // Проверка необходимости завершения звонка
    async checkIfCallShouldEnd() {
        if (!this.currentCallId) return;

        try {
            const callSnapshot = await this.callDb.ref(`calls/${this.currentCallId}/participants`).once('value');
            const participants = callSnapshot.val();
            
            if (!participants) {
                await this.endCall();
                return;
            }

            // Считаем активных участников
            const activeParticipants = Object.values(participants).filter(
                p => p.status === 'joined' || p.status === 'calling'
            ).length;

            if (activeParticipants <= 1) {
                // Остался только один участник или меньше
                this.showCallNotification('Все участники вышли');
                setTimeout(() => this.endCall(), 2000);
            }
            
        } catch (error) {
            console.error("Ошибка проверки участников:", error);
        }
    }

    // UI функции
    showCallInterface(mode, title) {
        // Создаем интерфейс звонка если его нет
        let callInterface = document.getElementById('call-interface');
        if (!callInterface) {
            callInterface = this.createCallInterface();
        }

        // Обновляем в зависимости от режима
        const callTitle = document.getElementById('call-title');
        const callStatus = document.getElementById('call-status');
        const videoPlaceholder = document.getElementById('video-placeholder');
        
        if (callTitle) callTitle.textContent = title;
        
        if (mode === 'waiting') {
            if (callStatus) callStatus.textContent = 'Ожидание ответа...';
            if (videoPlaceholder) {
                videoPlaceholder.innerHTML = '<i class="fas fa-phone"></i><div>Ожидание ответа...</div>';
                videoPlaceholder.style.display = 'flex';
            }
        } else if (mode === 'active') {
            if (callStatus) callStatus.textContent = '00:00';
            if (videoPlaceholder) videoPlaceholder.style.display = 'none';
        }

        callInterface.style.display = 'flex';
        
        // Скрываем основной интерфейс
        if (chatView) chatView.style.display = 'none';
        if (chatsList) chatsList.style.display = 'none';
    }

    hideCallInterface() {
        const callInterface = document.getElementById('call-interface');
        if (callInterface) {
            callInterface.style.display = 'none';
        }
        
        // Показываем основной интерфейс
        if (currentChat) {
            chatView.style.display = 'flex';
        } else {
            chatsList.style.display = 'block';
            if (chatView) chatView.style.display = 'none';
        }
    }

    createCallInterface() {
        const callInterface = document.createElement('div');
        callInterface.id = 'call-interface';
        callInterface.className = 'call-interface';
        callInterface.innerHTML = `
            <div class="call-header">
                <div class="call-header-content">
                    <button class="back-btn" id="call-back-btn">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="call-info">
                        <div class="call-title" id="call-title">Звонок</div>
                        <div class="call-status" id="call-status">Подключение...</div>
                    </div>
                </div>
            </div>

            <div class="video-container">
                <video class="remote-video" id="remote-video" autoplay playsinline></video>
                <video class="local-video" id="local-video" autoplay playsinline muted></video>
                <div class="video-placeholder" id="video-placeholder">
                    <i class="fas fa-users"></i>
                    <div>Ожидание участников...</div>
                </div>
            </div>

            <div class="call-controls">
                <div class="main-controls">
                    <div class="control-item">
                        <button class="control-btn mic active" id="call-mic-btn">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <div class="control-label">Микрофон</div>
                    </div>
                    
                    <div class="control-item">
                        <button class="control-btn end-call" id="call-end-btn">
                            <i class="fas fa-phone-slash"></i>
                        </button>
                        <div class="control-label">Завершить</div>
                    </div>
                    
                    <div class="control-item">
                        <button class="control-btn camera active" id="call-camera-btn">
                            <i class="fas fa-video"></i>
                        </button>
                        <div class="control-label">Камера</div>
                    </div>
                </div>
            </div>
        `;

        // Добавляем стили
        this.addCallStyles();
        
        // Добавляем обработчики
        document.body.appendChild(callInterface);
        
        document.getElementById('call-back-btn').addEventListener('click', () => {
            if (confirm('Завершить звонок?')) {
                this.endCall();
            }
        });
        
        document.getElementById('call-end-btn').addEventListener('click', () => {
            this.endCall();
        });
        
        document.getElementById('call-mic-btn').addEventListener('click', () => {
            this.toggleMicrophone();
        });
        
        document.getElementById('call-camera-btn').addEventListener('click', () => {
            this.toggleCamera();
        });

        return callInterface;
    }

    addCallStyles() {
        const styles = `
            <style>
                .call-interface {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: #000;
                    z-index: 10000;
                    display: none;
                    flex-direction: column;
                }

                .call-header {
                    background: rgba(0, 0, 0, 0.8);
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    backdrop-filter: blur(10px);
                }

                .call-header-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                }

                .call-header .back-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: white;
                }

                .call-info {
                    flex: 1;
                }

                .call-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: white;
                    margin-bottom: 2px;
                }

                .call-status {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.8);
                }

                .video-container {
                    flex: 1;
                    background: #000;
                    position: relative;
                    overflow: hidden;
                }

                .remote-video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .local-video {
                    position: absolute;
                    bottom: 100px;
                    right: 20px;
                    width: 120px;
                    height: 160px;
                    border-radius: 12px;
                    object-fit: cover;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                }

                .video-placeholder {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255, 255, 255, 0.7);
                    background: #000;
                }

                .video-placeholder i {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .call-controls {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
                    padding: 40px 20px 30px;
                    display: flex;
                    justify-content: center;
                }

                .main-controls {
                    display: flex;
                    gap: 40px;
                }

                .control-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .control-btn {
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 24px;
                    color: white;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                }

                .control-btn:hover {
                    transform: translateY(-3px);
                }

                .control-btn.mic, .control-btn.camera {
                    background: #3b82f6;
                }

                .control-btn.mic.inactive, .control-btn.camera.inactive {
                    background: #6b7280;
                }

                .control-btn.end-call {
                    background: #ef4444;
                    width: 80px;
                    height: 80px;
                    font-size: 28px;
                }

                .control-label {
                    margin-top: 8px;
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.9);
                }

                .incoming-call-notification {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(30, 30, 30, 0.95);
                    border-radius: 20px;
                    padding: 2rem;
                    text-align: center;
                    z-index: 10001;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }

                .incoming-call-buttons {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1.5rem;
                    justify-content: center;
                }

                .incoming-call-btn {
                    padding: 0.8rem 1.5rem;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .incoming-call-btn.accept {
                    background: #10b981;
                    color: white;
                }

                .incoming-call-btn.decline {
                    background: #ef4444;
                    color: white;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    showIncomingCallNotification(chatId, callId, initiator) {
        // Скрываем предыдущее уведомление
        this.hideIncomingCallNotification();

        const notification = document.createElement('div');
        notification.className = 'incoming-call-notification';
        notification.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem;">📞</div>
            <h3 style="margin-bottom: 0.5rem;">Входящий звонок</h3>
            <p style="color: rgba(255,255,255,0.7); margin-bottom: 1.5rem;">${initiator} вызывает вас</p>
            <div class="incoming-call-buttons">
                <button class="incoming-call-btn accept">
                    <i class="fas fa-phone"></i> Принять
                </button>
                <button class="incoming-call-btn decline">
                    <i class="fas fa-phone-slash"></i> Отклонить
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Обработчики кнопок
        notification.querySelector('.accept').addEventListener('click', () => {
            this.answerCall(callId, chatId);
            notification.remove();
        });

        notification.querySelector('.decline').addEventListener('click', () => {
            this.declineCall(callId);
            notification.remove();
        });

        this.incomingCallNotification = notification;
    }

    hideIncomingCallNotification() {
        if (this.incomingCallNotification) {
            this.incomingCallNotification.remove();
            this.incomingCallNotification = null;
        }
    }

    async declineCall(callId) {
        try {
            await this.callDb.ref(`calls/${callId}/status`).set('declined');
            await db.ref(`callStatus/${currentChat}`).remove();
        } catch (error) {
            console.error("Ошибка отклонения звонка:", error);
        }
    }

    // Управление медиа
    async toggleMicrophone() {
        if (this.localTracks.audioTrack) {
            await this.localTracks.audioTrack.setEnabled(!this.micActive);
            this.micActive = !this.micActive;
            
            const micBtn = document.getElementById('call-mic-btn');
            if (micBtn) {
                if (this.micActive) {
                    micBtn.classList.add('active');
                    micBtn.classList.remove('inactive');
                    micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                } else {
                    micBtn.classList.remove('active');
                    micBtn.classList.add('inactive');
                    micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                }
            }
        }
    }

    async toggleCamera() {
        if (this.localTracks.videoTrack) {
            await this.localTracks.videoTrack.setEnabled(!this.cameraActive);
            this.cameraActive = !this.cameraActive;
            
            const cameraBtn = document.getElementById('call-camera-btn');
            const localVideo = document.getElementById('local-video');
            
            if (cameraBtn) {
                if (this.cameraActive) {
                    cameraBtn.classList.add('active');
                    cameraBtn.classList.remove('inactive');
                    cameraBtn.innerHTML = '<i class="fas fa-video"></i>';
                    if (localVideo) localVideo.style.display = 'block';
                } else {
                    cameraBtn.classList.remove('active');
                    cameraBtn.classList.add('inactive');
                    cameraBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
                    if (localVideo) localVideo.style.display = 'none';
                }
            }
        }
    }

    // Вспомогательные функции
    showVideoPlaceholder() {
        const placeholder = document.getElementById('video-placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
    }

    hideVideoPlaceholder() {
        const placeholder = document.getElementById('video-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    }

    showCallNotification(message) {
        showToast(message);
    }

    startCallTimer() {
        this.callTimer = 0;
        const callStatus = document.getElementById('call-status');
        if (!callStatus) return;

        this.stopCallTimer();
        
        this.callTimerInterval = setInterval(() => {
            this.callTimer++;
            const minutes = Math.floor(this.callTimer / 60).toString().padStart(2, '0');
            const seconds = (this.callTimer % 60).toString().padStart(2, '0');
            callStatus.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    stopCallTimer() {
        if (this.callTimerInterval) {
            clearInterval(this.callTimerInterval);
            this.callTimerInterval = null;
        }
    }

    cleanupCallListeners() {
        Object.values(this.callListeners).forEach(listener => {
            if (listener && typeof listener === 'function') {
                listener();
            }
        });
        this.callListeners = {};
    }

    // Проверка активного звонка в чате
    async checkActiveCall(chatId) {
        try {
            const callStatusSnapshot = await db.ref(`callStatus/${chatId}`).once('value');
            const callStatus = callStatusSnapshot.val();
            
            return callStatus && callStatus.active;
        } catch (error) {
            console.error("Ошибка проверки звонка:", error);
            return false;
        }
    }

    // Обновление статуса кнопки звонка
    async updateCallButton(chatId, callButton) {
        const hasActiveCall = await this.checkActiveCall(chatId);
        
        if (hasActiveCall) {
            callButton.classList.add('call-active');
            callButton.innerHTML = '<i class="fas fa-phone-slash" style="color: #ef4444;"></i>';
            callButton.title = 'Занято (активный звонок)';
        } else {
            callButton.classList.remove('call-active');
            callButton.innerHTML = '<i class="fas fa-phone"></i>';
            callButton.title = 'Видеозвонок';
        }
    }
}

// Создаем глобальный экземпляр системы звонков
const videoCallSystem = new VideoCallSystem();

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Отложенная инициализация при первом использовании
    console.log("Система звонков готова к использованию");
});