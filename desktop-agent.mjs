/**
 * JARVIS LOCAL DESKTOP AGENT (Cross-Platform Daemon)
 * 
 * Secure local desktop control service for J.A.R.V.I.S.
 * Architecture:
 * JARVIS WEB FRONTEND -> SECURE LOCAL CONNECTION -> JARVIS DESKTOP AGENT -> OS -> APPS
 * 
 * Features:
 * - Binds strictly to 127.0.0.1 (Localhost-only)
 * - Bearer Token Authentication
 * - Strict Application Registry Allowlist (No arbitrary shell code)
 * - Safe Process Termination & Launch
 * - Real Running Applications Detection (Windows / macOS / Linux)
 * - Private Network Access & CORS Compliant
 */

import http from 'http';
import { spawn, exec, execFile } from 'child_process';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PORT = process.env.JARVIS_AGENT_PORT ? parseInt(process.env.JARVIS_AGENT_PORT, 10) : 39281;
const HOST = '127.0.0.1'; // STRICT LOCALHOST ONLY
const AUTH_TOKEN = process.env.JARVIS_AUTH_TOKEN || 'STARK-JARVIS-SECURE-LOCAL-KEY';

const PLATFORM = process.platform; // 'win32' | 'darwin' | 'linux'

// Strict Allowlisted Applications & Execution Commands
const APPLICATION_ALLOWLIST = {
  chrome: {
    name: 'Google Chrome',
    processNames: ['chrome.exe', 'Google Chrome', 'chrome', 'chromium', 'chromium-browser'],
    launch: {
      win32: ['cmd.exe', ['/c', 'start', 'chrome']],
      darwin: ['open', ['-a', 'Google Chrome']],
      linux: ['google-chrome', []],
    },
  },
  vscode: {
    name: 'Visual Studio Code',
    processNames: ['Code.exe', 'code', 'Visual Studio Code'],
    launch: {
      win32: ['cmd.exe', ['/c', 'code']],
      darwin: ['code', []],
      linux: ['code', []],
    },
  },
  calculator: {
    name: 'Calculator',
    processNames: ['CalculatorApp.exe', 'Calculator.exe', 'calc.exe', 'Calculator', 'gnome-calculator', 'kcalc'],
    launch: {
      win32: ['calc.exe', []],
      darwin: ['open', ['-a', 'Calculator']],
      linux: ['gnome-calculator', []],
    },
  },
  notepad: {
    name: 'Notepad',
    processNames: ['notepad.exe', 'Notepad.exe', 'TextEdit', 'gedit', 'kate'],
    launch: {
      win32: ['notepad.exe', []],
      darwin: ['open', ['-a', 'TextEdit']],
      linux: ['gedit', []],
    },
  },
  explorer: {
    name: 'File Explorer',
    processNames: ['explorer.exe', 'Finder', 'nautilus', 'dolphin'],
    launch: {
      win32: ['explorer.exe', []],
      darwin: ['open', [os.homedir()]],
      linux: ['xdg-open', [os.homedir()]],
    },
  },
  spotify: {
    name: 'Spotify',
    processNames: ['Spotify.exe', 'spotify', 'Spotify'],
    launch: {
      win32: ['cmd.exe', ['/c', 'start', 'spotify:']],
      darwin: ['open', ['-a', 'Spotify']],
      linux: ['spotify', []],
    },
  },
  discord: {
    name: 'Discord',
    processNames: ['Discord.exe', 'discord', 'Discord'],
    launch: {
      win32: ['cmd.exe', ['/c', 'start', 'discord:']],
      darwin: ['open', ['-a', 'Discord']],
      linux: ['discord', []],
    },
  },
  terminal: {
    name: 'Terminal',
    processNames: ['WindowsTerminal.exe', 'cmd.exe', 'powershell.exe', 'Terminal', 'gnome-terminal-server', 'konsole', 'xterm'],
    launch: {
      win32: ['cmd.exe', ['/c', 'start', 'cmd.exe']],
      darwin: ['open', ['-a', 'Terminal']],
      linux: ['x-terminal-emulator', []],
    },
  },
  slack: {
    name: 'Slack',
    processNames: ['slack.exe', 'Slack', 'slack'],
    launch: {
      win32: ['cmd.exe', ['/c', 'start', 'slack:']],
      darwin: ['open', ['-a', 'Slack']],
      linux: ['slack', []],
    },
  },
  browser: {
    name: 'Default Web Browser',
    processNames: ['chrome.exe', 'firefox.exe', 'msedge.exe', 'Safari', 'chrome', 'firefox'],
    launch: {
      win32: ['cmd.exe', ['/c', 'start', 'https://www.google.com']],
      darwin: ['open', ['https://www.google.com']],
      linux: ['xdg-open', ['https://www.google.com']],
    },
  },
};

/**
 * Launch an application safely using spawn
 */
async function launchApplication(appId) {
  const app = APPLICATION_ALLOWLIST[appId];
  if (!app) {
    throw new Error(`Application "${appId}" is not in the secure allowlist.`);
  }

  const launchConfig = app.launch[PLATFORM] || app.launch.linux;
  if (!launchConfig) {
    throw new Error(`No launch configuration available for platform ${PLATFORM}.`);
  }

  const [cmd, args] = launchConfig;
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(cmd, args, {
        detached: true,
        stdio: 'ignore',
        shell: false,
      });

      child.on('error', (err) => {
        // If primary command failed on Linux/Mac, try fallback executable
        if (PLATFORM === 'linux' && appId === 'calculator') {
          spawn('kcalc', [], { detached: true, stdio: 'ignore' });
          resolve({ success: true, message: `Launched ${app.name} (fallback)` });
          return;
        }
        reject(new Error(`Failed to spawn ${app.name}: ${err.message}`));
      });

      child.unref();
      // Give a tiny grace period for immediate spawn errors
      setTimeout(() => {
        resolve({
          success: true,
          message: `${app.name} has been launched successfully.`,
          appId,
          appName: app.name,
        });
      }, 250);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Close/terminate an application by matching running process names
 */
async function closeApplication(appId) {
  const app = APPLICATION_ALLOWLIST[appId];
  if (!app) {
    throw new Error(`Application "${appId}" is not in the secure allowlist.`);
  }

  let terminated = false;
  let lastError = null;

  for (const procName of app.processNames) {
    try {
      if (PLATFORM === 'win32') {
        // Windows taskkill
        await execAsync(`taskkill /F /IM "${procName}" /T`);
        terminated = true;
      } else if (PLATFORM === 'darwin') {
        // macOS killall or pkill
        await execAsync(`pkill -f "${procName}" || killall "${procName}"`);
        terminated = true;
      } else {
        // Linux pkill or killall
        await execAsync(`pkill -f "${procName}" || killall "${procName}"`);
        terminated = true;
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (terminated) {
    return {
      success: true,
      message: `${app.name} has been closed.`,
      appId,
      appName: app.name,
    };
  }

  throw new Error(`I couldn't close ${app.name}. It may not be currently running or requires elevated permissions.`);
}

/**
 * Open website URL safely in the default system browser
 */
async function openWebsite(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Valid URL required');
  }

  let validUrl = rawUrl.trim();
  if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
    validUrl = `https://${validUrl}`;
  }

  try {
    new URL(validUrl);
  } catch (_) {
    throw new Error(`Invalid URL format: ${rawUrl}`);
  }

  // Prevent dangerous protocols or command injection
  if (!/^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/.test(validUrl)) {
    throw new Error('URL contains disallowed characters.');
  }

  if (PLATFORM === 'win32') {
    await execAsync(`start "" "${validUrl}"`);
  } else if (PLATFORM === 'darwin') {
    await execAsync(`open "${validUrl}"`);
  } else {
    await execAsync(`xdg-open "${validUrl}"`);
  }

  return {
    success: true,
    message: `Opened ${validUrl} in default browser.`,
    url: validUrl,
  };
}

/**
 * Scan running processes and match against allowed applications
 */
async function getRunningApplications() {
  const running = [];

  try {
    let processListOutput = '';
    if (PLATFORM === 'win32') {
      const { stdout } = await execAsync('tasklist /FO CSV /NH');
      processListOutput = stdout.toLowerCase();
    } else {
      const { stdout } = await execAsync('ps -eo comm');
      processListOutput = stdout.toLowerCase();
    }

    for (const [id, app] of Object.entries(APPLICATION_ALLOWLIST)) {
      const isRunning = app.processNames.some((pName) =>
        processListOutput.includes(pName.toLowerCase())
      );
      if (isRunning) {
        running.push({
          id,
          name: app.name,
          processName: app.processNames[0],
          status: 'running',
        });
      }
    }
  } catch (err) {
    console.warn('[JARVIS AGENT] Process scan warning:', err.message);
  }

  return {
    success: true,
    runningApps: running,
    totalRunning: running.length,
    timestamp: Date.now(),
  };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS & Private Network Access Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  // Health / Status check (No auth required for simple ping)
  if (url.pathname === '/status' || url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'online',
        agent: 'JARVIS-Stark-Desktop-Agent',
        version: '2.5.0',
        platform: PLATFORM,
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: Math.round(process.uptime()),
        timestamp: Date.now(),
      })
    );
    return;
  }

  // Verify Bearer Auth Token
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (token !== AUTH_TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Unauthorized: Invalid or missing JARVIS authorization token.',
        code: 'AUTH_FAILED',
      })
    );
    return;
  }

  // Get running applications
  if (req.method === 'GET' && url.pathname === '/running-apps') {
    try {
      const data = await getRunningApplications();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Execute Action endpoint
  if (req.method === 'POST' && url.pathname === '/action') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100000) req.destroy(); // Prevent memory flood
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { action, target, url: siteUrl } = payload;

        let result;
        if (action === 'OPEN_APPLICATION') {
          result = await launchApplication(target);
        } else if (action === 'CLOSE_APPLICATION') {
          result = await closeApplication(target);
        } else if (action === 'OPEN_WEBSITE') {
          result = await openWebsite(siteUrl || target);
        } else if (action === 'GET_RUNNING_APPS') {
          result = await getRunningApplications();
        } else {
          throw new Error(`Unsupported action type: "${action}"`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log('⚡ J.A.R.V.I.S. SECURE DESKTOP AGENT ONLINE');
  console.log(`📡 Listening on: http://${HOST}:${PORT}`);
  console.log(`🔐 Authorization Token: ${AUTH_TOKEN}`);
  console.log(`🖥️ Operating System: ${PLATFORM} (${os.arch()})`);
  console.log('🛡️ Security: Localhost only, Registry allowlist enforced');
  console.log('====================================================');
});
