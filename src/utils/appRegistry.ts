import { ApplicationRegistryItem } from '../types';

/**
 * JARVIS Cross-Platform Application Registry
 * Supported platforms: Windows, macOS, Linux
 * Executables and process signatures are verified against strict security allowlists.
 */
export const APPLICATION_REGISTRY: ApplicationRegistryItem[] = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    aliases: ['chrome', 'google chrome', 'browser', 'google', 'web browser', 'internet'],
    executables: {
      windows: 'chrome',
      mac: 'open -a "Google Chrome"',
      linux: 'google-chrome || google-chrome-stable || chromium-browser || chromium',
    },
    processNames: ['chrome.exe', 'Google Chrome', 'chrome', 'chromium', 'chromium-browser'],
    icon: 'Globe',
    category: 'browser',
    description: 'High-speed web browser by Google',
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    aliases: ['vs code', 'vscode', 'visual studio code', 'code', 'code editor', 'editor'],
    executables: {
      windows: 'code',
      mac: 'code || open -a "Visual Studio Code"',
      linux: 'code',
    },
    processNames: ['Code.exe', 'code', 'Visual Studio Code'],
    icon: 'Code',
    category: 'development',
    description: 'Extensible code editor for software engineering',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    aliases: ['calculator', 'calc', 'calc.exe'],
    executables: {
      windows: 'calc.exe',
      mac: 'open -a Calculator',
      linux: 'gnome-calculator || kcalc || xcalc',
    },
    processNames: ['CalculatorApp.exe', 'Calculator.exe', 'calc.exe', 'Calculator', 'gnome-calculator', 'kcalc'],
    icon: 'Calculator',
    category: 'system',
    description: 'Numerical arithmetic and scientific calculation tool',
  },
  {
    id: 'notepad',
    name: 'Notepad',
    aliases: ['notepad', 'text editor', 'notes', 'textedit', 'gedit'],
    executables: {
      windows: 'notepad.exe',
      mac: 'open -a TextEdit',
      linux: 'gedit || kate || mousepad || nano',
    },
    processNames: ['notepad.exe', 'Notepad.exe', 'TextEdit', 'gedit', 'kate', 'mousepad'],
    icon: 'FileText',
    category: 'productivity',
    description: 'Standard plain text and documentation editor',
  },
  {
    id: 'explorer',
    name: 'File Explorer',
    aliases: ['file explorer', 'explorer', 'files', 'finder', 'folder', 'my computer', 'file manager'],
    executables: {
      windows: 'explorer.exe',
      mac: 'open .',
      linux: 'xdg-open . || nautilus . || dolphin .',
    },
    processNames: ['explorer.exe', 'Finder', 'nautilus', 'dolphin'],
    icon: 'Folder',
    category: 'system',
    description: 'System storage and filesystem directory explorer',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    aliases: ['spotify', 'music', 'spotify music', 'songs'],
    executables: {
      windows: 'spotify',
      mac: 'open -a Spotify',
      linux: 'spotify',
    },
    processNames: ['Spotify.exe', 'spotify', 'Spotify'],
    icon: 'Music',
    category: 'media',
    description: 'Digital audio and music streaming platform',
  },
  {
    id: 'discord',
    name: 'Discord',
    aliases: ['discord', 'chat', 'voice chat'],
    executables: {
      windows: 'discord',
      mac: 'open -a Discord',
      linux: 'discord',
    },
    processNames: ['Discord.exe', 'discord', 'Discord'],
    icon: 'MessageSquare',
    category: 'communication',
    description: 'Voice, video, and text communication platform',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    aliases: ['terminal', 'command prompt', 'cmd', 'powershell', 'console', 'bash', 'zsh'],
    executables: {
      windows: 'wt.exe || cmd.exe || powershell.exe',
      mac: 'open -a Terminal',
      linux: 'x-terminal-emulator || gnome-terminal || konsole || xterm',
    },
    processNames: ['WindowsTerminal.exe', 'cmd.exe', 'powershell.exe', 'Terminal', 'gnome-terminal-server', 'konsole', 'xterm'],
    icon: 'Terminal',
    category: 'system',
    description: 'Direct command-line operating system interface',
  },
  {
    id: 'slack',
    name: 'Slack',
    aliases: ['slack', 'work chat', 'stark messaging'],
    executables: {
      windows: 'slack',
      mac: 'open -a Slack',
      linux: 'slack',
    },
    processNames: ['slack.exe', 'Slack', 'slack'],
    icon: 'Hash',
    category: 'communication',
    description: 'Enterprise workspace team communication network',
  },
  {
    id: 'browser',
    name: 'Default Browser',
    aliases: ['my browser', 'default browser', 'the browser'],
    executables: {
      windows: 'start https://www.google.com',
      mac: 'open https://www.google.com',
      linux: 'xdg-open https://www.google.com',
    },
    processNames: ['chrome.exe', 'msedge.exe', 'firefox.exe', 'Safari', 'chrome', 'firefox'],
    icon: 'Compass',
    category: 'browser',
    description: 'Primary operating system default web navigator',
  },
];

/**
 * Resolve application name or spoken alias against the allowed registry
 */
export function resolveApplication(query: string): ApplicationRegistryItem | null {
  if (!query) return null;
  const clean = query.trim().toLowerCase().replace(/^(open|launch|start|run|bring up|close|quit|kill|shut down)\s+/i, '');
  
  // Exact ID match
  const exactId = APPLICATION_REGISTRY.find((app) => app.id === clean);
  if (exactId) return exactId;

  // Exact Name match
  const exactName = APPLICATION_REGISTRY.find((app) => app.name.toLowerCase() === clean);
  if (exactName) return exactName;

  // Exact Alias match
  const aliasMatch = APPLICATION_REGISTRY.find((app) =>
    app.aliases.some((alias) => alias.toLowerCase() === clean)
  );
  if (aliasMatch) return aliasMatch;

  // Substring alias match
  const partialMatch = APPLICATION_REGISTRY.find((app) =>
    app.aliases.some((alias) => clean.includes(alias.toLowerCase()) || alias.toLowerCase().includes(clean))
  );
  if (partialMatch) return partialMatch;

  return null;
}

export interface WebsiteResolution {
  url: string;
  title: string;
  siteName: string;
  searchQuery?: string;
  isSearch: boolean;
}

/**
 * Known website URL mappings and search URL builders
 */
export const KNOWN_WEBSITES: Record<string, {
  name: string;
  baseUrl: string;
  searchUrl: (q: string) => string;
  aliases: string[];
}> = {
  youtube: {
    name: 'YouTube',
    baseUrl: 'https://www.youtube.com',
    searchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    aliases: ['youtube', 'yt', 'you tube'],
  },
  google: {
    name: 'Google',
    baseUrl: 'https://www.google.com',
    searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    aliases: ['google', 'google search', 'goog'],
  },
  github: {
    name: 'GitHub',
    baseUrl: 'https://github.com',
    searchUrl: (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
    aliases: ['github', 'git hub', 'git'],
  },
  gmail: {
    name: 'Gmail',
    baseUrl: 'https://mail.google.com',
    searchUrl: (q) => `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(q)}`,
    aliases: ['gmail', 'google mail', 'email', 'my email', 'inbox'],
  },
  chatgpt: {
    name: 'ChatGPT',
    baseUrl: 'https://chatgpt.com',
    searchUrl: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
    aliases: ['chatgpt', 'chat gpt', 'openai'],
  },
  wikipedia: {
    name: 'Wikipedia',
    baseUrl: 'https://en.wikipedia.org',
    searchUrl: (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
    aliases: ['wikipedia', 'wiki'],
  },
  reddit: {
    name: 'Reddit',
    baseUrl: 'https://www.reddit.com',
    searchUrl: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
    aliases: ['reddit'],
  },
  twitter: {
    name: 'X (Twitter)',
    baseUrl: 'https://x.com',
    searchUrl: (q) => `https://x.com/search?q=${encodeURIComponent(q)}`,
    aliases: ['twitter', 'x', 'x.com'],
  },
  linkedin: {
    name: 'LinkedIn',
    baseUrl: 'https://www.linkedin.com',
    searchUrl: (q) => `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(q)}`,
    aliases: ['linkedin', 'linked in'],
  },
  netflix: {
    name: 'Netflix',
    baseUrl: 'https://www.netflix.com',
    searchUrl: (q) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
    aliases: ['netflix'],
  },
  amazon: {
    name: 'Amazon',
    baseUrl: 'https://www.amazon.com',
    searchUrl: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
    aliases: ['amazon'],
  },
};

/**
 * Resolve natural language website queries such as:
 * - "Open YouTube"
 * - "Search YouTube for Python tutorials"
 * - "Jarvis, open YouTube and search for Python tutorials."
 * - "Go to Google and search for artificial intelligence."
 * - "Open GitHub"
 */
export function resolveWebsite(prompt: string): WebsiteResolution | null {
  const lower = prompt.trim().toLowerCase();

  // Check for smart search patterns:
  // e.g. "search youtube for python tutorials"
  // e.g. "open youtube and search for python tutorials"
  // e.g. "go to google and search for artificial intelligence"
  const searchPattern = /(?:open|go to)?\s*([a-zA-Z0-9\s]+?)\s*(?:and)?\s*(?:search(?:\s+for)?|look up)\s+(.+)/i;
  const searchMatch = lower.match(searchPattern);

  if (searchMatch) {
    const siteKey = searchMatch[1].trim();
    const query = searchMatch[2].trim();

    for (const [key, site] of Object.entries(KNOWN_WEBSITES)) {
      if (site.aliases.some((a) => siteKey.includes(a) || a === siteKey)) {
        return {
          url: site.searchUrl(query),
          title: `${site.name} Search: ${query}`,
          siteName: site.name,
          searchQuery: query,
          isSearch: true,
        };
      }
    }

    // Default search on Google if unknown site specified in search command
    if (query) {
      return {
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        title: `Google Search: ${query}`,
        siteName: 'Google',
        searchQuery: query,
        isSearch: true,
      };
    }
  }

  // Check for simple "open [website]" or "go to [website]"
  const openPattern = /(?:open|launch|go to|browse to|visit)\s+([a-zA-Z0-9.\-_/\s]+)/i;
  const openMatch = lower.match(openPattern);
  const target = (openMatch ? openMatch[1] : lower).trim();

  // Match known website
  for (const [key, site] of Object.entries(KNOWN_WEBSITES)) {
    if (site.aliases.some((a) => target === a || target.startsWith(a + ' ') || target.endsWith(' ' + a))) {
      return {
        url: site.baseUrl,
        title: site.name,
        siteName: site.name,
        isSearch: false,
      };
    }
  }

  // If target looks like a valid URL or domain
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+/.test(target)) {
    const cleanUrl = target.startsWith('http') ? target : `https://${target}`;
    return {
      url: cleanUrl,
      title: target,
      siteName: target,
      isSearch: false,
    };
  }

  return null;
}
