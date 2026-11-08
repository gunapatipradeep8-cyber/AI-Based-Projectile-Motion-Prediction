import axios from 'axios';

export const getApiBaseUrl = () => {
  // 1. Explicit environment variable takes precedence (for deployed environments)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }

  // 2. In browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Local development: match the browser's hostname (localhost or 127.0.0.1) on port 8000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:8000`;
    }
    // Deployed production environment without VITE_API_URL:
    // Return empty string (relative path) so requests hit the deployed origin, NEVER visitor's localhost!
    return '';
  }

  return 'http://127.0.0.1:8000';
};

export const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Health & Model Info
export const checkApiHealth = async () => {
  const response = await apiClient.get('/');
  return response.data;
};

export const getModelInfo = async () => {
  const response = await apiClient.get('/api/prediction/model-info');
  return response.data;
};

export const checkModelStatus = async () => {
  const response = await apiClient.get('/api/prediction/status');
  return response.data;
};

// Simulation & Predictions
export const computeDerivedFeatures = async (data) => {
  const response = await apiClient.post('/api/prediction/compute-derived-features', data);
  return response.data;
};

export const calculateTheoretical = async (data) => {
  const response = await apiClient.post('/api/prediction/calculate-theoretical', data);
  return response.data;
};

export const predictDistance = async (data) => {
  const response = await apiClient.post('/api/prediction/predict', data);
  return response.data;
};

// History Management
export const getSimulationHistory = async (limit = 100) => {
  const response = await apiClient.get(`/api/prediction/history?limit=${limit}`);
  return response.data;
};

export const deleteSimulationRecord = async (recordId) => {
  const response = await apiClient.delete(`/api/prediction/history/${recordId}`);
  return response.data;
};

export const clearSimulationHistory = async () => {
  const response = await apiClient.delete('/api/prediction/history');
  return response.data;
};

// PROJECTILE AI TUTOR - Gemini Assistant API
export const getChatbotStatus = async () => {
  const response = await apiClient.get('/api/assistant/status');
  return response.data;
};

export const resetChatbotSession = async () => {
  const response = await apiClient.post('/api/assistant/reset');
  return response.data;
};

export const sendChatMessage = async (
  message,
  simulationContext = null,
  history = null,
  enableGrounding = true
) => {
  const response = await apiClient.post('/api/assistant/chat', {
    message,
    simulation_context: simulationContext,
    history,
    stream: false,
    enable_grounding: enableGrounding,
  });
  return response.data;
};

export const extractChatErrorInfo = (err) => {
  const msg = err?.message || '';
  const status = err?.status || err?.response?.status;
  const data = err?.response?.data || {};
  const errorCode = err?.code || data?.error_code || (status === 429 ? 'RATE_LIMIT_TEMPORARY' : null);
  const retryAfter = err?.retryAfter || data?.retry_after || 30;
  const isDaily = err?.isDaily !== undefined ? err.isDaily : (data?.is_daily || errorCode === 'QUOTA_DAILY_EXCEEDED');
  const canAutoRetry = err?.canAutoRetry !== undefined ? err.canAutoRetry : (!isDaily && (errorCode === 'RATE_LIMIT_TEMPORARY' || errorCode === 'SERVICE_BUSY'));

  return {
    errorCode,
    status,
    retryAfter: Number(retryAfter) || 30,
    isDaily: Boolean(isDaily),
    canAutoRetry: Boolean(canAutoRetry),
    detail: data?.detail || data?.message || msg,
  };
};

export const formatChatErrorMessage = (err) => {
  const data = err?.response?.data;
  if (data?.answer) {
    return data.answer;
  }
  if (err?.answer) {
    return err.answer;
  }
  const info = extractChatErrorInfo(err);
  const { errorCode, status, detail, isDaily, retryAfter } = info;
  const msg = err?.message || '';

  if (errorCode === 'API_KEY_MISSING' || detail?.includes('API_KEY_MISSING')) {
    return '### 🔑 Gemini API Key Required\n\nPlease add your free Gemini API key to `backend/.env` as `GEMINI_API_KEY="your_key"`. You can get one from [Google AI Studio](https://aistudio.google.com/).';
  }

  if (errorCode === 'INVALID_API_KEY' || detail?.includes('INVALID_API_KEY') || status === 401 || status === 403) {
    return '### ⚠️ Invalid Gemini API Key\n\nThe `GEMINI_API_KEY` in `backend/.env` was not accepted by Google Gemini. Please verify that the key was copied without extra spaces.';
  }

  if (errorCode === 'QUOTA_DAILY_EXCEEDED' || isDaily) {
    const hours = Math.floor(retryAfter / 3600);
    const mins = Math.floor((retryAfter % 3600) / 60);
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return `### 🛑 Daily Free Tier Quota Reached\n\nYour Google Gemini Free Tier daily requests quota (RPD) has been reached across available models.\n\n**Reset Time:** Daily quota resets at midnight Pacific Time (in approximately **${timeStr}**). Waiting 30 seconds will not resolve this error.\n\n**Quick Solution:** Create another free API key at [Google AI Studio](https://aistudio.google.com/) and update \`GEMINI_API_KEY\` in \`backend/.env\`.`;
  }

  if (errorCode === 'RATE_LIMIT_TEMPORARY' || errorCode === 'QUOTA_EXCEEDED' || status === 429 || msg.includes('429')) {
    return `### ⏳ Temporary Rate Limit\n\nGoogle Gemini Free Tier allows 15 requests per minute.\n\nPlease wait about **${retryAfter || 30} seconds** while quota cools down.`;
  }

  if (errorCode === 'SERVICE_BUSY' || status === 503 || msg.includes('503') || detail?.includes('high demand')) {
    return `### ⚙️ Gemini Servers Busy\n\nThe Gemini model is currently experiencing high global demand. Please wait about **${retryAfter || 15} seconds** and try again.`;
  }

  if (err?.code === 'ECONNABORTED' || msg.toLowerCase().includes('timeout') || status === 504) {
    return '### ⏱️ Connection Timed Out\n\nThe request took longer than expected. Please check your internet connection or ask a more specific question.';
  }

  if (msg.includes('Network Error') || err?.code === 'ERR_NETWORK' || msg.includes('Failed to fetch')) {
    const currentUrl = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000');
    return `### 🔌 Backend Server Offline\n\nUnable to connect to the FastAPI backend at \`${currentUrl}\`.\n\n**To start the backend server:**\n\`\`\`powershell\ncd backend\n.\\venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload\n\`\`\``;
  }

  return `### ⚠️ Connection Error\n\n${detail || msg || 'An unexpected error occurred while communicating with the AI Tutor.'}`;
};

export const streamChatMessage = async ({
  message,
  simulationContext = null,
  history = null,
  enableGrounding = true,
  onChunk,
  onDone,
  onError,
  signal,
}) => {
  const endpoint = `${API_BASE_URL}/api/assistant/chat`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        simulation_context: simulationContext,
        history,
        stream: true,
        enable_grounding: enableGrounding,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Server returned HTTP ${response.status}`;
      let errCode = null;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.detail) errMsg = parsed.detail;
        if (parsed.message) errMsg = parsed.message;
        if (parsed.error_code) errCode = parsed.error_code;
      } catch (_) {}
      const httpErr = new Error(errMsg);
      httpErr.status = response.status;
      httpErr.code = errCode;
      throw httpErr;
    }

    if (!response.body) {
      throw new Error('Response body is empty or streaming not supported by browser.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'chunk' && data.text) {
              onChunk && onChunk(data.text);
            } else if (data.type === 'done') {
              onDone && onDone(data);
            } else if (data.type === 'error') {
              const streamErr = new Error(data.message || data.answer || 'Error received from AI Tutor.');
              streamErr.code = data.error_code;
              streamErr.retryAfter = data.retry_after;
              streamErr.isDaily = data.is_daily;
              streamErr.canAutoRetry = data.can_auto_retry;
              streamErr.answer = data.answer;
              onError && onError(streamErr);
            }
          } catch (e) {
            console.warn('[SSE Parse Warning]', e, trimmed);
          }
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[SSE Stream] Stream aborted by user.');
    } else {
      onError && onError(err);
    }
  }
};
