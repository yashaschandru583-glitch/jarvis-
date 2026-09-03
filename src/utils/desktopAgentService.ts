import {
  DesktopActionDetail,
  DesktopActionStage,
  DesktopActionType,
  DesktopAgentState,
  RunningApplication,
} from '../types';
import { resolveApplication, resolveWebsite } from './appRegistry';

const DEFAULT_AGENT_URL = 'http://127.0.0.1:39281';
const DEFAULT_AUTH_TOKEN = 'STARK-JARVIS-SECURE-LOCAL-KEY';

class DesktopAgentService {
  private agentUrl: string = DEFAULT_AGENT_URL;
  private authToken: string = DEFAULT_AUTH_TOKEN;
  private state: DesktopAgentState = {
    isConnected: false,
    agentUrl: DEFAULT_AGENT_URL,
    authToken: DEFAULT_AUTH_TOKEN,
    platform: 'unknown',
    lastChecked: 0,
  };

  private listeners: Array<(state: DesktopAgentState) => void> = [];
  private actionListeners: Array<(action: DesktopActionDetail) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('jarvis_agent_url');
      const savedToken = localStorage.getItem('jarvis_agent_token');
      if (savedUrl) this.agentUrl = savedUrl;
      if (savedToken) this.authToken = savedToken;
      this.state.agentUrl = this.agentUrl;
      this.state.authToken = this.authToken;
    }
  }

  public subscribeState(listener: (state: DesktopAgentState) => void) {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public subscribeAction(listener: (action: DesktopActionDetail) => void) {
    this.actionListeners.push(listener);
    return () => {
      this.actionListeners = this.actionListeners.filter((l) => l !== listener);
    };
  }

  private notifyState() {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  private notifyAction(action: DesktopActionDetail) {
    for (const listener of this.actionListeners) {
      listener({ ...action });
    }
  }

  public getAgentUrl(): string {
    return this.agentUrl;
  }

  public setAgentUrl(url: string) {
    this.agentUrl = url;
    this.state.agentUrl = url;
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_agent_url', url);
    }
    this.notifyState();
    this.checkHealth();
  }

  public getAuthToken(): string {
    return this.authToken;
  }

  public setAuthToken(token: string) {
    this.authToken = token;
    this.state.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_agent_token', token);
    }
    this.notifyState();
    this.checkHealth();
  }

  public getState(): DesktopAgentState {
    return { ...this.state };
  }

  /**
   * Check connection to the local desktop agent
   */
  public async checkHealth(): Promise<{ isConnected: boolean; platform?: string; error?: string }> {
    // 1. First test direct connection to local daemon
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`${this.agentUrl}/status`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this.state = {
          isConnected: true,
          agentUrl: this.agentUrl,
          authToken: this.authToken,
          platform: data.platform || 'win32',
          version: data.version,
          lastChecked: Date.now(),
          error: undefined,
        };
        this.notifyState();
        return { isConnected: true, platform: data.platform };
      }
    } catch (_) {
      // Local daemon direct port not reached
    }

    // 2. Check server proxy /api/desktop/status (if running in local or container environment with bridge)
    try {
      const res = await fetch('/api/desktop/status');
      if (res.ok) {
        const data = await res.json();
        if (data.isConnected) {
          this.state = {
            isConnected: true,
            agentUrl: this.agentUrl,
            authToken: this.authToken,
            platform: data.platform || 'linux',
            version: data.version || '2.5.0 (Server Bridge)',
            lastChecked: Date.now(),
            error: undefined,
          };
          this.notifyState();
          return { isConnected: true, platform: data.platform };
        }
      }
    } catch (_) {}

    this.state = {
      isConnected: false,
      agentUrl: this.agentUrl,
      authToken: this.authToken,
      lastChecked: Date.now(),
      error: 'Desktop agent service unreachable on 127.0.0.1:39281',
    };
    this.notifyState();
    return { isConnected: false, error: this.state.error };
  }

  /**
   * Launch application alias
   */
  public openApp(appNameOrQuery: string) {
    return this.launchApplication(appNameOrQuery);
  }

  /**
   * Close application alias
   */
  public closeApp(appNameOrQuery: string, confirmed: boolean = false) {
    return this.closeApplication(appNameOrQuery, confirmed);
  }

  /**
   * Launch application via authorized desktop agent
   */
  public async launchApplication(appNameOrQuery: string): Promise<{
    success: boolean;
    message: string;
    actionDetail: DesktopActionDetail;
  }> {
    const actionId = `action-${Date.now()}`;
    const resolved = resolveApplication(appNameOrQuery);

    const targetLabel = resolved ? resolved.name.toUpperCase() : appNameOrQuery.toUpperCase();

    // Stage 1: COMMAND RECEIVED
    let detail: DesktopActionDetail = {
      id: actionId,
      type: 'OPEN_APPLICATION',
      stage: 'command_received',
      command: 'OPEN APPLICATION',
      target: targetLabel,
      statusText: 'COMMAND RECEIVED',
      appName: resolved?.name || appNameOrQuery,
      appId: resolved?.id,
      timestamp: Date.now(),
    };
    this.notifyAction(detail);

    // Short pause for holographic Arc Reactor HUD display
    await new Promise((r) => setTimeout(r, 200));

    // Stage 2: RESOLVING APPLICATION
    detail = {
      ...detail,
      stage: 'resolving',
      statusText: 'RESOLVING APPLICATION REGISTRY...',
    };
    this.notifyAction(detail);

    if (!resolved) {
      detail = {
        ...detail,
        stage: 'failed',
        statusText: 'APPLICATION NOT IN ALLOWLIST',
        error: `Application "${appNameOrQuery}" is not recognized in the secure application registry.`,
      };
      this.notifyAction(detail);
      return {
        success: false,
        message: `I cannot find "${appNameOrQuery}" in the authorized application registry.`,
        actionDetail: detail,
      };
    }

    await new Promise((r) => setTimeout(r, 200));

    // Stage 3: EXECUTING
    detail = {
      ...detail,
      stage: 'executing',
      statusText: 'LAUNCHING APPLICATION...',
    };
    this.notifyAction(detail);

    // Verify agent connection
    const health = await this.checkHealth();
    if (!health.isConnected) {
      detail = {
        ...detail,
        stage: 'failed',
        statusText: 'DESKTOP AGENT REQUIRED',
        error: 'Local desktop agent is not connected on 127.0.0.1:39281',
      };
      this.notifyAction(detail);
      return {
        success: false,
        message: 'To open or close desktop applications, please install and authorize the JARVIS desktop agent.',
        actionDetail: detail,
      };
    }

    // Attempt direct dispatch to local daemon
    try {
      const res = await fetch(`${this.agentUrl}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          action: 'OPEN_APPLICATION',
          target: resolved.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        detail = {
          ...detail,
          stage: 'success',
          statusText: 'APPLICATION OPEN',
        };
        this.notifyAction(detail);
        return {
          success: true,
          message: `${resolved.name} has been launched.`,
          actionDetail: detail,
        };
      } else {
        throw new Error(data.error || 'Failed to launch application');
      }
    } catch (directErr: any) {
      // Try server proxy fallback if available
      try {
        const proxyRes = await fetch('/api/desktop/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'OPEN_APPLICATION',
            target: resolved.id,
          }),
        });
        const proxyData = await proxyRes.json();
        if (proxyRes.ok && proxyData.success) {
          detail = {
            ...detail,
            stage: 'success',
            statusText: 'APPLICATION OPEN',
          };
          this.notifyAction(detail);
          return {
            success: true,
            message: `${resolved.name} has been launched.`,
            actionDetail: detail,
          };
        }
      } catch (_) {}

      detail = {
        ...detail,
        stage: 'failed',
        statusText: 'LAUNCH FAILED',
        error: directErr.message || 'Execution failed',
      };
      this.notifyAction(detail);
      return {
        success: false,
        message: `I couldn't open ${resolved.name}. It may not be installed or requires additional permissions.`,
        actionDetail: detail,
      };
    }
  }

  /**
   * Close application via authorized desktop agent
   */
  public async closeApplication(appNameOrQuery: string, confirmed: boolean = false): Promise<{
    success: boolean;
    requiresConfirmation?: boolean;
    message: string;
    actionDetail: DesktopActionDetail;
  }> {
    const actionId = `action-${Date.now()}`;
    const resolved = resolveApplication(appNameOrQuery);
    const targetLabel = resolved ? resolved.name.toUpperCase() : appNameOrQuery.toUpperCase();

    let detail: DesktopActionDetail = {
      id: actionId,
      type: 'CLOSE_APPLICATION',
      stage: 'command_received',
      command: 'CLOSE APPLICATION',
      target: targetLabel,
      statusText: 'COMMAND RECEIVED',
      appName: resolved?.name || appNameOrQuery,
      appId: resolved?.id,
      timestamp: Date.now(),
      requiresConfirmation: !confirmed,
    };
    this.notifyAction(detail);

    // If confirmation is required for potentially destructive action
    if (!confirmed) {
      detail = {
        ...detail,
        stage: 'resolving',
        statusText: 'CONFIRMATION REQUIRED',
        requiresConfirmation: true,
      };
      this.notifyAction(detail);
      return {
        success: false,
        requiresConfirmation: true,
        message: `Are you sure you wish to terminate ${resolved?.name || appNameOrQuery}? Unsaved work may be lost.`,
        actionDetail: detail,
      };
    }

    // Confirmed termination
    detail = {
      ...detail,
      stage: 'executing',
      statusText: 'TERMINATING PROCESS...',
      confirmed: true,
    };
    this.notifyAction(detail);

    if (!resolved) {
      detail = {
        ...detail,
        stage: 'failed',
        statusText: 'APPLICATION NOT FOUND',
      };
      this.notifyAction(detail);
      return {
        success: false,
        message: `I could not find "${appNameOrQuery}" in the application registry.`,
        actionDetail: detail,
      };
    }

    const health = await this.checkHealth();
    if (!health.isConnected) {
      detail = {
        ...detail,
        stage: 'failed',
        statusText: 'DESKTOP AGENT REQUIRED',
      };
      this.notifyAction(detail);
      return {
        success: false,
        message: 'To open or close desktop applications, please install and authorize the JARVIS desktop agent.',
        actionDetail: detail,
      };
    }

    try {
      const res = await fetch(`${this.agentUrl}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          action: 'CLOSE_APPLICATION',
          target: resolved.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        detail = {
          ...detail,
          stage: 'success',
          statusText: 'APPLICATION CLOSED',
        };
        this.notifyAction(detail);
        return {
          success: true,
          message: `${resolved.name} has been closed.`,
          actionDetail: detail,
        };
      } else {
        throw new Error(data.error || 'Failed to close');
      }
    } catch (err: any) {
      // Try proxy
      try {
        const proxyRes = await fetch('/api/desktop/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CLOSE_APPLICATION',
            target: resolved.id,
          }),
        });
        const proxyData = await proxyRes.json();
        if (proxyRes.ok && proxyData.success) {
          detail = {
            ...detail,
            stage: 'success',
            statusText: 'APPLICATION CLOSED',
          };
          this.notifyAction(detail);
          return {
            success: true,
            message: `${resolved.name} has been closed.`,
            actionDetail: detail,
          };
        }
      } catch (_) {}

      detail = {
        ...detail,
        stage: 'failed',
        statusText: 'TERMINATION FAILED',
        error: err.message,
      };
      this.notifyAction(detail);
      return {
        success: false,
        message: `I couldn't close ${resolved.name}. It may require additional permissions or is not currently running.`,
        actionDetail: detail,
      };
    }
  }

  /**
   * Open website or search URL in user's browser
   */
  public async openWebsite(promptOrUrl: string): Promise<{
    success: boolean;
    url: string;
    message: string;
    actionDetail: DesktopActionDetail;
  }> {
    const actionId = `action-${Date.now()}`;
    const resolution = resolveWebsite(promptOrUrl);
    const finalUrl = resolution?.url || (promptOrUrl.startsWith('http') ? promptOrUrl : `https://${promptOrUrl}`);
    const siteTitle = resolution ? resolution.siteName : 'BROWSER';

    let detail: DesktopActionDetail = {
      id: actionId,
      type: 'OPEN_WEBSITE',
      stage: 'command_received',
      command: 'OPEN WEBSITE',
      target: resolution?.isSearch ? `${siteTitle.toUpperCase()} SEARCH` : siteTitle.toUpperCase(),
      statusText: 'COMMAND RECEIVED',
      url: finalUrl,
      searchQuery: resolution?.searchQuery,
      timestamp: Date.now(),
    };
    this.notifyAction(detail);

    await new Promise((r) => setTimeout(r, 200));

    detail = {
      ...detail,
      stage: 'executing',
      statusText: resolution?.isSearch ? 'LAUNCHING SEARCH MATRIX...' : 'NAVIGATING TO URL...',
    };
    this.notifyAction(detail);

    // 1. Trigger window.open in browser
    let browserOpened = false;
    if (typeof window !== 'undefined') {
      try {
        const newWin = window.open(finalUrl, '_blank', 'noopener,noreferrer');
        if (newWin) browserOpened = true;
      } catch (_) {}
    }

    // 2. Also notify desktop agent if available
    try {
      await fetch(`${this.agentUrl}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          action: 'OPEN_WEBSITE',
          url: finalUrl,
        }),
      });
    } catch (_) {}

    detail = {
      ...detail,
      stage: 'success',
      statusText: resolution?.isSearch ? 'SEARCH RESULTS DISPLAYED' : 'WEBSITE OPENED',
    };
    this.notifyAction(detail);

    const spokenMsg = resolution?.isSearch
      ? `Opening ${resolution.siteName} and searching for ${resolution.searchQuery}, sir.`
      : `Opening ${resolution?.title || siteTitle}, sir.`;

    return {
      success: true,
      url: finalUrl,
      message: spokenMsg,
      actionDetail: detail,
    };
  }

  /**
   * Get list of detected running applications
   */
  public async getRunningApplications(): Promise<{
    success: boolean;
    runningApps: RunningApplication[];
    message: string;
  }> {
    const health = await this.checkHealth();
    if (!health.isConnected) {
      return {
        success: false,
        runningApps: [],
        message: 'The desktop agent is not connected, so I cannot detect active processes on your computer.',
      };
    }

    try {
      const res = await fetch(`${this.agentUrl}/running-apps`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const running = data.runningApps || [];
        const appNames = running.map((a: any) => a.name);
        const replyText =
          appNames.length > 0
            ? `${appNames.join(', ')} ${appNames.length === 1 ? 'is' : 'are'} currently running, sir.`
            : 'No monitored applications are currently running on your system.';
        return {
          success: true,
          runningApps: running,
          message: replyText,
        };
      }
    } catch (_) {}

    // Try server proxy fallback
    try {
      const proxyRes = await fetch('/api/desktop/running-apps');
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        const running = proxyData.runningApps || [];
        const appNames = running.map((a: any) => a.name);
        const replyText =
          appNames.length > 0
            ? `${appNames.join(', ')} ${appNames.length === 1 ? 'is' : 'are'} currently running, sir.`
            : 'No monitored applications are currently running.';
        return {
          success: true,
          runningApps: running,
          message: replyText,
        };
      }
    } catch (_) {}

    return {
      success: false,
      runningApps: [],
      message: 'I encountered an error retrieving the active process registry.',
    };
  }
}

export const desktopAgent = new DesktopAgentService();
export const desktopAgentService = desktopAgent;
