import { chromium, BrowserContext } from 'playwright';
import { SESSION_FILE } from './config.js';
import fs from 'fs';

export async function getContext(headless: boolean = true): Promise<BrowserContext> {
  const browser = await chromium.launch({ headless, channel: 'chrome' });

  const storageState = fs.existsSync(SESSION_FILE) ? SESSION_FILE : undefined;

  const context = await browser.newContext({
    storageState,
    viewport: { width: 1280, height: 800 },
  });

  return context;
}

export async function saveContext(context: BrowserContext): Promise<void> {
  await context.storageState({ path: SESSION_FILE });
}
