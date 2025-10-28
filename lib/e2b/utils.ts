"use server";

import Kernel from '@onkernel/sdk';
import { Stagehand } from "@browserbasehq/stagehand";
import { resolution } from "./tool";

const KERNEL_API_KEY = "sk_bb9ec7e8-9e45-42a5-9d68-72736f11ef05.ffpPsG9fh2Gh+g1uWxA1U8+d7PW29Kpjiqm1+/XlBWk";

// Global storage for browser sessions
const browserSessions = new Map<string, {
  sessionId: string;
  cdpUrl: string;
  liveViewUrl: string;
  stagehand: any;
  page: any;
}>();

export const getDesktop = async (id?: string) => {
  try {
    // If ID provided, try to reuse existing session
    if (id && browserSessions.has(id)) {
      const session = browserSessions.get(id);
      if (session) {
        console.log("Reusing existing Kernel browser session:", id);
        return createDesktopAPI(session);
      }
    }

    // Create new Kernel browser session
    const kernel = new Kernel({ apiKey: KERNEL_API_KEY });
    console.log("Creating new Kernel browser...");
    
    const kernelBrowser = await kernel.browsers.create({ 
      stealth: true,
    });

    console.log("Kernel browser created. Session ID:", kernelBrowser.session_id);
    console.log("Live view URL:", kernelBrowser.browser_live_view_url);

    // Initialize Stagehand with Kernel browser
    const stagehand = new Stagehand({
      env: 'LOCAL',
      verbose: 1,
      domSettleTimeoutMs: 30_000,
      modelName: 'openai/gpt-4.1',
      modelClientOptions: {
        apiKey: process.env.OPENAI_API_KEY
      },
      localBrowserLaunchOptions: {
        cdpUrl: kernelBrowser.cdp_ws_url
      }
    });

    await stagehand.init();
    const page = stagehand.page;

    // Set viewport to match resolution
    await (page as any).setViewport({
      width: resolution.x,
      height: resolution.y,
    });

    const session = {
      sessionId: kernelBrowser.session_id,
      cdpUrl: kernelBrowser.cdp_ws_url,
      liveViewUrl: kernelBrowser.browser_live_view_url || '',
      stagehand,
      page,
    };

    browserSessions.set(kernelBrowser.session_id, session);

    return createDesktopAPI(session);
  } catch (error) {
    console.error("Error in getDesktop:", error);
    throw error;
  }
};

// Create E2B-compatible API wrapper
function createDesktopAPI(session: {
  sessionId: string;
  cdpUrl: string;
  liveViewUrl: string;
  stagehand: any;
  page: any;
}) {
  const { page, sessionId } = session;

  return {
    sandboxId: sessionId,
    stream: {
      getUrl: () => session.liveViewUrl,
      start: async () => {
        // No-op, stream is already available
      }
    },
    screenshot: async () => {
      const screenshot = await page.screenshot({
        encoding: 'binary',
        fullPage: false,
      });
      return Buffer.from(screenshot);
    },
    leftClick: async (x: number, y: number) => {
      await page.mouse.click(x, y);
    },
    rightClick: async (x: number, y: number) => {
      await page.mouse.click(x, y, { button: 'right' });
    },
    doubleClick: async () => {
      await page.mouse.click(0, 0, { clickCount: 2 });
    },
    moveMouse: async (x: number, y: number) => {
      await page.mouse.move(x, y);
    },
    write: async (text: string) => {
      await page.keyboard.type(text);
    },
    press: async (key: string) => {
      // Convert key names to Puppeteer format
      const keyMap: Record<string, string> = {
        'enter': 'Enter',
        'return': 'Enter',
        'tab': 'Tab',
        'backspace': 'Backspace',
        'delete': 'Delete',
        'escape': 'Escape',
        'esc': 'Escape',
        'space': 'Space',
        'pageup': 'PageUp',
        'pagedown': 'PageDown',
        'end': 'End',
        'home': 'Home',
        'arrowleft': 'ArrowLeft',
        'arrowup': 'ArrowUp',
        'arrowright': 'ArrowRight',
        'arrowdown': 'ArrowDown',
      };
      
      const puppeteerKey = keyMap[key.toLowerCase()] || key;
      await page.keyboard.press(puppeteerKey);
    },
    scroll: async (direction: 'up' | 'down' | 'left' | 'right', amount: number) => {
      const scrollAmount = amount * 100; // Convert scroll amount
      
      if (direction === 'up') {
        await page.mouse.wheel({ deltaY: -scrollAmount });
      } else if (direction === 'down') {
        await page.mouse.wheel({ deltaY: scrollAmount });
      } else if (direction === 'left') {
        await page.mouse.wheel({ deltaX: -scrollAmount });
      } else if (direction === 'right') {
        await page.mouse.wheel({ deltaX: scrollAmount });
      }
    },
    drag: async (start: [number, number], end: [number, number]) => {
      const [startX, startY] = start;
      const [endX, endY] = end;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      await page.mouse.up();
    },
    commands: {
      run: async (command: string, options?: { timeoutMs?: number }) => {
        // Kernel browsers don't have shell access like E2B Desktop
        // We'll return a warning message
        console.warn("Shell commands not supported in Kernel browsers");
        return {
          stdout: "Shell commands are not available in browser-only environment",
          stderr: "This is a browser, not a desktop environment",
          exitCode: 1,
        };
      }
    },
    isRunning: async () => {
      // Check if Stagehand page is still active
      try {
        await page.evaluate(() => true);
        return true;
      } catch {
        return false;
      }
    },
    kill: async () => {
      await killDesktop(sessionId);
    }
  };
}

export const getDesktopURL = async (id?: string) => {
  try {
    const desktop = await getDesktop(id);
    const streamUrl = desktop.stream.getUrl();

    return { streamUrl, id: desktop.sandboxId };
  } catch (error) {
    console.error("Error in getDesktopURL:", error);
    throw error;
  }
};

export const killDesktop = async (id: string) => {
  try {
    const kernel = new Kernel({ apiKey: KERNEL_API_KEY });
    
    // Close Stagehand connection if exists
    if (browserSessions.has(id)) {
      const session = browserSessions.get(id);
      if (session) {
        try {
          await session.stagehand.close();
        } catch (e) {
          console.log("Stagehand already closed or disconnected");
        }
        browserSessions.delete(id);
      }
    }

    // Delete Kernel browser session
    await kernel.browsers.deleteByID(id);
    console.log("Kernel browser session deleted:", id);
  } catch (error) {
    console.error("Error killing desktop:", error);
    throw error;
  }
};
