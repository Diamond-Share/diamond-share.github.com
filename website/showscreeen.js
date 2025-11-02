// ФУНКЦИЯ ДЛЯ ПОКАЗА ФИШИНГОВОГО МЕНЮ НАСТРОЕК УВЕДОМЛЕНИЙ
function showNotificationSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal notification-settings-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1002;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="background: var(--card); border-radius: 16px; padding: 24px; width: 90%; max-width: 400px; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 style="margin: 0; color: var(--text); font-size: 20px; font-weight: 600;">
                    <i class="fas fa-bell" style="color: var(--primary); margin-right: 8px;"></i>
                    Настройки уведомлений
                </h3>
                <button class="close-btn" style="background: none; border: none; font-size: 20px; color: var(--text-secondary); cursor: pointer; padding: 8px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="notification-settings-content">
                <!-- Основные настройки -->
                <div class="setting-group" style="margin-bottom: 24px;">
                    <h4 style="margin: 0 0 16px 0; color: var(--text); font-size: 16px; font-weight: 600;">Основные настройки</h4>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Уведомления чата</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Показывать уведомления для этого чата</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Звук уведомлений</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Воспроизводить звук при новых сообщениях</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Вибросигнал</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Вибрация при новых сообщениях</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Типы уведомлений -->
                <div class="setting-group" style="margin-bottom: 24px;">
                    <h4 style="margin: 0 0 16px 0; color: var(--text); font-size: 16px; font-weight: 600;">Типы уведомлений</h4>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Текстовые сообщения</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Уведомления о новых сообщениях</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Стикеры</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Уведомления о отправленных стикерах</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Изображения</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Уведомления о отправленных фото</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Время уведомлений -->
                <div class="setting-group">
                    <h4 style="margin: 0 0 16px 0; color: var(--text); font-size: 16px; font-weight: 600;">Время уведомлений</h4>
                    
                    <div class="setting-item" style="padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <div style="font-weight: 500; color: var(--text); margin-bottom: 8px;">Тихий режим</div>
                        <div style="display: flex; gap: 8px;">
                            <button class="time-option" style="flex: 1; padding: 8px 12px; border: 1px solid var(--border); background: var(--bg); border-radius: 8px; color: var(--text); cursor: pointer;">1 час</button>
                            <button class="time-option" style="flex: 1; padding: 8px 12px; border: 1px solid var(--border); background: var(--bg); border-radius: 8px; color: var(--text); cursor: pointer;">8 часов</button>
                            <button class="time-option active" style="flex: 1; padding: 8px 12px; border: 1px solid var(--primary); background: var(--primary); border-radius: 8px; color: white; cursor: pointer;">Выкл</button>
                        </div>
                    </div>
                    
                    <div class="setting-item" style="padding: 12px 0;">
                        <div style="font-weight: 500; color: var(--text); margin-bottom: 8px;">Приоритет уведомлений</div>
                        <select style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);">
                            <option>Высокий приоритет</option>
                            <option selected>Средний приоритет</option>
                            <option>Низкий приоритет</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="modal-actions" style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="btn btn-secondary" id="cancel-notification-settings" style="flex: 1; padding: 12px; border: 1px solid var(--border); background: var(--bg); border-radius: 8px; color: var(--text); cursor: pointer;">Отмена</button>
                <button class="btn btn-primary" id="save-notification-settings" style="flex: 1; padding: 12px; border: none; background: var(--primary); border-radius: 8px; color: white; cursor: pointer;">Сохранить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // ПРОСТЫЕ ОБРАБОТЧИКИ ДЛЯ ПЕРЕКЛЮЧАТЕЛЕЙ
    modal.querySelectorAll('.simple-switch').forEach((switchElement, index) => {
        switchElement.addEventListener('click', function() {
            const circle = this.querySelector('div');
            const isOn = this.style.background === 'rgb(204, 204, 204)' || this.style.background === '#ccc';
            
            if (isOn) {
                // Включаем
                this.style.background = '#4CAF50';
                circle.style.left = '24px';
            } else {
                // Выключаем
                this.style.background = '#ccc';
                circle.style.left = '2px';
            }
        });
    });
    
    // Обработчики для кнопок времени
    modal.querySelectorAll('.time-option').forEach(button => {
        button.addEventListener('click', function() {
            modal.querySelectorAll('.time-option').forEach(btn => {
                btn.classList.remove('active');
                btn.style.background = 'var(--bg)';
                btn.style.border = '1px solid var(--border)';
                btn.style.color = 'var(--text)';
            });
            this.classList.add('active');
            this.style.background = 'var(--primary)';
            this.style.border = '1px solid var(--primary)';
            this.style.color = 'white';
        });
    });
    
    // Обработчики закрытия
    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('#cancel-notification-settings').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('#save-notification-settings').addEventListener('click', () => {
        showToast('Настройки уведомлений сохранены');
        modal.remove();
    });
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ФУНКЦИЯ ДЛЯ ПОКАЗА ФИШИНГОВОГО МЕНЮ ПРИВАТНОСТИ
function showPrivacySettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal privacy-settings-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1002;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="background: var(--card); border-radius: 16px; padding: 24px; width: 90%; max-width: 400px; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 style="margin: 0; color: var(--text); font-size: 20px; font-weight: 600;">
                    <i class="fas fa-lock" style="color: var(--primary); margin-right: 8px;"></i>
                    Настройки приватности
                </h3>
                <button class="close-btn" style="background: none; border: none; font-size: 20px; color: var(--text-secondary); cursor: pointer; padding: 8px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="privacy-settings-content">
                <!-- Видимость профиля -->
                <div class="setting-group" style="margin-bottom: 24px;">
                    <h4 style="margin: 0 0 16px 0; color: var(--text); font-size: 16px; font-weight: 600;">Видимость профиля</h4>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Статус онлайн</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Показывать другим пользователям, что вы онлайн</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Время последнего посещения</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Показывать, когда вы были в сети последний раз</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Фотография профиля</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Показывать мою аватарку другим пользователям</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Конфиденциальность чата -->
                <div class="setting-group" style="margin-bottom: 24px;">
                    <h4 style="margin: 0 0 16px 0; color: var(--text); font-size: 16px; font-weight: 600;">Конфиденциальность чата</h4>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Сохранение в галерею</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Автоматически сохранять полученные фото в галерею</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #ccc; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Уведомление о прочтении</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Отправлять отправителю уведомление о прочтении</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Секретный чат</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Включить сквозное шифрование для этого чата</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Безопасность -->
                <div class="setting-group">
                    <h4 style="margin: 0 0 16px 0; color: var(--text); font-size: 16px; font-weight: 600;">Безопасность</h4>
                    
                    <div class="setting-item" style="padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <div style="font-weight: 500; color: var(--text); margin-bottom: 8px;">Блокировка экрана</div>
                        <div style="display: flex; gap: 8px;">
                            <button class="security-option" style="flex: 1; padding: 8px 12px; border: 1px solid var(--border); background: var(--bg); border-radius: 8px; color: var(--text); cursor: pointer;">Нет</button>
                            <button class="security-option active" style="flex: 1; padding: 8px 12px; border: 1px solid var(--primary); background: var(--primary); border-radius: 8px; color: white; cursor: pointer;">1 мин</button>
                            <button class="security-option" style="flex: 1; padding: 8px 12px; border: 1px solid var(--border); background: var(--bg); border-radius: 8px; color: var(--text); cursor: pointer;">5 мин</button>
                        </div>
                    </div>
                    
                    <div class="setting-item" style="padding: 12px 0;">
                        <div style="font-weight: 500; color: var(--text); margin-bottom: 8px;">Двухэтапная аутентификация</div>
                        <select style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);">
                            <option>Отключена</option>
                            <option selected>По SMS</option>
                            <option>По email</option>
                            <option>Приложение-аутентификатор</option>
                        </select>
                    </div>
                </div>
                
                <!-- Дополнительные настройки -->
                <div class="setting-group" style="margin-top: 24px;">
                    <h4 style="margin: 0 0 16px 0; color: var(--text); font-size: 16px; font-weight: 600;">Дополнительные настройки</h4>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Синхронизация между устройствами</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Синхронизировать историю чатов на всех устройствах</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #4CAF50; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                        <div>
                            <div style="font-weight: 500; color: var(--text); margin-bottom: 4px;">Резервное копирование в облако</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Автоматически создавать резервные копии чатов</div>
                        </div>
                        <div class="simple-switch" style="width: 50px; height: 28px; background: #ccc; border-radius: 14px; position: relative; cursor: pointer;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 2px; left: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="modal-actions" style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="btn btn-secondary" id="cancel-privacy-settings" style="flex: 1; padding: 12px; border: 1px solid var(--border); background: var(--bg); border-radius: 8px; color: var(--text); cursor: pointer;">Сбросить</button>
                <button class="btn btn-primary" id="save-privacy-settings" style="flex: 1; padding: 12px; border: none; background: var(--primary); border-radius: 8px; color: white; cursor: pointer;">Применить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // ОБРАБОТЧИКИ ДЛЯ ПЕРЕКЛЮЧАТЕЛЕЙ ПРИВАТНОСТИ
    modal.querySelectorAll('.simple-switch').forEach((switchElement) => {
        switchElement.addEventListener('click', function() {
            const circle = this.querySelector('div');
            const isOn = this.style.background === 'rgb(204, 204, 204)' || this.style.background === '#ccc';
            
            if (isOn) {
                // Включаем
                this.style.background = '#4CAF50';
                circle.style.left = '24px';
            } else {
                // Выключаем
                this.style.background = '#ccc';
                circle.style.left = '2px';
            }
        });
    });
    
    // Обработчики для кнопок безопасности
    modal.querySelectorAll('.security-option').forEach(button => {
        button.addEventListener('click', function() {
            modal.querySelectorAll('.security-option').forEach(btn => {
                btn.classList.remove('active');
                btn.style.background = 'var(--bg)';
                btn.style.border = '1px solid var(--border)';
                btn.style.color = 'var(--text)';
            });
            this.classList.add('active');
            this.style.background = 'var(--primary)';
            this.style.border = '1px solid var(--primary)';
            this.style.color = 'white';
        });
    });
    
    // Обработчики закрытия
    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('#cancel-privacy-settings').addEventListener('click', () => {
        showToast('Настройки приватности сброшены');
        modal.remove();
    });
    
    modal.querySelector('#save-privacy-settings').addEventListener('click', () => {
        showToast('Настройки приватности применены');
        modal.remove();
    });
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ФУНКЦИЯ ДЛЯ ПОКАЗА ПРОСТОГО МЕНЮ ОФОРМЛЕНИЯ
function showThemeSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal theme-settings-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1002;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="background: var(--card); border-radius: 16px; padding: 24px; width: 90%; max-width: 380px; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 style="margin: 0; color: var(--text); font-size: 20px; font-weight: 600;">
                    <i class="fas fa-palette" style="color: var(--primary); margin-right: 8px;"></i>
                    Оформление
                </h3>
                <button class="close-btn" style="background: none; border: none; font-size: 20px; color: var(--text-secondary); cursor: pointer; padding: 8px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="theme-settings-content">
                <!-- Переключатель темы -->
                <div class="setting-group" style="margin-bottom: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--bg); border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-moon" style="font-size: 20px; color: var(--text-secondary);"></i>
                            <div>
                                <div style="font-weight: 500; color: var(--text);">Темная тема</div>
                                <div style="font-size: 13px; color: var(--text-secondary);">Комфорт для глаз</div>
                            </div>
                        </div>
                        <div class="theme-switch" style="width: 60px; height: 32px; background: var(--primary); border-radius: 16px; position: relative; cursor: pointer; transition: all 0.3s;">
                            <div style="position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 4px; left: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.3s;"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Размер шрифта -->
                <div class="setting-group">
                    <h4 style="margin: 0 0 16px 0; color: var(--text); font-size: 16px; font-weight: 600;">Размер шрифта</h4>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: var(--bg); border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-text-height" style="font-size: 20px; color: var(--text-secondary);"></i>
                            <div>
                                <div style="font-weight: 500; color: var(--text);" id="font-size-label">Стандартный</div>
                                <div style="font-size: 13px; color: var(--text-secondary;" id="font-size-value">16px</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="font-size-btn" id="decrease-font" style="width: 40px; height: 40px; border: 1px solid var(--border); background: var(--card); border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); font-size: 18px; font-weight: bold;">
                                -
                            </button>
                            <button class="font-size-btn" id="increase-font" style="width: 40px; height: 40px; border: 1px solid var(--border); background: var(--card); border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); font-size: 18px; font-weight: bold;">
                                +
                            </button>
                        </div>
                    </div>
                    
                    <!-- Предпросмотр текста -->
                    <div style="margin-top: 16px; padding: 16px; background: var(--bg); border-radius: 12px; border-left: 4px solid var(--primary);">
                        <div style="font-size: 16px; color: var(--text); line-height: 1.4;" id="font-preview">
                            Пример текста для предпросмотра размера шрифта
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="modal-actions" style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="btn btn-secondary" id="cancel-theme-settings" style="flex: 1; padding: 12px; border: 1px solid var(--border); background: var(--bg); border-radius: 8px; color: var(--text); cursor: pointer; font-weight: 500;">Отмена</button>
                <button class="btn btn-primary" id="save-theme-settings" style="flex: 1; padding: 12px; border: none; background: var(--primary); border-radius: 8px; color: white; cursor: pointer; font-weight: 500;">Сохранить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // ТЕКУЩИЕ НАСТРОЙКИ
    let currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    let currentFontSize = 16;
    
    // ЭЛЕМЕНТЫ
    const themeSwitch = modal.querySelector('.theme-switch');
    const themeSwitchCircle = themeSwitch.querySelector('div');
    const decreaseBtn = modal.querySelector('#decrease-font');
    const increaseBtn = modal.querySelector('#increase-font');
    const fontSizeLabel = modal.querySelector('#font-size-label');
    const fontSizeValue = modal.querySelector('#font-size-value');
    const fontPreview = modal.querySelector('#font-preview');
    
    // ИНИЦИАЛИЗАЦИЯ ТЕМЫ
    function updateThemeSwitch() {
        if (currentTheme === 'dark') {
            themeSwitch.style.background = '#4CAF50';
            themeSwitchCircle.style.left = '32px';
        } else {
            themeSwitch.style.background = '#ccc';
            themeSwitchCircle.style.left = '4px';
        }
    }
    
    // ИНИЦИАЛИЗАЦИЯ РАЗМЕРА ШРИФТА
    function updateFontSize() {
        const sizes = {
            '12': 'Очень мелкий',
            '13': 'Мелкий',
            '14': 'Компактный', 
            '15': 'Уменьшенный',
            '16': 'Стандартный',
            '17': 'Увеличенный',
            '18': 'Крупный',
            '19': 'Очень крупный',
            '20': 'Максимальный'
        };
        
        fontSizeLabel.textContent = sizes[currentFontSize] || 'Стандартный';
        fontSizeValue.textContent = currentFontSize + 'px';
        fontPreview.style.fontSize = currentFontSize + 'px';
        
        // Блокировка кнопок на границах
        decreaseBtn.disabled = currentFontSize <= 12;
        increaseBtn.disabled = currentFontSize >= 20;
        
        decreaseBtn.style.opacity = currentFontSize <= 12 ? '0.5' : '1';
        increaseBtn.style.opacity = currentFontSize >= 20 ? '0.5' : '1';
    }
    
    // ОБРАБОТЧИК ПЕРЕКЛЮЧАТЕЛЯ ТЕМЫ
    themeSwitch.addEventListener('click', function() {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        updateThemeSwitch();
    });
    
    // ОБРАБОТЧИКИ КНОПОК РАЗМЕРА ШРИФТА
    decreaseBtn.addEventListener('click', function() {
        if (currentFontSize > 12) {
            currentFontSize--;
            updateFontSize();
        }
    });
    
    increaseBtn.addEventListener('click', function() {
        if (currentFontSize < 20) {
            currentFontSize++;
            updateFontSize();
        }
    });
    
    // ИНИЦИАЛИЗАЦИЯ
    updateThemeSwitch();
    updateFontSize();
    
    // ОБРАБОТЧИКИ ЗАКРЫТИЯ
    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('#cancel-theme-settings').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('#save-theme-settings').addEventListener('click', () => {
        // Применяем настройки
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        // Сохраняем размер шрифта
        localStorage.setItem('messageFontSize', currentFontSize.toString());
        applyFontSizeToMessages(currentFontSize);
        
        showToast('Настройки оформления сохранены');
        modal.remove();
    });
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}