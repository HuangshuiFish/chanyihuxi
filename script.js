// 禅意呼吸 - 宫缩伴侣应用 JavaScript 逻辑

// DOM 元素获取
const appContainer = document.getElementById('appContainer');
const contractionBtn = document.getElementById('contractionBtn');
const contractionBtnText = document.getElementById('contractionBtnText');
const contractionStatus = document.getElementById('contractionStatus');
const historyBtn = document.getElementById('historyBtn');
const historyModal = document.getElementById('historyModal');
const closeHistoryModal = document.getElementById('closeHistoryModal');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const hospitalModal = document.getElementById('hospitalModal');
const cancelHospitalBtn = document.getElementById('cancelHospitalBtn');
const confirmHospitalBtn = document.getElementById('confirmHospitalBtn');

// 应用状态管理
let appState = {
    isRecording: false,          // 是否正在记录宫缩
    lastContractionStart: null,  // 上一次宫缩开始时间
    contractionHistory: [],      // 宫缩历史记录
    warningLevel: 0,             // 预警等级：0-正常，1-黄色提醒，2-红色警报
    // 新增呼吸相关状态
    isBreathing: false,          // 是否正在进行呼吸引导
    breathingPhase: 'inhale',    // 当前呼吸阶段：'inhale' | 'exhale'
    breathingCycle: 0,           // 当前呼吸周期计数
    breathingTimer: null,        // 呼吸总计时器
    phaseTimer: null,            // 呼吸阶段计时器
    breathingSettings: {         // 呼吸设置
        inhaleTime: 4000,        // 吸气时长（毫秒）
        exhaleTime: 6000,        // 呼气时长（毫秒）
        enabled: true            // 是否启用呼吸辅助
    }
};

// 常量定义
const STORAGE_KEY = 'zen_breathing_contractions';
const WARNING_511_THRESHOLD = 6;   // 5-1-1标准判定的宫缩次数阈值：6次
const WARNING_511_INTERVAL = 5 * 60 * 1000;  // 5-1-1标准：间隔≤5分钟
const WARNING_511_DURATION = 60 * 1000;       // 5-1-1标准：持续≥1分钟

// 呼吸辅助相关常量
const BREATHING_INHALE_TIME = 4000;      // 吸气时长：4秒
const BREATHING_EXHALE_TIME_SHORT = 6000; // 短呼气时长：6秒
const BREATHING_EXHALE_TIME_LONG = 8000;  // 长呼气时长：8秒
const BREATHING_TRANSITION_TIME = 500;    // 呼吸阶段过渡时间

// 初始化应用
function initApp() {
    // 从本地存储加载历史数据
    loadHistoryData();
    
    // 加载呼吸设置
    loadBreathingSettings();
    
    // 初始化事件监听
    initEventListeners();
    
    // 更新历史记录显示
    updateHistoryDisplay();
    
    // 检查是否需要显示预警
    checkWarningLevel();
}

// 从本地存储加载历史数据
function loadHistoryData() {
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            appState.contractionHistory = JSON.parse(storedData);
        }
    } catch (error) {
        console.error('加载历史数据失败:', error);
        appState.contractionHistory = [];
    }
}

// 保存数据到本地存储
function saveHistoryData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.contractionHistory));
    } catch (error) {
        console.error('保存历史数据失败:', error);
    }
}

// 初始化事件监听
function initEventListeners() {
    // 宫缩记录按钮
    contractionBtn.addEventListener('click', toggleContractionRecording);
    
    // 历史记录按钮
    historyBtn.addEventListener('click', openHistoryModal);
    closeHistoryModal.addEventListener('click', closeHistoryModalHandler);
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // 医院提醒模态框
    cancelHospitalBtn.addEventListener('click', closeHospitalModal);
    confirmHospitalBtn.addEventListener('click', confirmHospital);
    
    // 呼吸设置按钮
    document.getElementById('breathingSettingsBtn').addEventListener('click', openBreathingSettingsModal);
    document.getElementById('closeBreathingSettingsModal').addEventListener('click', closeBreathingSettingsModal);
    document.getElementById('saveBreathingSettings').addEventListener('click', saveBreathingSettings);
    document.getElementById('resetBreathingSettings').addEventListener('click', resetBreathingSettings);
    
    // 呼吸时间调节按钮
    document.getElementById('inhaleDecrease').addEventListener('click', () => adjustBreathingTime('inhale', -1));
    document.getElementById('inhaleIncrease').addEventListener('click', () => adjustBreathingTime('inhale', 1));
    document.getElementById('exhaleDecrease').addEventListener('click', () => adjustBreathingTime('exhale', -1));
    document.getElementById('exhaleIncrease').addEventListener('click', () => adjustBreathingTime('exhale', 1));
    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            closeHistoryModalHandler();
        }
        if (e.target === document.getElementById('breathingSettingsModal')) {
            closeBreathingSettingsModal();
        }
    });
    
    // 键盘事件监听（ESC关闭模态框）
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeHistoryModalHandler();
            closeHospitalModal();
            closeBreathingSettingsModal();
        }
    });
}

// 宫缩记录功能
function toggleContractionRecording() {
    if (!appState.isRecording) {
        // 开始记录宫缩
        startContraction();
    } else {
        // 结束记录宫缩
        endContraction();
    }
}

// 开始记录宫缩
function startContraction() {
    appState.isRecording = true;
    appState.lastContractionStart = Date.now();
    
    // 更新UI
    contractionBtn.classList.add('active');
    contractionBtnText.textContent = '不疼了点一下';
    contractionStatus.textContent = '正在记录宫缩...';
    
    // 启动呼吸引导
    if (appState.breathingSettings.enabled) {
        setTimeout(() => {
            startBreathingGuide();
        }, 1000); // 延迟1秒启动，让用户适应
    }
}

// 结束记录宫缩
function endContraction() {
    appState.isRecording = false;
    const endTime = Date.now();
    const duration = endTime - appState.lastContractionStart;
    
    // 停止呼吸引导
    stopBreathingGuide();
    
    // 计算间隔时间（与上一次宫缩的间隔）
    const lastContraction = appState.contractionHistory[appState.contractionHistory.length - 1];
    const interval = lastContraction ? appState.lastContractionStart - lastContraction.endTime : 0;
    
    // 创建宫缩记录对象
    const contractionRecord = {
        id: Date.now().toString(),
        startTime: appState.lastContractionStart,
        endTime: endTime,
        duration: duration,
        interval: interval
    };
    
    // 添加到历史记录
    appState.contractionHistory.push(contractionRecord);
    
    // 保存到本地存储
    saveHistoryData();
    
    // 更新UI
    contractionBtn.classList.remove('active');
    contractionBtnText.textContent = '疼了点一下';
    contractionStatus.textContent = `宫缩持续了 ${formatDuration(duration)}`;
    
    // 更新历史记录显示
    updateHistoryDisplay();
    
    // 检查是否需要显示预警
    checkWarningLevel();
}

// 智能分析与提醒功能
function checkWarningLevel() {
    const history = appState.contractionHistory;
    if (history.length < WARNING_511_THRESHOLD) {
        // 记录不足，不触发预警
        setWarningLevel(0);
        return;
    }
    
    // 获取最近的6次宫缩记录
    const recentContractions = history.slice(-WARNING_511_THRESHOLD);
    
    // 检查是否符合5-1-1标准
    const meets511Standard = recentContractions.every((contraction, index, array) => {
        // 检查持续时间≥1分钟
        if (contraction.duration < WARNING_511_DURATION) {
            return false;
        }
        
        // 检查间隔时间≤5分钟（除了第一次记录）
        if (index > 0) {
            const prevContraction = array[index - 1];
            const interval = contraction.startTime - prevContraction.endTime;
            if (interval > WARNING_511_INTERVAL) {
                return false;
            }
        }
        
        return true;
    });
    
    // 检查持续时间是否≥1小时
    const firstRecent = recentContractions[0];
    const lastRecent = recentContractions[recentContractions.length - 1];
    const durationHours = (lastRecent.endTime - firstRecent.startTime) / (60 * 60 * 1000);
    
    if (meets511Standard && durationHours >= 1) {
        // 达到5-1-1标准，触发红色警报
        setWarningLevel(2);
        showHospitalAlert();
        // 触发震动提醒
        triggerVibration();
    } else if (history.length >= 3) {
        // 检查是否接近5-1-1标准
        const nearStandard = recentContractions.slice(-3).every(contraction => {
            return contraction.duration >= WARNING_511_DURATION * 0.8 ||
                   (contraction.interval > 0 && contraction.interval <= WARNING_511_INTERVAL * 1.2);
        });
        
        if (nearStandard) {
            // 接近标准，触发黄色提醒
            setWarningLevel(1);
        } else {
            // 正常状态
            setWarningLevel(0);
        }
    } else {
        // 正常状态
        setWarningLevel(0);
    }
}

// 设置预警等级
function setWarningLevel(level) {
    appState.warningLevel = level;
    
    // 移除所有预警类
    appContainer.classList.remove('warning-level-1', 'warning-level-2');
    
    // 添加对应等级的预警类
    if (level === 1) {
        appContainer.classList.add('warning-level-1');
    } else if (level === 2) {
        appContainer.classList.add('warning-level-2');
    }
}

// 显示医院提醒模态框
function showHospitalAlert() {
    hospitalModal.classList.add('show');
}

// 关闭医院提醒模态框
function closeHospitalModal() {
    hospitalModal.classList.remove('show');
}

// 确认医院提醒
function confirmHospital() {
    closeHospitalModal();
    // 这里可以添加拨打急救电话的逻辑，或者其他操作
    alert('已确认，建议立即前往医院！');
}

// 触发震动提醒
function triggerVibration() {
    if ('vibrate' in navigator) {
        navigator.vibrate(3000); // 震动3秒
    }
}

// 历史记录功能
function openHistoryModal() {
    updateHistoryDisplay();
    historyModal.classList.add('show');
}

function closeHistoryModalHandler() {
    historyModal.classList.remove('show');
}

// 更新历史记录显示
function updateHistoryDisplay() {
    if (appState.contractionHistory.length === 0) {
        historyList.innerHTML = '<div class="no-history">暂无宫缩记录</div>';
        return;
    }
    
    // 按时间倒序显示（最新的在最前面）
    const sortedHistory = [...appState.contractionHistory].reverse();
    
    historyList.innerHTML = sortedHistory.map(record => `
        <div class="history-item">
            <div class="history-item-time">
                ${formatDateTime(record.startTime)} - ${formatDateTime(record.endTime)}
            </div>
            <div class="history-item-details">
                <div class="history-item-duration">
                    <span class="history-item-label">持续时间</span>
                    <span class="history-item-value">${formatDuration(record.duration)}</span>
                </div>
                ${record.interval > 0 ? `
                <div class="history-item-interval">
                    <span class="history-item-label">间隔时间</span>
                    <span class="history-item-value">${formatDuration(record.interval)}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 清空历史记录
function clearHistory() {
    if (confirm('确定要清空所有宫缩记录吗？此操作不可恢复。')) {
        appState.contractionHistory = [];
        saveHistoryData();
        updateHistoryDisplay();
        setWarningLevel(0);
    }
}

// 工具函数：格式化时间
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 工具函数：格式化时长（毫秒转人性化时间显示）
function formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    
    const seconds = totalSeconds % 60;
    const minutes = totalMinutes % 60;
    const hours = totalHours % 24;
    
    // 大于等于1天：显示"X天Y小时"
    if (totalDays >= 1) {
        if (hours > 0) {
            return `${totalDays}天${hours}小时`;
        } else {
            return `${totalDays}天`;
        }
    }
    
    // 大于等于1小时：显示"X小时Y分钟"
    if (totalHours >= 1) {
        if (minutes > 0) {
            return `${totalHours}小时${minutes}分钟`;
        } else {
            return `${totalHours}小时`;
        }
    }
    
    // 小于1小时：显示"X分Y秒"
    if (totalMinutes > 0) {
        return `${totalMinutes}分${seconds}秒`;
    } else {
        return `${seconds}秒`;
    }
}

// 初始化应用
initApp();

// 呼吸辅助功能实现

// 开始呼吸引导
function startBreathingGuide() {
    if (!appState.breathingSettings.enabled || appState.isBreathing) {
        return;
    }
    
    appState.isBreathing = true;
    appState.breathingCycle = 0;
    appState.breathingPhase = 'inhale';
    
    // 添加呼吸样式类
    contractionBtn.classList.add('breathing');
    
    // 显示呼吸引导元素
    document.getElementById('breathingInstruction').classList.add('show');
    document.getElementById('breathingCounter').style.display = 'block';
    
    // 开始第一个呼吸周期
    startBreathingCycle();
}

// 停止呼吸引导
function stopBreathingGuide() {
    if (!appState.isBreathing) {
        return;
    }
    
    appState.isBreathing = false;
    
    // 清理计时器
    if (appState.breathingTimer) {
        clearTimeout(appState.breathingTimer);
        appState.breathingTimer = null;
    }
    if (appState.phaseTimer) {
        clearTimeout(appState.phaseTimer);
        appState.phaseTimer = null;
    }
    
    // 移除呼吸样式类
    contractionBtn.classList.remove('breathing', 'inhale', 'exhale');
    
    // 隐藏呼吸引导元素
    document.getElementById('breathingInstruction').classList.remove('show');
    document.getElementById('breathingCounter').style.display = 'none';
}

// 开始呼吸周期
function startBreathingCycle() {
    if (!appState.isBreathing) return;
    
    // 开始吸气阶段
    startInhalePhase();
}

// 吸气阶段
function startInhalePhase() {
    appState.breathingPhase = 'inhale';
    contractionBtn.classList.remove('exhale');
    contractionBtn.classList.add('inhale');
    
    document.getElementById('breathingInstruction').textContent = '深吸气';
    
    const inhaleSeconds = appState.breathingSettings.inhaleTime / 1000;
    
    // 倒计时显示 - 从设定秒数开始倒数到1
    let countdown = inhaleSeconds;
    document.getElementById('breathingCounter').textContent = countdown;
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            document.getElementById('breathingCounter').textContent = countdown;
        } else {
            document.getElementById('breathingCounter').textContent = '0';
            clearInterval(countdownInterval);
        }
    }, 1000);
    
    // 根据设定时间切换到呼气阶段
    appState.phaseTimer = setTimeout(() => {
        if (appState.isBreathing) {
            startExhalePhase();
        }
    }, appState.breathingSettings.inhaleTime);
}

// 呼气阶段
function startExhalePhase() {
    appState.breathingPhase = 'exhale';
    contractionBtn.classList.remove('inhale');
    contractionBtn.classList.add('exhale');
    
    document.getElementById('breathingInstruction').textContent = '慢呼气';
    
    const exhaleTime = appState.breathingSettings.exhaleTime;
    const countdownSeconds = exhaleTime / 1000;
    
    // 倒计时显示 - 从设定秒数开始倒数到1
    let countdown = countdownSeconds;
    document.getElementById('breathingCounter').textContent = countdown;
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            document.getElementById('breathingCounter').textContent = countdown;
        } else {
            document.getElementById('breathingCounter').textContent = '0';
            clearInterval(countdownInterval);
        }
    }, 1000);
    
    // 呼气时间结束后开始下一个周期
    appState.phaseTimer = setTimeout(() => {
        if (appState.isBreathing) {
            appState.breathingCycle++;
            startBreathingCycle();
        }
    }, exhaleTime);
}

// 呼吸设置功能

// 打开呼吸设置模态框
function openBreathingSettingsModal() {
    document.getElementById('breathingSettingsModal').classList.add('show');
    // 加载当前设置
    document.getElementById('breathingEnabled').checked = appState.breathingSettings.enabled;
    document.getElementById('inhaleTime').textContent = appState.breathingSettings.inhaleTime / 1000;
    document.getElementById('exhaleTime').textContent = appState.breathingSettings.exhaleTime / 1000;
}

// 关闭呼吸设置模态框
function closeBreathingSettingsModal() {
    document.getElementById('breathingSettingsModal').classList.remove('show');
}

// 调节呼吸时间
function adjustBreathingTime(type, delta) {
    const minTime = 2; // 最小2秒
    const maxTime = type === 'inhale' ? 8 : 12; // 吸气最大8秒，呼气最大12秒
    
    let currentTime;
    if (type === 'inhale') {
        currentTime = appState.breathingSettings.inhaleTime / 1000;
        currentTime = Math.max(minTime, Math.min(maxTime, currentTime + delta));
        appState.breathingSettings.inhaleTime = currentTime * 1000;
        document.getElementById('inhaleTime').textContent = currentTime;
    } else {
        currentTime = appState.breathingSettings.exhaleTime / 1000;
        currentTime = Math.max(minTime, Math.min(maxTime, currentTime + delta));
        appState.breathingSettings.exhaleTime = currentTime * 1000;
        document.getElementById('exhaleTime').textContent = currentTime;
    }
    
    // 更新CSS动画时间
    updateBreathingAnimationTiming();
}

// 更新呼吸动画时间
function updateBreathingAnimationTiming() {
    const inhaleSeconds = appState.breathingSettings.inhaleTime / 1000;
    const exhaleSeconds = appState.breathingSettings.exhaleTime / 1000;
    
    // 动态更新CSS变量
    document.documentElement.style.setProperty('--inhale-time', `${inhaleSeconds}s`);
    document.documentElement.style.setProperty('--exhale-time', `${exhaleSeconds}s`);
}

// 重置呼吸设置
function resetBreathingSettings() {
    appState.breathingSettings.inhaleTime = 4000;
    appState.breathingSettings.exhaleTime = 6000;
    appState.breathingSettings.enabled = true;
    
    // 更新UI显示
    document.getElementById('breathingEnabled').checked = true;
    document.getElementById('inhaleTime').textContent = '4';
    document.getElementById('exhaleTime').textContent = '6';
    
    // 更新动画时间
    updateBreathingAnimationTiming();
    
    alert('已恢复默认设置（吸气4秒，呼气6秒）');
}

// 保存呼吸设置
function saveBreathingSettings() {
    appState.breathingSettings.enabled = document.getElementById('breathingEnabled').checked;
    
    // 保存到本地存储
    localStorage.setItem('zen_breathing_settings', JSON.stringify(appState.breathingSettings));
    
    // 更新动画时间
    updateBreathingAnimationTiming();
    
    closeBreathingSettingsModal();
    alert('设置已保存');
}

// 加载呼吸设置
function loadBreathingSettings() {
    try {
        const storedSettings = localStorage.getItem('zen_breathing_settings');
        if (storedSettings) {
            const settings = JSON.parse(storedSettings);
            appState.breathingSettings.enabled = settings.enabled !== undefined ? settings.enabled : true;
            appState.breathingSettings.inhaleTime = settings.inhaleTime || 4000;
            appState.breathingSettings.exhaleTime = settings.exhaleTime || 6000;
        }
    } catch (error) {
        console.error('加载呼吸设置失败:', error);
        // 使用默认设置
        appState.breathingSettings.enabled = true;
        appState.breathingSettings.inhaleTime = 4000;
        appState.breathingSettings.exhaleTime = 6000;
    }
    
    // 初始化动画时间
    updateBreathingAnimationTiming();
}
