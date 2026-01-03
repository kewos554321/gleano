import type { SubtitleCapturedPayload, UserSettings, AnalysisResult } from '@gleano/shared';

// API configuration
const API_BASE_URL = 'https://gleano.YOUR_SUBDOMAIN.workers.dev'; // Update this

// Subtitle buffer
let subtitleBuffer: string[] = [];
let lastAnalysisTime = 0;
const ANALYSIS_COOLDOWN = 10000; // 10 seconds between analyses

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

async function analyzeSubtitles() {
  if (subtitleBuffer.length === 0) {
    console.log('[Gleano] No subtitles to analyze');
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

    // Call API
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
    });

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
    }
  } catch (error) {
    console.error('[Gleano] Analysis error:', error);
  }
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

// Set up side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
  // Older Chrome versions might not support this
});

console.log('[Gleano] Background service worker initialized');

export {};
