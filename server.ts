import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import {
  APPLICATION_REGISTRY,
  resolveApplication,
  resolveWebsite,
} from './src/utils/appRegistry';

dotenv.config();

const app = express();

/* =========================================================
   SERVER CONFIGURATION
   ========================================================= */

const PORT = Number(process.env.PORT) || 3000;

const ALLOWED_ORIGINS = [
  'https://yashaschandru583-glitch.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PATCH,DELETE,OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );

  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '1mb' }));

/* =========================================================
   ROOT / HEALTH
   ========================================================= */

app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    system: 'J.A.R.V.I.S. Arc Reactor OS',
    version: 'Mark LXXXV',
    message: 'J.A.R.V.I.S. backend operational.',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  const hasApiKey =
    !!process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

  res.json({
    status: 'ok',
    system: 'JARVIS Arc Reactor OS',
    version: 'Mark LXXXV',
    backend: 'online',
    gemini: hasApiKey ? 'configured' : 'fallback-mode',
    tts: 'available',
    time: new Date().toISOString(),
  });
});

/* =========================================================
   GEMINI CLIENT
   ========================================================= */

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }

  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
    });
  }

  return genAIClient;
}

/* =========================================================
   TASK SYSTEM
   ========================================================= */

interface TaskItem {
  id: string;
  title: string;
  due?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: number;
}

let starkTasks: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Recalibrate Arc Reactor magnetic containment field',
    due: 'Today 18:00',
    priority: 'high',
    completed: false,
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'task-2',
    title: 'Download latest AI telemetry updates',
    due: 'Tomorrow 09:00',
    priority: 'medium',
    completed: true,
    createdAt: Date.now() - 7200000,
  },
];

app.get('/api/tasks', (_req, res) => {
  res.json({
    tasks: starkTasks,
  });
});

app.post('/api/tasks', (req, res) => {
  const { title, due, priority } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({
      error: 'Title is required',
    });
  }

  const validPriority =
    priority === 'low' ||
    priority === 'high' ||
    priority === 'medium'
      ? priority
      : 'medium';

  const task: TaskItem = {
    id: `task-${Date.now()}`,
    title: title.trim(),
    due: due || 'Upcoming',
    priority: validPriority,
    completed: false,
    createdAt: Date.now(),
  };

  starkTasks.unshift(task);

  res.json({
    success: true,
    task,
    tasks: starkTasks,
  });
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = starkTasks.find((item) => item.id === req.params.id);

  if (!task) {
    return res.status(404).json({
      error: 'Task not found',
    });
  }

  if (typeof req.body.completed === 'boolean') {
    task.completed = req.body.completed;
  }

  if (typeof req.body.title === 'string' && req.body.title.trim()) {
    task.title = req.body.title.trim();
  }

  if (
    req.body.priority === 'low' ||
    req.body.priority === 'medium' ||
    req.body.priority === 'high'
  ) {
    task.priority = req.body.priority;
  }

  if (typeof req.body.due === 'string') {
    task.due = req.body.due;
  }

  res.json({
    success: true,
    task,
    tasks: starkTasks,
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  const before = starkTasks.length;

  starkTasks = starkTasks.filter(
    (task) => task.id !== req.params.id
  );

  res.json({
    success: starkTasks.length !== before,
    tasks: starkTasks,
  });
});

/* =========================================================
   TELEMETRY
   ========================================================= */

app.get('/api/system/telemetry', (_req, res) => {
  const online =
    !!process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

  res.json({
    coreOutputGW: 3.42,
    coreTempKelvin: 418.5,
    efficiencyPercent: 99.4,
    frequencyHz: 60.02,
    batteryStatus: 'FUSION COUPLING (99.8%)',
    networkStatus: 'STARK SATELLITE LINK 10 Gbps',
    activeModel: online
      ? 'gemini-2.5-flash (Online)'
      : 'JARVIS Tactical Core (Local Mode)',
    demoMode: !online,
    taskCount: starkTasks.length,
  });
});

/* =========================================================
   WEATHER
   ========================================================= */

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';

  return 'Unknown';
}

async function fetchLiveWeather(location: string) {
  try {
    const geoURL =
      `https://geocoding-api.open-meteo.com/v1/search` +
      `?name=${encodeURIComponent(location)}` +
      `&count=1&language=en&format=json`;

    const geoResponse = await fetch(geoURL);

    if (!geoResponse.ok) {
      throw new Error('Geocoding service unavailable');
    }

    const geoData = await geoResponse.json() as any;

    if (!geoData.results?.length) {
      return {
        location,
        status: 'not-found',
        error: 'Location not found',
      };
    }

    const place = geoData.results[0];

    const weatherURL =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${place.latitude}` +
      `&longitude=${place.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
      `&temperature_unit=celsius` +
      `&wind_speed_unit=kmh`;

    const weatherResponse = await fetch(weatherURL);

    if (!weatherResponse.ok) {
      throw new Error('Weather API unavailable');
    }

    const weatherData = await weatherResponse.json() as any;
    const current = weatherData.current;

    const tempC = Number(current.temperature_2m);
    const tempF = Math.round((tempC * 9) / 5 + 32);

    return {
      location: `${place.name}, ${place.country || ''}`.trim(),
      temperature: `${tempC}°C (${tempF}°F)`,
      feelsLike: `${current.apparent_temperature}°C`,
      humidity: `${current.relative_humidity_2m}%`,
      windSpeed: `${current.wind_speed_10m} km/h`,
      precipitation: `${current.precipitation} mm`,
      condition: getWeatherDescription(current.weather_code),
      status: 'live',
    };
  } catch (error: any) {
    return {
      location,
      status: 'error',
      error: error?.message || 'Weather service unavailable',
    };
  }
}

/* =========================================================
   CALCULATOR
   ========================================================= */

function evaluateMath(expression: string) {
  const original = expression.trim();

  const percentMatch = original.match(
    /^([0-9.]+)%\s*(?:of|\*)\s*([0-9.]+)$/i
  );

  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    const total = Number(percentMatch[2]);
    const result = (percent / 100) * total;

    return {
      expression: original,
      result: String(result),
      status: 'success',
    };
  }

  const kmToMiles = original.match(
    /^([0-9.]+)\s*(?:km|kilometers?)\s*(?:to|in)\s*(?:miles?|mi)$/i
  );

  if (kmToMiles) {
    const value = Number(kmToMiles[1]);

    return {
      expression: original,
      result: `${(value * 0.621371).toFixed(4)} miles`,
      status: 'success',
    };
  }

  const milesToKm = original.match(
    /^([0-9.]+)\s*(?:miles?|mi)\s*(?:to|in)\s*(?:km|kilometers?)$/i
  );

  if (milesToKm) {
    const value = Number(milesToKm[1]);

    return {
      expression: original,
      result: `${(value * 1.60934).toFixed(4)} km`,
      status: 'success',
    };
  }

  const celsiusToF = original.match(
    /^([0-9.]+)\s*(?:c|celsius)\s*(?:to|in)\s*(?:f|fahrenheit)$/i
  );

  if (celsiusToF) {
    const value = Number(celsiusToF[1]);

    return {
      expression: original,
      result: `${((value * 9) / 5 + 32).toFixed(2)} °F`,
      status: 'success',
    };
  }

  const fahrenheitToC = original.match(
    /^([0-9.]+)\s*(?:f|fahrenheit)\s*(?:to|in)\s*(?:c|celsius)$/i
  );

  if (fahrenheitToC) {
    const value = Number(fahrenheitToC[1]);

    return {
      expression: original,
      result: `${(((value - 32) * 5) / 9).toFixed(2)} °C`,
      status: 'success',
    };
  }

  let clean = original
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\^/g, '**')
    .replace(/\bsqrt\s*\(/gi, 'Math.sqrt(')
    .replace(/\bsin\s*\(/gi, 'Math.sin(')
    .replace(/\bcos\s*\(/gi, 'Math.cos(')
    .replace(/\btan\s*\(/gi, 'Math.tan(')
    .replace(/\bpi\b/gi, 'Math.PI');

  if (!/^[0-9+\-*/().\s*]+$/.test(clean) &&
      !clean.startsWith('Math.')) {
    return {
      expression: original,
      result: 'Unable to safely evaluate expression',
      status: 'error',
    };
  }

  try {
    const result = Function(
      `"use strict"; return (${clean})`
    )();

    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error('Invalid result');
    }

    return {
      expression: original,
      result: Number(result.toFixed(10)).toString(),
      status: 'success',
    };
  } catch {
    return {
      expression: original,
      result: 'Unable to calculate that expression',
      status: 'error',
    };
  }
}

/* =========================================================
   WEB SEARCH
   ========================================================= */

async function searchLiveWeb(query: string) {
  const sources: Array<{
    title: string;
    url: string;
    domain?: string;
    snippet?: string;
  }> = [];

  let summary = '';

  try {
    const wikiURL =
      `https://en.wikipedia.org/api/rest_v1/page/summary/` +
      encodeURIComponent(query.trim());

    const response = await fetch(wikiURL);

    if (response.ok) {
      const data = await response.json() as any;

      if (data.extract) {
        summary = data.extract;

        if (data.content_urls?.desktop?.page) {
          sources.push({
            title: `${data.title} — Wikipedia`,
            url: data.content_urls.desktop.page,
            domain: 'wikipedia.org',
            snippet: data.extract.slice(0, 200),
          });
        }
      }
    }
  } catch {
    // Continue to secondary source.
  }

  try {
    const ddgURL =
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}` +
      `&format=json&no_html=1&skip_disambig=1`;

    const response = await fetch(ddgURL);

    if (response.ok) {
      const data = await response.json() as any;

      if (!summary && data.AbstractText) {
        summary = data.AbstractText;

        if (data.AbstractURL) {
          sources.push({
            title: data.Heading || query,
            url: data.AbstractURL,
            domain: new URL(data.AbstractURL).hostname,
            snippet: data.AbstractText.slice(0, 200),
          });
        }
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.FirstURL && topic.Text) {
            try {
              sources.push({
                title: topic.Text.slice(0, 80),
                url: topic.FirstURL,
                domain: new URL(topic.FirstURL).hostname,
                snippet: topic.Text.slice(0, 180),
              });
            } catch {
              // Ignore malformed source.
            }
          }
        }
      }
    }
  } catch {
    // No secondary search result.
  }

  const uniqueSources = sources.filter(
    (source, index, array) =>
      array.findIndex((item) => item.url === source.url) === index
  );

  return {
    query,
    summary:
      summary ||
      `I could not retrieve a verified summary for "${query}".`,
    sources: uniqueSources,
  };
}

/* =========================================================
   DESKTOP AGENT
   ========================================================= */

const LOCAL_AGENT_URL =
  process.env.LOCAL_AGENT_URL || 'http://127.0.0.1:39281';

const LOCAL_AGENT_AUTH =
  process.env.LOCAL_AGENT_AUTH ||
  'Bearer STARK-JARVIS-SECURE-LOCAL-KEY';

async function callDesktopAgent(
  action: string,
  target: string,
  confirmationToken?: string
) {
  try {
    const response = await fetch(
      `${LOCAL_AGENT_URL}/action`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: LOCAL_AGENT_AUTH,
        },
        body: JSON.stringify({
          action,
          target,
          confirmationToken,
        }),
        signal: AbortSignal.timeout(2500),
      }
    );

    const data = await response.json() as any;

    return {
      success: response.ok,
      ...data,
    };
  } catch {
    return {
      success: false,
      offline: true,
      message:
        'Desktop agent is not connected. The local desktop agent must be running on the user computer.',
    };
  }
}

/* =========================================================
   TOOL DECLARATIONS
   ========================================================= */

const getCurrentTimeDeclaration: FunctionDeclaration = {
  name: 'get_current_time',
  description:
    'Get the exact current local date, time, day, or timezone.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      timezone: {
        type: Type.STRING,
        description:
          'Optional timezone such as Asia/Kolkata, Europe/London, UTC.',
      },
    },
  },
};

const searchWebDeclaration: FunctionDeclaration = {
  name: 'search_web',
  description:
    'Search the live web for current information, facts, news, companies, people, science, or general knowledge.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query.',
      },
    },
    required: ['query'],
  },
};

const weatherDeclaration: FunctionDeclaration = {
  name: 'get_weather',
  description: 'Get current live weather for a location.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: {
        type: Type.STRING,
        description: 'City and country.',
      },
    },
    required: ['location'],
  },
};

const mathDeclaration: FunctionDeclaration = {
  name: 'calculate_math',
  description:
    'Perform precise mathematical calculations and unit conversions.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      expression: {
        type: Type.STRING,
        description: 'Mathematical expression.',
      },
    },
    required: ['expression'],
  },
};

const taskDeclaration: FunctionDeclaration = {
  name: 'manage_stark_task',
  description:
    'Create, list, or delete JARVIS tasks and reminders.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: 'create, list, or delete',
      },
      title: {
        type: Type.STRING,
        description: 'Task title.',
      },
      due: {
        type: Type.STRING,
        description: 'Due date or time.',
      },
      priority: {
        type: Type.STRING,
        description: 'low, medium, or high',
      },
    },
    required: ['action'],
  },
};

const openApplicationDeclaration: FunctionDeclaration = {
  name: 'open_desktop_application',
  description:
    'Open an authorized desktop application such as Chrome, VS Code, Calculator, Notepad, Spotify, Discord, Terminal, or File Explorer.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      applicationName: {
        type: Type.STRING,
      },
    },
    required: ['applicationName'],
  },
};

const closeApplicationDeclaration: FunctionDeclaration = {
  name: 'close_desktop_application',
  description:
    'Close an authorized desktop application.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      applicationName: {
        type: Type.STRING,
      },
      confirmed: {
        type: Type.BOOLEAN,
      },
    },
    required: ['applicationName'],
  },
};

const openWebsiteDeclaration: FunctionDeclaration = {
  name: 'open_website',
  description:
    'Open a website or search within a website.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
      },
      siteName: {
        type: Type.STRING,
      },
      searchQuery: {
        type: Type.STRING,
      },
    },
    required: ['url'],
  },
};

const runningApplicationsDeclaration: FunctionDeclaration = {
  name: 'get_running_applications',
  description:
    'List authorized applications currently running on the desktop.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

/* =========================================================
   TOOL EXECUTION
   ========================================================= */

async function executeTool(
  name: string,
  args: Record<string, any>
): Promise<any> {
  switch (name) {
    case 'get_current_time': {
      const now = new Date();
      const timezone = args.timezone;

      let time: string;
      let date: string;

      try {
        time = now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: timezone || undefined,
        });

        date = now.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: timezone || undefined,
        });
      } catch {
        time = now.toLocaleTimeString('en-GB');
        date = now.toLocaleDateString('en-GB');
      }

      return {
        currentTime: time,
        currentDate: date,
        timezone: timezone || 'Local',
        isoTimestamp: now.toISOString(),
      };
    }

    case 'search_web':
      return searchLiveWeb(args.query || '');

    case 'get_weather':
      return fetchLiveWeather(args.location || 'London');

    case 'calculate_math':
      return evaluateMath(args.expression || '0');

    case 'manage_stark_task': {
      const action = args.action;

      if (action === 'create') {
        if (!args.title) {
          return {
            success: false,
            error: 'Task title required.',
          };
        }

        const priority =
          args.priority === 'low' ||
          args.priority === 'high' ||
          args.priority === 'medium'
            ? args.priority
            : 'medium';

        const task: TaskItem = {
          id: `task-${Date.now()}`,
          title: args.title,
          due: args.due || 'Upcoming',
          priority,
          completed: false,
          createdAt: Date.now(),
        };

        starkTasks.unshift(task);

        return {
          success: true,
          action: 'create',
          task,
          tasks: starkTasks,
        };
      }

      if (action === 'list') {
        return {
          success: true,
          action: 'list',
          tasks: starkTasks,
          total: starkTasks.length,
        };
      }

      if (action === 'delete') {
        const before = starkTasks.length;

        starkTasks = starkTasks.filter(
          (task) =>
            !args.title ||
            !task.title
              .toLowerCase()
              .includes(String(args.title).toLowerCase())
        );

        return {
          success: true,
          action: 'delete',
          removed: before - starkTasks.length,
          tasks: starkTasks,
        };
      }

      return {
        success: false,
        error: 'Unknown task action.',
      };
    }

    case 'open_desktop_application': {
      const applicationName = args.applicationName || '';
      const resolved = resolveApplication(applicationName);

      if (!resolved) {
        return {
          success: false,
          error: `Application "${applicationName}" is not authorized.`,
          allowedApps: APPLICATION_REGISTRY.map(
            (item) => item.name
          ),
        };
      }

      /*
       * The cloud backend cannot directly access the user's
       * 127.0.0.1. The frontend desktopAgentService will
       * perform the local action.
       */
      const localResult = await callDesktopAgent(
        'OPEN_APPLICATION',
        resolved.id
      );

      return {
        success: true,
        app: resolved.name,
        appId: resolved.id,
        status: localResult.offline
          ? 'dispatch_to_client'
          : 'launched',
        message: `Opening ${resolved.name}.`,
        localAgent: localResult,
      };
    }

    case 'close_desktop_application': {
      const applicationName = args.applicationName || '';
      const resolved = resolveApplication(applicationName);

      if (!resolved) {
        return {
          success: false,
          error: `Application "${applicationName}" is not authorized.`,
        };
      }

      if (!args.confirmed) {
        return {
          success: false,
          requiresConfirmation: true,
          app: resolved.name,
          appId: resolved.id,
          message:
            `Are you sure you want to close ${resolved.name}?`,
        };
      }

      const localResult = await callDesktopAgent(
        'CLOSE_APPLICATION',
        resolved.id
      );

      return {
        success: true,
        app: resolved.name,
        appId: resolved.id,
        status: localResult.offline
          ? 'dispatch_to_client'
          : 'closed',
        message: `${resolved.name} closed.`,
        localAgent: localResult,
      };
    }

    case 'open_website': {
      const rawURL = args.url || '';
      const query = args.searchQuery || '';
      const site = resolveWebsite(
        rawURL || query || args.siteName || ''
      );

      const finalURL =
        site?.url ||
        (rawURL.startsWith('http')
          ? rawURL
          : `https://${rawURL}`);

      return {
        success: true,
        url: finalURL,
        siteName: site?.siteName || args.siteName || 'Website',
        searchQuery: site?.searchQuery || query,
        isSearch: site?.isSearch || !!query,
        message: site?.isSearch
          ? `Opening ${site.siteName} and searching for ${site.searchQuery}.`
          : `Opening ${site?.siteName || finalURL}.`,
      };
    }

    case 'get_running_applications': {
      try {
        const response = await fetch(
          `${LOCAL_AGENT_URL}/running-apps`,
          {
            headers: {
              Authorization: LOCAL_AGENT_AUTH,
            },
            signal: AbortSignal.timeout(2000),
          }
        );

        if (response.ok) {
          const data = await response.json() as any;

          return {
            success: true,
            runningApps: data.runningApps || [],
            count: (data.runningApps || []).length,
          };
        }
      } catch {
        // Agent unavailable.
      }

      return {
        success: false,
        runningApps: [],
        message:
          'Desktop agent is currently offline.',
      };
    }

    default:
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
  }
}

/* =========================================================
   FAST DIRECTIVE CLASSIFIER
   ========================================================= */

function classifyFastDirective(prompt: string) {
  const lower = prompt.trim().toLowerCase();

  if (
    lower === 'time' ||
    lower === 'date' ||
    lower === 'what time is it' ||
    lower === 'what is the time' ||
    lower === 'what day is it' ||
    lower === "what's the date" ||
    lower === 'what is the date'
  ) {
    return {
      type: 'time',
    };
  }

  const mathMatch = lower.match(
    /^(?:what is|calculate|compute)?\s*([0-9\s.+\-*/^()%]+)\??$/
  );

  if (
    mathMatch &&
    /[0-9]/.test(mathMatch[1]) &&
    /[+\-*/^%]/.test(mathMatch[1])
  ) {
    return {
      type: 'math',
      data: mathMatch[1].trim(),
    };
  }

  const multiplication = lower.match(
    /^(?:what is|calculate|compute)?\s*([0-9.]+)\s*(?:x|times|multiplied by|\*)\s*([0-9.]+)\??$/
  );

  if (multiplication) {
    return {
      type: 'math',
      data: `${multiplication[1]} * ${multiplication[2]}`,
    };
  }

  const weather = lower.match(
    /^(?:what is the |what's the )?weather (?:in|for|at) (.+)\??$/
  );

  if (weather) {
    return {
      type: 'weather',
      data: weather[1].trim(),
    };
  }

  const openApp = lower.match(
    /^(?:jarvis,?\s*)?(?:open|launch|start|run)\s+(?:the\s+)?(.+?)\.?$/
  );

  if (openApp) {
    const candidate = openApp[1].trim();

    if (
      !/(youtube|google|github|gmail|chatgpt|wikipedia|reddit|twitter|amazon|netflix)/i.test(
        candidate
      )
    ) {
      const resolved = resolveApplication(candidate);

      if (resolved) {
        return {
          type: 'open_app',
          data: resolved,
        };
      }
    }
  }

  const closeApp = lower.match(
    /^(?:jarvis,?\s*)?(?:close|quit|terminate|kill|shut down)\s+(?:the\s+)?(.+?)\.?$/
  );

  if (closeApp) {
    const resolved = resolveApplication(
      closeApp[1].trim()
    );

    if (resolved) {
      return {
        type: 'close_app',
        data: resolved,
      };
    }
  }

  const website = resolveWebsite(prompt);

  if (website) {
    return {
      type: 'open_website',
      data: website,
    };
  }

  const search = lower.match(
    /^(?:jarvis,?\s*)?(?:search(?:\s+for)?|look\s+up)\s+(.+)$/
  );

  if (search) {
    return {
      type: 'search',
      data: search[1].trim(),
    };
  }

  if (
    /^(?:which|what)\s+(?:apps|applications|processes)\s+are\s+(?:currently\s+)?running\??$/i.test(
      lower
    ) ||
    /^show\s+running\s+apps\??$/i.test(lower)
  ) {
    return {
      type: 'running_apps',
    };
  }

  return {
    type: 'none',
  };
}

/* =========================================================
   TTS
   ========================================================= */

interface TTSAudioCacheEntry {
  buffer: Buffer;
  timestamp: number;
}

const ttsCache = new Map<
  string,
  TTSAudioCacheEntry
>();

function getTTSCacheKey(
  text: string,
  rate: any,
  pitch: any,
  voice: string
) {
  return [
    text.trim().toLowerCase(),
    rate || 1.2,
    pitch || 0.9,
    voice || 'en-GB-RyanNeural',
  ].join('|');
}

function formatRate(rate: number | string) {
  const value =
    typeof rate === 'string'
      ? Number.parseFloat(rate)
      : rate;

  if (!Number.isFinite(value)) {
    return '+20%';
  }

  const percent = Math.round((value - 1) * 100);

  return percent >= 0
    ? `+${percent}%`
    : `${percent}%`;
}

function formatPitch(pitch: number | string) {
  const value =
    typeof pitch === 'string'
      ? Number.parseFloat(pitch)
      : pitch;

  if (!Number.isFinite(value)) {
    return '-4%';
  }

  const percent = Math.round((value - 1) * 100);

  return percent >= 0
    ? `+${percent}%`
    : `${percent}%`;
}

app.post('/api/tts/chunk', async (req, res) => {
  const text = req.body?.text;
  const rate = req.body?.rate ?? 1.2;
  const pitch = req.body?.pitch ?? 0.9;
  const voice =
    req.body?.voice || 'en-GB-RyanNeural';

  if (
    typeof text !== 'string' ||
    !text.trim()
  ) {
    return res.status(400).json({
      error: 'Text parameter is required',
    });
  }

  const cleanText = text.trim();

  const cacheKey = getTTSCacheKey(
    cleanText,
    rate,
    pitch,
    voice
  );

  const cached = ttsCache.get(cacheKey);

  if (cached) {
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': cached.buffer.length,
      'Cache-Control': 'public, max-age=86400',
    });

    return res.end(cached.buffer);
  }

  try {
    const tts = new MsEdgeTTS();

    await tts.setMetadata(
      voice,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    const { audioStream } = tts.toStream(
      cleanText,
      {
        rate: formatRate(rate),
        pitch: formatPitch(pitch),
      }
    );

    const chunks: Buffer[] = [];

    audioStream.on(
      'data',
      (chunk: Buffer) => {
        chunks.push(chunk);
      }
    );

    audioStream.on(
      'end',
      () => {
        const audio = Buffer.concat(chunks);

        if (audio.length === 0) {
          if (!res.headersSent) {
            res.status(500).json({
              error: 'No audio generated',
            });
          }

          try {
            tts.close();
          } catch {}

          return;
        }

        ttsCache.set(cacheKey, {
          buffer: audio,
          timestamp: Date.now(),
        });

        if (ttsCache.size > 300) {
          const firstKey =
            ttsCache.keys().next().value;

          if (firstKey) {
            ttsCache.delete(firstKey);
          }
        }

        if (!res.headersSent) {
          res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audio.length,
            'Cache-Control': 'no-cache',
          });
        }

        res.end(audio);

        try {
          tts.close();
        } catch {}
      }
    );

    audioStream.on(
      'error',
      (error) => {
        console.error(
          'TTS stream error:',
          error
        );

        try {
          tts.close();
        } catch {}

        if (!res.headersSent) {
          res.status(500).json({
            error: 'TTS generation failed',
          });
        } else {
          res.end();
        }
      }
    );

    req.on('close', () => {
      try {
        tts.close();
      } catch {}
    });
  } catch (error: any) {
    console.error(
      'TTS endpoint error:',
      error
    );

    if (!res.headersSent) {
      res.status(500).json({
        error:
          error?.message ||
          'TTS generation failed',
      });
    }
  }
});

/* =========================================================
   REQUEST DEDUPLICATION
   ========================================================= */

interface ActiveRequest {
  timestamp: number;
  status: 'processing' | 'completed';
}

const activeRequests =
  new Map<string, ActiveRequest>();

setInterval(() => {
  const now = Date.now();

  for (const [
    id,
    request,
  ] of activeRequests.entries()) {
    if (
      now - request.timestamp >
      120000
    ) {
      activeRequests.delete(id);
    }
  }
}, 30000);

/* =========================================================
   SSE HELPER
   ========================================================= */

function prepareSSE(res: express.Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control':
      'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
}

function sendSSE(
  res: express.Response,
  data: any
) {
  res.write(
    `data: ${JSON.stringify(data)}\n\n`
  );
}

/* =========================================================
   ASSISTANT STREAM
   ========================================================= */

app.post(
  '/api/assistant/stream',
  async (req, res) => {
    const {
      requestId,
      prompt,
      history = [],
      style = 'concise',
    } = req.body || {};

    if (
      !prompt ||
      typeof prompt !== 'string'
    ) {
      return res.status(400).json({
        error: 'Prompt is required',
      });
    }

    if (
      requestId &&
      typeof requestId === 'string'
    ) {
      const existing =
        activeRequests.get(requestId);

      if (
        existing &&
        existing.status === 'processing'
      ) {
        prepareSSE(res);
        sendSSE(res, {
          type: 'done',
          reply: '',
          duplicate: true,
        });
        return res.end();
      }

      activeRequests.set(
        requestId,
        {
          status: 'processing',
          timestamp: Date.now(),
        }
      );
    }

    prepareSSE(res);

    const finish = () => {
      if (
        requestId &&
        typeof requestId === 'string'
      ) {
        activeRequests.set(
          requestId,
          {
            status: 'completed',
            timestamp: Date.now(),
          }
        );
      }

      if (!res.writableEnded) {
        res.end();
      }
    };

    try {
      sendSSE(res, {
        type: 'start',
      });

      const route =
        classifyFastDirective(prompt);

      /* ---------------- TIME ---------------- */

      if (route.type === 'time') {
        const result =
          await executeTool(
            'get_current_time',
            {}
          );

        const reply =
          `The current time is ${result.currentTime} on ${result.currentDate}.`;

        sendSSE(res, {
          type: 'tool',
          tool: {
            name: 'get_current_time',
            args: {},
            result,
          },
        });

        sendSSE(res, {
          type: 'token',
          delta: reply,
        });

        sendSSE(res, {
          type: 'done',
          reply,
          toolUsed: {
            name: 'get_current_time',
            args: {},
            result,
          },
        });

        return finish();
      }

      /* ---------------- MATH ---------------- */

      if (
        route.type === 'math' &&
        route.data
      ) {
        const result =
          evaluateMath(route.data);

        if (
          result.status === 'success'
        ) {
          const reply =
            `${result.result}.`;

          const tool = {
            name: 'calculate_math',
            args: {
              expression: route.data,
            },
            result,
          };

          sendSSE(res, {
            type: 'tool',
            tool,
          });

          sendSSE(res, {
            type: 'token',
            delta: reply,
          });

          sendSSE(res, {
            type: 'done',
            reply,
            toolUsed: tool,
          });

          return finish();
        }
      }

      /* ---------------- WEATHER ---------------- */

      if (
        route.type === 'weather' &&
        route.data
      ) {
        const result =
          await executeTool(
            'get_weather',
            {
              location: route.data,
            }
          );

        const reply =
          result.status === 'live'
            ? `In ${result.location}, it is currently ${result.temperature} with ${result.condition.toLowerCase()} and ${result.humidity} humidity.`
            : `I was unable to retrieve live weather for ${route.data}.`;

        const tool = {
          name: 'get_weather',
          args: {
            location: route.data,
          },
          result,
        };

        sendSSE(res, {
          type: 'tool',
          tool,
        });

        sendSSE(res, {
          type: 'token',
          delta: reply,
        });

        sendSSE(res, {
          type: 'done',
          reply,
          sources: [
            {
              title:
                'Open-Meteo Weather',
              url:
                'https://open-meteo.com',
              domain:
                'open-meteo.com',
            },
          ],
          toolUsed: tool,
        });

        return finish();
      }

      /* ---------------- OPEN APP ---------------- */

      if (
        route.type === 'open_app' &&
        route.data
      ) {
        const result =
          await executeTool(
            'open_desktop_application',
            {
              applicationName:
                route.data.name,
            }
          );

        const reply =
          `Opening ${route.data.name}.`;

        const tool = {
          name:
            'open_desktop_application',
          args: {
            applicationName:
              route.data.name,
          },
          result,
        };

        sendSSE(res, {
          type: 'tool',
          tool,
        });

        sendSSE(res, {
          type: 'token',
          delta: reply,
        });

        sendSSE(res, {
          type: 'done',
          reply,
          toolUsed: tool,
        });

        return finish();
      }

      /* ---------------- CLOSE APP ---------------- */

      if (
        route.type === 'close_app' &&
        route.data
      ) {
        const result =
          await executeTool(
            'close_desktop_application',
            {
              applicationName:
                route.data.name,
              confirmed: true,
            }
          );

        const reply =
          `${route.data.name} closed.`;

        const tool = {
          name:
            'close_desktop_application',
          args: {
            applicationName:
              route.data.name,
            confirmed: true,
          },
          result,
        };

        sendSSE(res, {
          type: 'tool',
          tool,
        });

        sendSSE(res, {
          type: 'token',
          delta: reply,
        });

        sendSSE(res, {
          type: 'done',
          reply,
          toolUsed: tool,
        });

        return finish();
      }

      /* ---------------- WEBSITE ---------------- */

      if (
        route.type === 'open_website' &&
        route.data
      ) {
        const result =
          await executeTool(
            'open_website',
            {
              url: route.data.url,
              siteName:
                route.data.siteName,
              searchQuery:
                route.data.searchQuery,
            }
          );

        const reply =
          route.data.isSearch
            ? `Opening ${route.data.siteName} and searching for ${route.data.searchQuery}.`
            : `Opening ${route.data.siteName}.`;

        const tool = {
          name: 'open_website',
          args: {
            url: route.data.url,
            siteName:
              route.data.siteName,
            searchQuery:
              route.data.searchQuery,
          },
          result,
        };

        sendSSE(res, {
          type: 'tool',
          tool,
        });

        sendSSE(res, {
          type: 'token',
          delta: reply,
        });

        sendSSE(res, {
          type: 'done',
          reply,
          toolUsed: tool,
        });

        return finish();
      }

      /* ---------------- SEARCH ---------------- */

      if (
        route.type === 'search' &&
        route.data
      ) {
        sendSSE(res, {
          type: 'token',
          delta: 'Searching now. ',
        });

        sendSSE(res, {
          type: 'step',
          step:
            `Searching the live web for "${route.data}"`,
        });

        const result =
          await executeTool(
            'search_web',
            {
              query: route.data,
            }
          );

        const reply =
          `Searching now. ${result.summary}`;

        const tool = {
          name: 'search_web',
          args: {
            query: route.data,
          },
          result,
        };

        sendSSE(res, {
          type: 'tool',
          tool,
        });

        /*
         * Do not send the complete summary again
         * because "Searching now." was already sent.
         */
        if (
          result.summary &&
          result.summary !== ''
        ) {
          sendSSE(res, {
            type: 'token',
            delta:
              result.summary,
          });
        }

        sendSSE(res, {
          type: 'done',
          reply,
          sources:
            result.sources || [],
          toolUsed: tool,
        });

        return finish();
      }

      /* =====================================================
         GEMINI
         ===================================================== */

      const ai = getGenAI();

      if (!ai) {
        const reply =
          await fallbackResponse(
            prompt
          );

        sendSSE(res, {
          type: 'token',
          delta: reply,
        });

        sendSSE(res, {
          type: 'done',
          reply,
          demoMode: true,
        });

        return finish();
      }

      const systemInstruction = `
You are J.A.R.V.I.S., an advanced AI assistant.

PERSONA:
- Calm
- Intelligent
- Precise
- Professional
- Concise
- Natural British-style assistant wording
- Occasionally address the user as "sir"
- Never claim fictional information is real.

ACCURACY:
- Never fabricate facts.
- If current information is required, use search_web.
- For mathematics use calculate_math.
- For weather use get_weather.
- For time use get_current_time.
- For tasks use manage_stark_task.
- For desktop actions use the appropriate desktop tool.
- Clearly state uncertainty when information cannot be verified.

RESPONSE STYLE:
${style}

For simple questions, answer directly.
For commands, acknowledge briefly.
For explanations, begin with the answer immediately.

CURRENT TIME:
${new Date().toISOString()}
`;

      const tools = [
        {
          functionDeclarations: [
            getCurrentTimeDeclaration,
            searchWebDeclaration,
            weatherDeclaration,
            mathDeclaration,
            taskDeclaration,
            openApplicationDeclaration,
            closeApplicationDeclaration,
            openWebsiteDeclaration,
            runningApplicationsDeclaration,
          ],
        },
      ];

      const contents: any[] = [];

      if (
        Array.isArray(history)
      ) {
        for (
          const message of history.slice(-8)
        ) {
          if (
            message &&
            typeof message.content ===
              'string' &&
            message.content.trim()
          ) {
            contents.push({
              role:
                message.role ===
                'assistant'
                  ? 'model'
                  : 'user',
              parts: [
                {
                  text:
                    message.content,
                },
              ],
            });
          }
        }
      }

      contents.push({
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      });

      const candidateModels = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
      ];

      let responseStream: any =
        null;

      let selectedModel =
        candidateModels[0];

      for (
        const model of candidateModels
      ) {
        try {
          responseStream =
            await ai.models.generateContentStream(
              {
                model,
                contents,
                config: {
                  systemInstruction,
                  tools,
                  temperature: 0.4,
                  maxOutputTokens: 800,
                },
              }
            );

          selectedModel = model;
          break;
        } catch (error: any) {
          console.warn(
            `Gemini model ${model} unavailable:`,
            error?.message ||
              error
          );
        }
      }

      if (!responseStream) {
        const reply =
          await fallbackResponse(
            prompt
          );

        sendSSE(res, {
          type: 'token',
          delta: reply,
        });

        sendSSE(res, {
          type: 'done',
          reply,
          demoMode: true,
        });

        return finish();
      }

      let accumulated = '';
      const functionCalls: any[] = [];

      for await (
        const chunk of responseStream
      ) {
        if (
          typeof chunk.text ===
          'function'
        ) {
          const text =
            chunk.text();

          if (text) {
            accumulated += text;

            sendSSE(res, {
              type: 'token',
              delta: text,
            });
          }
        } else if (
          typeof chunk.text ===
            'string' &&
          chunk.text
        ) {
          accumulated +=
            chunk.text;

          sendSSE(res, {
            type: 'token',
            delta:
              chunk.text,
          });
        }

        if (
          Array.isArray(
            chunk.functionCalls
          )
        ) {
          functionCalls.push(
            ...chunk.functionCalls
          );
        }
      }

      /* =====================================================
         TOOL CALL
         ===================================================== */

      if (functionCalls.length) {
        const call =
          functionCalls[0];

        sendSSE(res, {
          type: 'step',
          step:
            `Executing protocol: ${call.name}`,
        });

        const toolResult =
          await executeTool(
            call.name,
            call.args || {}
          );

        const tool = {
          name: call.name,
          args:
            call.args || {},
          result: toolResult,
        };

        sendSSE(res, {
          type: 'tool',
          tool,
        });

        /*
         * Ask Gemini to turn the tool result
         * into a natural final response.
         */

        try {
          const secondResponse =
            await ai.models.generateContent(
              {
                model: selectedModel,
                contents: [
                  ...contents,
                  {
                    role: 'model',
                    parts: [
                      {
                        functionCall: {
                          name:
                            call.name,
                          args:
                            call.args ||
                            {},
                        },
                      },
                    ],
                  },
                  {
                    role: 'user',
                    parts: [
                      {
                        functionResponse:
                          {
                            name:
                              call.name,
                            response:
                              toolResult,
                          },
                      },
                    ],
                  },
                ],
                config: {
                  systemInstruction,
                  temperature: 0.3,
                  maxOutputTokens: 500,
                },
              }
            );

          let finalText = '';

          if (
            typeof secondResponse.text ===
            'function'
          ) {
            finalText =
              secondResponse.text();
          } else {
            finalText =
              secondResponse.text ||
              '';
          }

          if (finalText) {
            accumulated +=
              finalText;

            sendSSE(res, {
              type: 'token',
              delta:
                finalText,
            });
          }
        } catch {
          /*
           * If the second Gemini request fails,
           * produce a deterministic response.
           */
          if (!accumulated.trim()) {
            accumulated =
              toolFallbackText(
                call.name,
                toolResult
              );

            sendSSE(res, {
              type: 'token',
              delta:
                accumulated,
            });
          }
        }

        sendSSE(res, {
          type: 'done',
          reply:
            accumulated ||
            toolFallbackText(
              call.name,
              toolResult
            ),
          sources:
            toolResult?.sources ||
            [],
          toolUsed: tool,
        });

        return finish();
      }

      if (!accumulated.trim()) {
        accumulated =
          'Directive processed, sir.';

        sendSSE(res, {
          type: 'token',
          delta:
            accumulated,
        });
      }

      sendSSE(res, {
        type: 'done',
        reply: accumulated,
      });

      return finish();
    } catch (error: any) {
      console.error(
        'Assistant stream error:',
        error
      );

      if (
        !res.writableEnded
      ) {
        const reply =
          await fallbackResponse(
            prompt
          );

        sendSSE(res, {
          type: 'token',
          delta: reply,
        });

        sendSSE(res, {
          type: 'done',
          reply,
          fallback: true,
        });

        return finish();
      }
    }
  }
);

/* =========================================================
   STANDARD NON-STREAMING ASSISTANT ENDPOINT
   ========================================================= */

app.post(
  '/api/assistant/interact',
  async (req, res) => {
    const {
      prompt,
      history = [],
      style = 'concise',
    } = req.body || {};

    if (
      !prompt ||
      typeof prompt !== 'string'
    ) {
      return res.status(400).json({
        error: 'Prompt is required',
      });
    }

    try {
      const ai = getGenAI();

      if (!ai) {
        const reply =
          await fallbackResponse(
            prompt
          );

        return res.json({
          reply,
          demoMode: true,
        });
      }

      const contents: any[] = [];

      if (
        Array.isArray(history)
      ) {
        for (
          const message of history.slice(-8)
        ) {
          if (
            message?.content &&
            typeof message.content ===
              'string'
          ) {
            contents.push({
              role:
                message.role ===
                'assistant'
                  ? 'model'
                  : 'user',
              parts: [
                {
                  text:
                    message.content,
                },
              ],
            });
          }
        }
      }

      contents.push({
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      });

      const response =
        await ai.models.generateContent(
          {
            model:
              'gemini-2.5-flash',
            contents,
            config: {
              systemInstruction: `
You are J.A.R.V.I.S., a precise and helpful AI assistant.
Style: ${style}.
Answer accurately and directly.
Do not fabricate current information.
Use concise responses for simple questions.
`,
              temperature: 0.4,
              maxOutputTokens: 800,
            },
          }
        );

      const reply =
        typeof response.text ===
        'function'
          ? response.text()
          : response.text || '';

      return res.json({
        reply:
          reply ||
          'Directive processed, sir.',
      });
    } catch (error: any) {
      console.error(
        'Assistant interaction error:',
        error
      );

      const reply =
        await fallbackResponse(
          prompt
        );

      return res.json({
        reply,
        fallback: true,
      });
    }
  }
);

/* =========================================================
   DESKTOP API
   ========================================================= */

app.get(
  '/api/desktop/running-apps',
  async (_req, res) => {
    try {
      const response =
        await fetch(
          `${LOCAL_AGENT_URL}/running-apps`,
          {
            headers: {
              Authorization:
                LOCAL_AGENT_AUTH,
            },
            signal:
              AbortSignal.timeout(
                2000
              ),
          }
        );

      if (!response.ok) {
        return res.status(
          response.status
        ).json({
          runningApps: [],
          error:
            'Desktop agent unavailable.',
        });
      }

      const data =
        await response.json();

      return res.json(data);
    } catch {
      return res.json({
        runningApps: [],
        error:
          'Desktop agent daemon offline.',
      });
    }
  }
);

app.post(
  '/api/desktop/action',
  async (req, res) => {
    const {
      action,
      target,
      confirmationToken,
    } = req.body || {};

    if (!action || !target) {
      return res.status(400).json({
        error:
          'Action and target are required.',
      });
    }

    const application =
      APPLICATION_REGISTRY.find(
        (item) =>
          item.id === target ||
          item.name.toLowerCase() ===
            String(target).toLowerCase()
      );

    if (!application) {
      return res.status(403).json({
        success: false,
        error:
          'Application is not authorized.',
      });
    }

    const result =
      await callDesktopAgent(
        action,
        application.id,
        confirmationToken
      );

    return res.status(
      result.success ? 200 : 503
    ).json({
      ...result,
      targetApp:
        application.name,
    });
  }
);

/* =========================================================
   FALLBACK JARVIS ENGINE
   ========================================================= */

async function fallbackResponse(
  prompt: string
): Promise<string> {
  const lower =
    prompt.toLowerCase().trim();

  if (
    lower === 'hi' ||
    lower === 'hello' ||
    lower === 'hey' ||
    lower.includes('hello jarvis')
  ) {
    return 'Good day, sir. J.A.R.V.I.S. is online. How may I assist you?';
  }

  if (
    lower.includes(
      'who are you'
    )
  ) {
    return 'I am J.A.R.V.I.S., your AI voice assistant.';
  }

  if (
    lower.includes(
      'what can you do'
    )
  ) {
    return 'I can answer questions, search the web, calculate values, check weather, manage tasks, open websites, and interact with authorized desktop applications.';
  }

  if (
    lower.includes('weather') ||
    lower.includes('temperature')
  ) {
    const match =
      prompt.match(
        /(?:in|for|at)\s+([a-zA-Z\s]+)$/i
      );

    const location =
      match?.[1]?.trim() ||
      'London';

    const result =
      await fetchLiveWeather(
        location
      );

    if (result.status === 'live') {
      return `In ${result.location}, it is currently ${result.temperature} with ${result.condition.toLowerCase()}.`;
    }

    return `I could not retrieve live weather for ${location}.`;
  }

  if (
    lower.includes('time') ||
    lower.includes('date')
  ) {
    const result =
      await executeTool(
        'get_current_time',
        {}
      );

    return `The current time is ${result.currentTime} on ${result.currentDate}.`;
  }

  const math =
    classifyFastDirective(
      prompt
    );

  if (
    math.type === 'math' &&
    math.data
  ) {
    const result =
      evaluateMath(math.data);

    if (
      result.status ===
      'success'
    ) {
      return `${result.result}.`;
    }
  }

  if (
    lower.startsWith(
      'search '
    ) ||
    lower.startsWith(
      'search for '
    )
  ) {
    const query =
      prompt
        .replace(
          /^search(?:\s+for)?\s+/i,
          ''
        )
        .trim();

    const result =
      await searchLiveWeb(
        query
      );

    return result.summary;
  }

  const website =
    resolveWebsite(prompt);

  if (website) {
    return website.isSearch
      ? `Opening ${website.siteName} and searching for ${website.searchQuery}.`
      : `Opening ${website.siteName}.`;
  }

  return 'I am online and ready, sir. Please provide your directive.';
}

/* =========================================================
   TOOL FALLBACK TEXT
   ========================================================= */

function toolFallbackText(
  name: string,
  result: any
): string {
  switch (name) {
    case 'calculate_math':
      return `${result?.result || 'Calculation completed'}.`;

    case 'get_weather':
      if (result?.status === 'live') {
        return `It is currently ${result.temperature} with ${String(
          result.condition
        ).toLowerCase()}.`;
      }

      return 'I was unable to retrieve live weather data.';

    case 'get_current_time':
      return `The current time is ${result?.currentTime || 'unavailable'}.`;

    case 'search_web':
      return (
        result?.summary ||
        'The search has been completed.'
      );

    case 'open_desktop_application':
      return (
        result?.message ||
        `Opening ${result?.app || 'the application'}.`
      );

    case 'close_desktop_application':
      return (
        result?.message ||
        `${result?.app || 'The application'} has been closed.`
      );

    case 'open_website':
      return (
        result?.message ||
        'Opening the requested website.'
      );

    case 'manage_stark_task':
      if (
        result?.action ===
        'create'
      ) {
        return 'Task created successfully, sir.';
      }

      if (
        result?.action ===
        'list'
      ) {
        return `You currently have ${result.total || 0} tasks.`;
      }

      return 'Task protocol completed, sir.';

    default:
      return 'Directive processed, sir.';
  }
}

/* =========================================================
   START SERVER
   ========================================================= */

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      '=========================================='
    );

    console.log(
      ' J.A.R.V.I.S. BACKEND ONLINE'
    );

    console.log(
      '=========================================='
    );

    console.log(
      `Port: ${PORT}`
    );

    console.log(
      `Environment: ${
        process.env.NODE_ENV ||
        'development'
      }`
    );

    console.log(
      `Gemini: ${
        getGenAI()
          ? 'CONNECTED'
          : 'FALLBACK MODE'
      }`
    );

    console.log(
      `Desktop Agent: ${LOCAL_AGENT_URL}`
    );

    console.log(
      '=========================================='
    );
  }
);
