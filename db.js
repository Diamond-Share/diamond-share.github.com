// db.js - Модуль для работы с базой данных MySQL

class Database {
    constructor() {
        // Конфигурация подключения к базе данных
        this.config = {
            host: 'localhost',
            user: 'f1138033_None',
            password: '123456789',
            database: 'f1138033_None'
        };
        
        this.mysql = require('mysql');
        this.connection = null;
        this.playerId = null;
        
        this.init();
    }
    
    async init() {
        try {
            // Создаем подключение к базе данных
            this.connection = this.mysql.createConnection(this.config);
            
            // Подключаемся к базе данных
            this.connection.connect();
            
            console.log('Успешное подключение к базе данных');
            
            // Создаем таблицу, если она не существует
            await this.createTable();
            
            // Регистрируем или обновляем игрока
            await this.registerOrUpdatePlayer();
        } catch (error) {
            console.error('Ошибка подключения к базе данных:', error);
        }
    }
    
    async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS players (
                id INT AUTO_INCREMENT PRIMARY KEY,
                player_ip VARCHAR(45),
                coins BIGINT DEFAULT 1000,
                coins_per_hour INT DEFAULT 0,
                coins_per_tap INT DEFAULT 1,
                max_energy INT DEFAULT 1000,
                level INT DEFAULT 0,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        
        return new Promise((resolve, reject) => {
            this.connection.query(sql, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
    
    async getPlayerIp() {
        // В реальном приложении здесь нужно получить IP пользователя
        // Для демонстрации используем случайный IP
        return '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255);
    }
    
    async registerOrUpdatePlayer() {
        const ip = await this.getPlayerIp();
        
        // Проверяем, есть ли уже игрок с таким IP
        const existingPlayer = await this.findPlayerByIp(ip);
        
        if (existingPlayer) {
            this.playerId = existingPlayer.id;
            console.log('Игрок найден в базе данных. ID:', this.playerId);
        } else {
            // Регистрируем нового игрока
            this.playerId = await this.registerNewPlayer(ip);
            console.log('Новый игрок зарегистрирован. ID:', this.playerId);
        }
    }
    
    async findPlayerByIp(ip) {
        const sql = 'SELECT * FROM players WHERE player_ip = ? LIMIT 1';
        
        return new Promise((resolve, reject) => {
            this.connection.query(sql, [ip], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results[0] || null);
                }
            });
        });
    }
    
    async registerNewPlayer(ip) {
        const sql = 'INSERT INTO players (player_ip) VALUES (?)';
        
        return new Promise((resolve, reject) => {
            this.connection.query(sql, [ip], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.insertId);
                }
            });
        });
    }
    
    async updatePlayerData(gameData) {
        if (!this.playerId) return;
        
        const sql = `
            UPDATE players 
            SET 
                coins = ?,
                coins_per_hour = ?,
                coins_per_tap = ?,
                max_energy = ?,
                level = ?
            WHERE id = ?
        `;
        
        const params = [
            gameData.coins,
            gameData.coinsPerHour,
            gameData.coinsPerTap,
            gameData.maxEnergy,
            gameData.level,
            this.playerId
        ];
        
        return new Promise((resolve, reject) => {
            this.connection.query(sql, params, (error) => {
                if (error) {
                    console.error('Ошибка обновления данных игрока:', error);
                    reject(error);
                } else {
                    console.log('Данные игрока обновлены в базе данных');
                    resolve();
                }
            });
        });
    }
    
    close() {
        if (this.connection) {
            this.connection.end();
        }
    }
}

// Экспортируем singleton экземпляр базы данных
const dbInstance = new Database();

// Функция для обновления данных игрока
function updatePlayerInDatabase(gameData) {
    dbInstance.updatePlayerData(gameData).catch(error => {
        console.error('Ошибка при обновлении данных игрока:', error);
    });
}

// Экспортируем только функцию обновления
export { updatePlayerInDatabase };