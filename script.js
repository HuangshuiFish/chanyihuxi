// 禅意呼吸 - 宫缩伴侣应用 JavaScript 逻辑

// DOM 元素获取
const appContainer = document.getElementById('appContainer');
const breathingCircle = document.getElementById('breathingCircle');
const breathingText = document.getElementById('breathingText');
const breathingControlBtn = document.getElementById('breathingControlBtn');
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
    isBreathingActive: false,    // 呼吸引导是否激活
    breathingTimer: null,        // 呼吸引导定时器
    warningLevel: 0              // 预警等级：0-正常，1-黄色提醒，2-红色警报
};

// 常量定义
const STORAGE_KEY = 'zen_breathing_contractions';
const BREATHING_CYCLE = 10000;     // 呼吸周期：10秒
const INHALE_DURATION = 4000;      // 吸气时长：4秒
const EXHALE_DURATION = 6000;      // 呼气时长：6秒
const BREATHING_DELAY = 5000;       // 宫缩开始后呼吸引导延迟：5秒
const WARNING_511_THRESHOLD = 6;   // 5-1-1标准判定的宫缩次数阈值：6次
const WARNING_511_INTERVAL = 5 * 60 * 1000;  // 5-1-1标准：间隔≤5分钟
const WARNING_511_DURATION = 60 * 1000;       // 5-1-1标准：持续≥1分钟

// 初始化应用
function initApp() {
    // 从本地存储加载历史数据
    loadHistoryData();
    
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
    // 呼吸引导控制按钮
    breathingControlBtn.addEventListener('click', toggleBreathingGuide);
    
    // 宫缩记录按钮
    contractionBtn.addEventListener('click', toggleContractionRecording);
    
    // 历史记录按钮
    historyBtn.addEventListener('click', openHistoryModal);
    closeHistoryModal.addEventListener('click', closeHistoryModalHandler);
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // 医院提醒模态框
    cancelHospitalBtn.addEventListener('click', closeHospitalModal);
    confirmHospitalBtn.addEventListener('click', confirmHospital);
    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            closeHistoryModalHandler();
        }
    });
    
    // 键盘事件监听（ESC关闭模态框）
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeHistoryModalHandler();
            closeHospitalModal();
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
    
    // 5秒后自动启动呼吸引导
    setTimeout(() => {
        if (appState.isRecording && !appState.isBreathingActive) {
            startBreathingGuide();
        }
    }, BREATHING_DELAY);
}

// 结束记录宫缩
function endContraction() {
    appState.isRecording = false;
    const endTime = Date.now();
    const duration = endTime - appState.lastContractionStart;
    
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

// 呼吸引导功能
function toggleBreathingGuide() {
    if (appState.isBreathingActive) {
        stopBreathingGuide();
    } else {
        startBreathingGuide();
    }
}

// 开始呼吸引导
function startBreathingGuide() {
    appState.isBreathingActive = true;
    breathingControlBtn.textContent = '停止呼吸引导';
    breathingControlBtn.classList.add('active');
    
    // 启动呼吸动画
    startBreathingAnimation();
}

// 停止呼吸引导
function stopBreathingGuide() {
    appState.isBreathingActive = false;
    breathingControlBtn.textContent = '开始呼吸引导';
    breathingControlBtn.classList.remove('active');
    breathingText.textContent = '准备';
    
    // 停止呼吸动画
    if (appState.breathingTimer) {
        clearInterval(appState.breathingTimer);
        appState.breathingTimer = null;
    }
}

// 启动呼吸动画
function startBreathingAnimation() {
    // 立即执行一次，然后开始循环
    updateBreathingState();
    
    // 设置定时器，每10秒更新一次呼吸状态
    appState.breathingTimer = setInterval(updateBreathingState, BREATHING_CYCLE);
}

// 更新呼吸状态
function updateBreathingState() {
    // 吸气阶段
    breathingText.textContent = '吸气';
    
    // 4秒后切换到呼气阶段
    setTimeout(() => {
        breathingText.textContent = '呼气';
    }, INHALE_DURATION);
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

// 工具函数：格式化时长（毫秒转分秒）
function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
        return `${minutes}分${remainingSeconds}秒`;
    } else {
        return `${remainingSeconds}秒`;
    }
}

// 初始化应用
initApp();