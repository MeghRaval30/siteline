const { execSync, spawn } = require('child_process');

const MODEL = 'qwen2.5:7b-instruct';
const OLLAMA_API = 'http://localhost:11434';

let ollamaStatus = { online: false, modelReady: false, pulling: false, error: null };

function getOllamaStatus() {
  return { ...ollamaStatus };
}

async function checkOllamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_API}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkModelExists() {
  try {
    const res = await fetch(`${OLLAMA_API}/api/tags`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.models?.some(m => m.name?.includes('qwen2.5'));
  } catch {
    return false;
  }
}

function startOllamaServe() {
  return new Promise((resolve) => {
    console.log('[Ollama] Starting ollama serve...');
    try {
      // Check if ollama is installed
      execSync('where ollama', { stdio: 'ignore' });
    } catch {
      console.error('[Ollama] Ollama is not installed. Please install from https://ollama.com');
      ollamaStatus.error = 'Ollama not installed';
      resolve(false);
      return;
    }

    // Spawn ollama serve in the background
    const child = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
      shell: true,
      windowsHide: true
    });
    child.unref();

    // Wait for it to be ready
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (await checkOllamaRunning()) {
        clearInterval(interval);
        console.log('[Ollama] Server is running');
        resolve(true);
      } else if (attempts > 15) {
        clearInterval(interval);
        console.error('[Ollama] Failed to start server after 15 attempts');
        ollamaStatus.error = 'Failed to start Ollama server';
        resolve(false);
      }
    }, 1000);
  });
}

async function pullModel() {
  console.log(`[Ollama] Pulling model ${MODEL}... (this may take a few minutes)`);
  ollamaStatus.pulling = true;

  try {
    const res = await fetch(`${OLLAMA_API}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: MODEL, stream: false }),
      signal: AbortSignal.timeout(600000) // 10 min timeout for large model
    });

    if (res.ok) {
      console.log(`[Ollama] Model ${MODEL} is ready`);
      ollamaStatus.pulling = false;
      ollamaStatus.modelReady = true;
      return true;
    } else {
      const err = await res.text();
      console.error(`[Ollama] Failed to pull model: ${err}`);
      ollamaStatus.pulling = false;
      ollamaStatus.error = `Failed to pull model: ${err}`;
      return false;
    }
  } catch (e) {
    console.error(`[Ollama] Pull error: ${e.message}`);
    ollamaStatus.pulling = false;
    ollamaStatus.error = e.message;
    return false;
  }
}

async function initializeOllama() {
  console.log('[Ollama] Initializing AI backend...');

  // Step 1: Check if Ollama is already running
  let running = await checkOllamaRunning();
  if (!running) {
    running = await startOllamaServe();
  }

  if (!running) {
    console.warn('[Ollama] Could not start Ollama. AI features will be unavailable.');
    return;
  }

  ollamaStatus.online = true;

  // Step 2: Check if model exists
  const hasModel = await checkModelExists();
  if (hasModel) {
    console.log(`[Ollama] Model ${MODEL} already available`);
    ollamaStatus.modelReady = true;
    return;
  }

  // Step 3: Pull model in background (don't block server startup)
  pullModel().catch(err => {
    console.error('[Ollama] Background pull failed:', err.message);
  });
}

module.exports = { initializeOllama, getOllamaStatus, MODEL };
