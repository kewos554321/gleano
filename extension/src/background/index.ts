import type { SubtitleCapturedPayload, UserSettings, AnalysisResult } from '@gleano/shared';

// API configuration
const API_BASE_URL = 'https://gleano.gleano-api.workers.dev';

// Subtitle buffer
let subtitleBuffer: string[] = [];
let lastAnalysisTime = 0;
const ANALYSIS_COOLDOWN = 10000; // 10 seconds between analyses

// Panel behavior functions (declared early for use in onInstalled)
function updatePanelBehavior(defaultAction: 'sidepanel' | 'popup') {
  if (defaultAction === 'sidepanel') {
    // Sidepanel mode: clicking icon opens sidepanel automatically
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
    chrome.action.setPopup({ popup: '' }); // Disable popup
  } else {
    // Popup mode: clicking icon opens popup
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
    chrome.action.setPopup({ popup: 'src/popup/index.html' });
  }
}

async function initPanelBehavior() {
  const { userSettings } = await chrome.storage.local.get(['userSettings']);
  const defaultAction = userSettings?.defaultAction || 'sidepanel';
  updatePanelBehavior(defaultAction);
}

// Create context menu items and initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  // Create context menus
  chrome.contextMenus.create({
    id: 'open-sidepanel',
    title: '開啟學習面板',
    contexts: ['action'],
  });
  chrome.contextMenus.create({
    id: 'open-settings',
    title: '開啟設定',
    contexts: ['action'],
  });

  // Initialize panel behavior on install
  await initPanelBehavior();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'open-sidepanel') {
    openSidePanel();
  } else if (info.menuItemId === 'open-settings') {
    chrome.action.openPopup();
  }
});

// Handle action (icon) click based on user settings
chrome.action.onClicked.addListener(async () => {
  const { userSettings } = await chrome.storage.local.get(['userSettings']);
  const defaultAction = userSettings?.defaultAction || 'sidepanel';

  if (defaultAction === 'sidepanel') {
    openSidePanel();
  }
  // If defaultAction is 'popup', the popup will open automatically (handled by manifest)
});

// Update panel behavior when settings change
chrome.storage.onChanged.addListener((changes) => {
  if (changes.userSettings?.newValue?.defaultAction !== undefined) {
    updatePanelBehavior(changes.userSettings.newValue.defaultAction);
  }
});

// Also init on service worker startup (not just install)
initPanelBehavior();

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(
  message: { type: string; payload?: unknown },
  sendResponse: (response: unknown) => void
) {
  switch (message.type) {
    case 'SUBTITLE_CAPTURED':
      handleSubtitleCaptured(message.payload as SubtitleCapturedPayload);
      sendResponse({ success: true });
      break;

    case 'ANALYZE_REQUEST':
      await analyzeSubtitles();
      sendResponse({ success: true });
      break;

    case 'OPEN_SIDEPANEL':
      openSidePanel();
      sendResponse({ success: true });
      break;

    case 'SUBTITLE_STATUS':
      // Forward status to sidepanel
      chrome.runtime.sendMessage({
        type: 'SUBTITLE_STATUS',
        payload: message.payload,
      }).catch(() => {
        // Sidepanel might not be open
      });
      sendResponse({ success: true });
      break;

    case 'OPEN_POPUP':
      // Open popup window as a new tab since programmatic popup opening has limitations
      chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') });
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
}

function handleSubtitleCaptured(payload: SubtitleCapturedPayload) {
  console.log('[Gleano] Subtitle captured:', payload.text.substring(0, 50) + '...');

  // Add to buffer
  subtitleBuffer.push(payload.text);

  // Keep buffer size manageable
  if (subtitleBuffer.length > 50) {
    subtitleBuffer = subtitleBuffer.slice(-30);
  }

  // Forward to sidepanel
  chrome.runtime.sendMessage({
    type: 'SUBTITLE_CAPTURED',
    payload,
  }).catch(() => {
    // Sidepanel might not be open, ignore error
  });

  // Auto-analyze if enough new content
  const now = Date.now();
  if (subtitleBuffer.length >= 5 && now - lastAnalysisTime > ANALYSIS_COOLDOWN) {
    analyzeSubtitles();
  }
}

// API request timeout (30 seconds)
const API_TIMEOUT = 30000;

async function analyzeSubtitles() {
  if (subtitleBuffer.length === 0) {
    console.log('[Gleano] No subtitles to analyze');
    sendAnalysisError('沒有字幕可分析，請先播放影片');
    return;
  }

  lastAnalysisTime = Date.now();
  const transcript = subtitleBuffer.join(' ');

  try {
    // Get user settings
    const { userSettings } = await chrome.storage.local.get(['userSettings']);
    const settings: UserSettings = userSettings || {
      id: crypto.randomUUID(),
      nativeLanguage: 'zh-TW',
      targetLanguage: 'en',
      level: 3,
    };

    // Call API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript,
        userId: settings.id,
        nativeLanguage: settings.nativeLanguage,
        targetLanguage: settings.targetLanguage,
        level: settings.level,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result: { success: boolean; data: AnalysisResult } = await response.json();

    if (result.success && result.data) {
      // Send result to sidepanel
      chrome.runtime.sendMessage({
        type: 'ANALYSIS_RESULT',
        payload: result.data,
      }).catch(() => {
        // Sidepanel might not be open
      });
    } else {
      sendAnalysisError('分析失敗，請稍後再試');
    }
  } catch (error) {
    console.error('[Gleano] Analysis error:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      sendAnalysisError('API 請求逾時，請檢查網路連線');
    } else {
      sendAnalysisError('分析失敗: ' + (error instanceof Error ? error.message : '未知錯誤'));
    }
  }
}

function sendAnalysisError(message: string) {
  chrome.runtime.sendMessage({
    type: 'ANALYSIS_ERROR',
    payload: { message },
  }).catch(() => {
    // Sidepanel might not be open
  });
}

async function openSidePanel() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  } catch (error) {
    console.error('[Gleano] Error opening side panel:', error);
  }
}

console.log('[Gleano] Background service worker initialized');

export {};
