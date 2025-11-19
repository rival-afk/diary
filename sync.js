// Функции для синхронизации данных между устройствами
// Используем JSONBin.io для хранения данных

// Конфигурация JSONBin
const JSONBIN_API_URL = 'https://api.jsonbin.io/v3/b';
const JSONBIN_MASTER_KEY = '$2a$10$D65ibXCWZMetfiNll7WDgeZ3DaELi3Ax2Jz7jh9HIBSiQqUmdkpgG';

// ОБЩИЙ КОД СИНХРОНИЗАЦИИ ДЛЯ ВСЕГО КЛАССА
const COMMON_SYNC_CODE = 'class_diary_2025';

// Функция синхронизации данных
async function syncData() {
    updateSyncStatus('syncing', 'Синхронизация с JSONBin...');
    
    try {
        // Получаем данные с сервера
        const remoteData = await getRemoteData(COMMON_SYNC_CODE);
        
        if (remoteData) {
            // Слияние данных: локальные данные имеют приоритет
            const mergedSettings = mergeSettings(settings, remoteData.settings);
            const mergedHomeworks = mergeHomeworks(
                JSON.parse(localStorage.getItem('diaryHomeworks') || '{}'),
                remoteData.homeworks || {}
            );
            
            // Применяем объединенные данные
            settings = mergedSettings;
            localStorage.setItem('diaryHomeworks', JSON.stringify(mergedHomeworks));
            saveSettingsToLocal();
            
            // Обновляем интерфейс
            applyTheme();
            updateThemeButtonText();
            renderWeek();
            
            // Отправляем объединенные данные обратно на сервер
            await saveRemoteData(COMMON_SYNC_CODE, {
                settings: settings,
                homeworks: mergedHomeworks,
                lastSync: new Date().toISOString()
            });
            
            updateSyncStatus('success', 'Данные синхронизированы');
        } else {
            // Если на сервере нет данных, сохраняем текущие
            await saveRemoteData(COMMON_SYNC_CODE, {
                settings: settings,
                homeworks: JSON.parse(localStorage.getItem('diaryHomeworks') || '{}'),
                lastSync: new Date().toISOString()
            });
            
            updateSyncStatus('success', 'Данные загружены на сервер');
        }
        
        incrementRequestCount();
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        updateSyncStatus('error', 'Ошибка синхронизации: ' + error.message);
    }
}

// Функция получения данных с сервера
async function getRemoteData(syncCode) {
    try {
        const response = await fetch(`${JSONBIN_API_URL}/${syncCode}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_MASTER_KEY
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.record;
        } else if (response.status === 404) {
            return null; // Данные не найдены
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        throw new Error(`Не удалось получить данные: ${error.message}`);
    }
}

// Функция сохранения данных на сервер
async function saveRemoteData(syncCode, data) {
    try {
        // Сначала проверяем, существует ли уже bin
        let binId = syncCode;
        let method = 'PUT';
        let url = `${JSONBIN_API_URL}/${binId}`;
        
        // Пытаемся обновить существующий bin
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_MASTER_KEY
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Не удалось сохранить данные: ${error.message}`);
    }
}

// Функция слияния настроек
function mergeSettings(local, remote) {
    if (!remote) return local;
    
    // Слияние с приоритетом локальных данных
    const merged = { ...remote, ...local };
    
    // Особые правила для определенных полей
    if (local.scheduleFirstHalf && Object.keys(local.scheduleFirstHalf).length > 0) {
        merged.scheduleFirstHalf = local.scheduleFirstHalf;
    }
    
    if (local.scheduleSecondHalf && Object.keys(local.scheduleSecondHalf).length > 0) {
        merged.scheduleSecondHalf = local.scheduleSecondHalf;
    }
    
    if (local.holidays && local.holidays.length > 0) {
        merged.holidays = local.holidays;
    }
    
    return merged;
}

// Функция слияния домашних заданий
function mergeHomeworks(local, remote) {
    if (!remote) return local;
    
    // Слияние с приоритетом локальных данных
    const merged = { ...remote, ...local };
    
    return merged;
}

// Функция обновления статуса синхронизации
function updateSyncStatus(type, message) {
    if (!syncStatus) return;
    
    syncStatus.textContent = message;
    syncStatus.className = 'sync-status';
    
    if (type === 'syncing') {
        syncStatus.classList.add('syncing');
    } else if (type === 'success') {
        syncStatus.classList.add('success');
    } else if (type === 'error') {
        syncStatus.classList.add('error');
    }
    
    // Автоматически скрываем статус через 5 секунд
    setTimeout(() => {
        if (syncStatus) {
            syncStatus.textContent = '';
            syncStatus.className = 'sync-status';
        }
    }, 5000);
}
