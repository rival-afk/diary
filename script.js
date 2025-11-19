// Основные переменные
let currentWeekStart = new Date();
let settings = {
    scheduleStart: '',
    scheduleEnd: '',
    semesterBreakDate: '',
    holidays: [],
    maxLessons: 8,
    theme: 'light',
    syncCode: '',
    autoSync: true,
    requestCount: 0,
    scheduleFirstHalf: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: []
    },
    scheduleSecondHalf: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: []
    }
};

// Элементы DOM
const weekRangeElement = document.getElementById('week-range');
const daysContainer = document.getElementById('days-container');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const passwordModal = document.getElementById('password-modal');
const closeSettings = document.getElementById('close-settings');
const closePassword = document.getElementById('close-password');
const settingsForm = document.getElementById('settings-form');
const holidaysContainer = document.getElementById('holidays-container');
const addHolidayBtn = document.getElementById('add-holiday');
const scheduleFirstHalfContainer = document.getElementById('schedule-first-half');
const scheduleSecondHalfContainer = document.getElementById('schedule-second-half');
const tabs = document.querySelectorAll('.tab');
const passwordInput = document.getElementById('password-input');
const submitPassword = document.getElementById('submit-password');
const passwordError = document.getElementById('password-error');
const saveSettingsBtn = document.getElementById('save-settings');
const themeToggle = document.getElementById('theme-toggle');
const syncBtn = document.getElementById('sync-btn');
const manualSyncBtn = document.getElementById('manual-sync');
const syncStatus = document.getElementById('sync-status');
const requestCountElement = document.getElementById('request-count');
const jsonbinRequestCountElement = document.getElementById('jsonbin-request-count');

// Дни недели для отображения (только рабочие дни)
const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// Предметы с подгруппами
const subjectsWithSubgroups = {
    'Трудовое обучение': 2,
    'Иностранный язык': 3
};

// Мастер-пароль
const MASTER_PASSWORD = '0245';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    applyTheme();
    setCurrentWeekToMonday();
    renderWeek();
    initScheduleInputs();
    updateRequestCount();
    
    // Назначение обработчиков событий
    prevWeekBtn.addEventListener('click', goToPreviousWeek);
    nextWeekBtn.addEventListener('click', goToNextWeek);
    settingsBtn.addEventListener('click', showPasswordModal);
    closeSettings.addEventListener('click', closeSettingsModal);
    closePassword.addEventListener('click', closePasswordModal);
    settingsForm.addEventListener('submit', saveSettings);
    addHolidayBtn.addEventListener('click', addHolidayField);
    submitPassword.addEventListener('click', checkPassword);
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });
    themeToggle.addEventListener('click', toggleTheme);
    syncBtn.addEventListener('click', manualSync);
    manualSyncBtn.addEventListener('click', manualSync);
    
    // Переключение вкладок
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', function(event) {
        if (event.target === settingsModal) {
            closeSettingsModal();
        }
        if (event.target === passwordModal) {
            closePasswordModal();
        }
    });
    
    // Автосинхронизация при загрузке
    if (settings.autoSync && settings.syncCode) {
        setTimeout(() => {
            syncData();
        }, 1000);
    }
});

// Функции для работы с неделями
function setCurrentWeekToMonday() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart = new Date(today.setDate(diff));
    currentWeekStart.setHours(0, 0, 0, 0);
}

function getWeekDates(startDate) {
    const dates = [];
    for (let i = 0; i < 5; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        dates.push(date);
    }
    return dates;
}

function formatDate(date) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('ru-RU', options);
}

function formatDateShort(date) {
    const options = { day: 'numeric', month: 'short' };
    return date.toLocaleDateString('ru-RU', options);
}

function isDateInHolidays(date) {
    return settings.holidays.some(holiday => {
        const start = new Date(holiday.start);
        const end = new Date(holiday.end);
        return date >= start && date <= end;
    });
}

function isWeekInHolidays(weekStart) {
    const weekDates = getWeekDates(weekStart);
    return weekDates.some(date => isDateInHolidays(date));
}

function goToPreviousWeek() {
    let newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    
    while (isWeekInHolidays(newWeekStart)) {
        newWeekStart.setDate(newWeekStart.getDate() - 7);
    }
    
    currentWeekStart = newWeekStart;
    renderWeek();
}

function goToNextWeek() {
    let newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    
    while (isWeekInHolidays(newWeekStart)) {
        newWeekStart.setDate(newWeekStart.getDate() + 7);
    }
    
    currentWeekStart = newWeekStart;
    renderWeek();
}

// Функции для работы с расписанием
function getScheduleForDate(date) {
    if (!settings.semesterBreakDate) return [];
    
    const semesterBreak = new Date(settings.semesterBreakDate);
    const dayOfWeek = dayKeys[date.getDay() === 0 ? 6 : date.getDay() - 1];
    
    if (date < semesterBreak) {
        return settings.scheduleFirstHalf[dayOfWeek] || [];
    } else {
        return settings.scheduleSecondHalf[dayOfWeek] || [];
    }
}

// Функции для рендеринга
function renderWeek() {
    const weekDates = getWeekDates(currentWeekStart);
    const startDate = weekDates[0];
    const endDate = weekDates[4];
    
    weekRangeElement.textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;
    
    daysContainer.innerHTML = '';
    
    weekDates.forEach((date, index) => {
        const dayElement = document.createElement('div');
        dayElement.className = 'day';
        
        if (isDateInHolidays(date)) {
            dayElement.classList.add('holiday');
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date.getTime() === today.getTime()) {
            dayElement.classList.add('current-day');
        }
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = `${dayNames[index]}, ${formatDateShort(date)}`;
        
        const lessonsContainer = document.createElement('div');
        lessonsContainer.className = 'lessons-container';
        
        const schedule = getScheduleForDate(date);
        
        for (let i = 0; i < settings.maxLessons; i++) {
            const lessonRow = document.createElement('div');
            lessonRow.className = 'lesson-row';
            
            const lessonNumber = document.createElement('div');
            lessonNumber.className = 'lesson-number';
            lessonNumber.textContent = `Урок ${i + 1}`;
            
            const lessonName = document.createElement('div');
            lessonName.className = 'lesson-name';
            
            let lessonText = schedule[i] || '';
            if (lessonText && typeof lessonText === 'object') {
                lessonName.textContent = `${lessonText.subject}${lessonText.subgroup ? ` (${lessonText.subgroup} группа)` : ''}`;
            } else {
                lessonName.textContent = lessonText;
            }
            
            const homeworkInput = document.createElement('textarea');
            homeworkInput.className = 'homework-input';
            homeworkInput.placeholder = 'Домашнее задание...';
            
            const dateKey = date.toISOString().split('T')[0];
            const lessonKey = `${dateKey}-lesson-${i}`;
            homeworkInput.value = loadHomework(lessonKey) || '';
            
            homeworkInput.addEventListener('input', function() {
                saveHomework(lessonKey, homeworkInput.value);
                if (settings.autoSync && settings.syncCode) {
                    setTimeout(syncData, 1000);
                }
            });
            
            lessonRow.appendChild(lessonNumber);
            lessonRow.appendChild(lessonName);
            lessonRow.appendChild(homeworkInput);
            lessonsContainer.appendChild(lessonRow);
        }
        
        dayElement.appendChild(dayHeader);
        dayElement.appendChild(lessonsContainer);
        daysContainer.appendChild(dayElement);
    });
}

// Функции для работы с настройками
function showPasswordModal() {
    passwordModal.style.display = 'flex';
    passwordInput.value = '';
    passwordError.style.display = 'none';
    passwordInput.focus();
}

function closePasswordModal() {
    passwordModal.style.display = 'none';
}

function checkPassword() {
    if (passwordInput.value === MASTER_PASSWORD) {
        closePasswordModal();
        openSettings();
    } else {
        passwordError.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function openSettings() {
    document.getElementById('schedule-start').value = settings.scheduleStart;
    document.getElementById('schedule-end').value = settings.scheduleEnd;
    document.getElementById('semester-break-date').value = settings.semesterBreakDate;
    document.getElementById('max-lessons').value = settings.maxLessons;
    document.getElementById('sync-code').value = settings.syncCode;
    document.getElementById('auto-sync').checked = settings.autoSync;
    
    holidaysContainer.innerHTML = '';
    
    settings.holidays.forEach((holiday, index) => {
        addHolidayField(holiday.start, holiday.end, index);
    });
    
    if (settings.holidays.length === 0) {
        addHolidayField();
    }
    
    fillScheduleInputs();
    
    settingsModal.style.display = 'flex';
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
}

function switchTab(tabId) {
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

function initScheduleInputs() {
    dayNames.forEach((dayName, index) => {
        const dayKey = dayKeys[index];
        
        const scheduleDayFirst = document.createElement('div');
        scheduleDayFirst.className = 'schedule-day';
        
        const dayTitleFirst = document.createElement('div');
        dayTitleFirst.className = 'schedule-day-title';
        dayTitleFirst.textContent = dayName;
        
        const lessonsContainerFirst = document.createElement('div');
        lessonsContainerFirst.className = 'lessons-container';
        
        for (let i = 0; i < settings.maxLessons; i++) {
            const lessonInput = document.createElement('div');
            lessonInput.className = 'lesson-input';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Урок ${i+1}`;
            input.dataset.day = dayKey;
            input.dataset.lesson = i;
            input.dataset.semester = 'first';
            
            const subgroupSelect = document.createElement('select');
            subgroupSelect.dataset.day = dayKey;
            subgroupSelect.dataset.lesson = i;
            subgroupSelect.dataset.semester = 'first';
            
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Нет подгруппы';
            subgroupSelect.appendChild(defaultOption);
            
            input.addEventListener('input', function() {
                updateSubgroupSelect(this, subgroupSelect);
            });
            
            lessonsContainerFirst.appendChild(lessonInput);
            lessonInput.appendChild(input);
            lessonInput.appendChild(subgroupSelect);
        }
        
        scheduleDayFirst.appendChild(dayTitleFirst);
        scheduleDayFirst.appendChild(lessonsContainerFirst);
        scheduleFirstHalfContainer.appendChild(scheduleDayFirst);
        
        const scheduleDaySecond = document.createElement('div');
        scheduleDaySecond.className = 'schedule-day';
        
        const dayTitleSecond = document.createElement('div');
        dayTitleSecond.className = 'schedule-day-title';
        dayTitleSecond.textContent = dayName;
        
        const lessonsContainerSecond = document.createElement('div');
        lessonsContainerSecond.className = 'lessons-container';
        
        for (let i = 0; i < settings.maxLessons; i++) {
            const lessonInput = document.createElement('div');
            lessonInput.className = 'lesson-input';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Урок ${i+1}`;
            input.dataset.day = dayKey;
            input.dataset.lesson = i;
            input.dataset.semester = 'second';
            
            const subgroupSelect = document.createElement('select');
            subgroupSelect.dataset.day = dayKey;
            subgroupSelect.dataset.lesson = i;
            subgroupSelect.dataset.semester = 'second';
            
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Нет подгруппы';
            subgroupSelect.appendChild(defaultOption);
            
            input.addEventListener('input', function() {
                updateSubgroupSelect(this, subgroupSelect);
            });
            
            lessonsContainerSecond.appendChild(lessonInput);
            lessonInput.appendChild(input);
            lessonInput.appendChild(subgroupSelect);
        }
        
        scheduleDaySecond.appendChild(dayTitleSecond);
        scheduleDaySecond.appendChild(lessonsContainerSecond);
        scheduleSecondHalfContainer.appendChild(scheduleDaySecond);
    });
}

function updateSubgroupSelect(inputElement, selectElement) {
    const subject = inputElement.value.trim();
    
    while (selectElement.children.length > 1) {
        selectElement.removeChild(selectElement.lastChild);
    }
    
    if (subjectsWithSubgroups.hasOwnProperty(subject)) {
        const subgroupsCount = subjectsWithSubgroups[subject];
        
        for (let i = 1; i <= subgroupsCount; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} группа`;
            selectElement.appendChild(option);
        }
        
        selectElement.style.display = 'block';
    } else {
        selectElement.style.display = 'none';
    }
}

function fillScheduleInputs() {
    dayKeys.forEach(dayKey => {
        const lessons = settings.scheduleFirstHalf[dayKey] || [];
        for (let i = 0; i < settings.maxLessons; i++) {
            const input = document.querySelector(`input[data-day="${dayKey}"][data-lesson="${i}"][data-semester="first"]`);
            const select = document.querySelector(`select[data-day="${dayKey}"][data-lesson="${i}"][data-semester="first"]`);
            
            if (input && select) {
                const lesson = lessons[i];
                if (lesson && typeof lesson === 'object') {
                    input.value = lesson.subject || '';
                    
                    if (lesson.subject && subjectsWithSubgroups.hasOwnProperty(lesson.subject)) {
                        updateSubgroupSelect(input, select);
                        select.value = lesson.subgroup || '';
                        select.style.display = 'block';
                    } else {
                        select.style.display = 'none';
                    }
                } else {
                    input.value = lesson || '';
                    select.style.display = 'none';
                }
            }
        }
    });
    
    dayKeys.forEach(dayKey => {
        const lessons = settings.scheduleSecondHalf[dayKey] || [];
        for (let i = 0; i < settings.maxLessons; i++) {
            const input = document.querySelector(`input[data-day="${dayKey}"][data-lesson="${i}"][data-semester="second"]`);
            const select = document.querySelector(`select[data-day="${dayKey}"][data-lesson="${i}"][data-semester="second"]`);
            
            if (input && select) {
                const lesson = lessons[i];
                if (lesson && typeof lesson === 'object') {
                    input.value = lesson.subject || '';
                    
                    if (lesson.subject && subjectsWithSubgroups.hasOwnProperty(lesson.subject)) {
                        updateSubgroupSelect(input, select);
                        select.value = lesson.subgroup || '';
                        select.style.display = 'block';
                    } else {
                        select.style.display = 'none';
                    }
                } else {
                    input.value = lesson || '';
                    select.style.display = 'none';
                }
            }
        }
    });
}

function addHolidayField(start = '', end = '', index = null) {
    const holidayItem = document.createElement('div');
    holidayItem.className = 'holiday-item';
    
    const startInput = document.createElement('input');
    startInput.type = 'date';
    startInput.placeholder = 'Начало';
    startInput.value = start;
    
    const endInput = document.createElement('input');
    endInput.type = 'date';
    endInput.placeholder = 'Конец';
    endInput.value = end;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', function() {
        holidayItem.remove();
    });
    
    holidayItem.appendChild(startInput);
    holidayItem.appendChild(endInput);
    holidayItem.appendChild(removeBtn);
    
    holidaysContainer.appendChild(holidayItem);
}

function saveSettings(event) {
    event.preventDefault();
    
    saveSettingsBtn.textContent = 'Сохранение...';
    saveSettingsBtn.classList.add('saving');
    saveSettingsBtn.disabled = true;
    
    settings.scheduleStart = document.getElementById('schedule-start').value;
    settings.scheduleEnd = document.getElementById('schedule-end').value;
    settings.semesterBreakDate = document.getElementById('semester-break-date').value;
    settings.maxLessons = parseInt(document.getElementById('max-lessons').value);
    settings.syncCode = document.getElementById('sync-code').value;
    settings.autoSync = document.getElementById('auto-sync').checked;
    
    settings.holidays = [];
    const holidayItems = holidaysContainer.querySelectorAll('.holiday-item');
    
    holidayItems.forEach(item => {
        const startInput = item.querySelector('input[type="date"]:first-child');
        const endInput = item.querySelector('input[type="date"]:last-child');
        
        if (startInput.value && endInput.value) {
            settings.holidays.push({
                start: startInput.value,
                end: endInput.value
            });
        }
    });
    
    dayKeys.forEach(dayKey => {
        settings.scheduleFirstHalf[dayKey] = [];
        for (let i = 0; i < settings.maxLessons; i++) {
            const input = document.querySelector(`input[data-day="${dayKey}"][data-lesson="${i}"][data-semester="first"]`);
            const select = document.querySelector(`select[data-day="${dayKey}"][data-lesson="${i}"][data-semester="first"]`);
            
            if (input && input.value) {
                const subject = input.value.trim();
                
                if (subjectsWithSubgroups.hasOwnProperty(subject) && select && select.value) {
                    settings.scheduleFirstHalf[dayKey].push({
                        subject: subject,
                        subgroup: parseInt(select.value)
                    });
                } else {
                    settings.scheduleFirstHalf[dayKey].push(subject);
                }
            }
        }
    });
    
    dayKeys.forEach(dayKey => {
        settings.scheduleSecondHalf[dayKey] = [];
        for (let i = 0; i < settings.maxLessons; i++) {
            const input = document.querySelector(`input[data-day="${dayKey}"][data-lesson="${i}"][data-semester="second"]`);
            const select = document.querySelector(`select[data-day="${dayKey}"][data-lesson="${i}"][data-semester="second"]`);
            
            if (input && input.value) {
                const subject = input.value.trim();
                
                if (subjectsWithSubgroups.hasOwnProperty(subject) && select && select.value) {
                    settings.scheduleSecondHalf[dayKey].push({
                        subject: subject,
                        subgroup: parseInt(select.value)
                    });
                } else {
                    settings.scheduleSecondHalf[dayKey].push(subject);
                }
            }
        }
    });
    
    saveSettingsToLocal();
    
    setTimeout(() => {
        saveSettingsBtn.textContent = 'Настройки сохранены!';
        saveSettingsBtn.classList.remove('saving');
        saveSettingsBtn.classList.add('saved');
        
        setTimeout(() => {
            saveSettingsBtn.textContent = 'Сохранить настройки';
            saveSettingsBtn.classList.remove('saved');
            saveSettingsBtn.disabled = false;
            
            closeSettingsModal();
            renderWeek();
            
            if (settings.autoSync && settings.syncCode) {
                syncData();
            }
        }, 1000);
    }, 500);
}

// Функции для работы с темами
function toggleTheme() {
    settings.theme = settings.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    updateThemeButtonText();
    saveSettingsToLocal();
}

function updateThemeButtonText() {
    themeToggle.textContent = settings.theme === 'light' ? 'Тёмная тема' : 'Светлая тема';
}

function applyTheme() {
    document.body.className = `${settings.theme}-theme`;
}

// Функции для работы с localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('diarySettings');
    if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        settings = { ...settings, ...parsedSettings };
    }
    
    const currentYear = new Date().getFullYear();
    if (!settings.scheduleStart) {
        settings.scheduleStart = `${currentYear}-09-01`;
    }
    if (!settings.scheduleEnd) {
        settings.scheduleEnd = `${currentYear+1}-05-31`;
    }
    if (!settings.semesterBreakDate) {
        settings.semesterBreakDate = `${currentYear+1}-01-10`;
    }
    
    // АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ ПРИ ЗАГРУЗКЕ
    setTimeout(() => {
        syncData();
    }, 1500);
    
    updateThemeButtonText();
}
function saveSettingsToLocal() {
    localStorage.setItem('diarySettings', JSON.stringify(settings));
}

function saveHomework(key, homework) {
    const homeworks = JSON.parse(localStorage.getItem('diaryHomeworks') || '{}');
    homeworks[key] = homework;
    localStorage.setItem('diaryHomeworks', JSON.stringify(homeworks));
}

function loadHomework(key) {
    const homeworks = JSON.parse(localStorage.getItem('diaryHomeworks') || '{}');
    return homeworks[key];
}

// Функции для синхронизации
function manualSync() {
    if (!settings.syncCode) {
        alert('Сначала установите код синхронизации в настройках');
        showPasswordModal();
        return;
    }
    
    syncData();
}

function updateRequestCount() {
    if (requestCountElement) {
        requestCountElement.textContent = settings.requestCount;
    }
    if (jsonbinRequestCountElement) {
        jsonbinRequestCountElement.textContent = settings.requestCount;
    }
}

function incrementRequestCount() {
    settings.requestCount++;
    saveSettingsToLocal();
    updateRequestCount();
    }
