import { getContext, saveContext } from './browser.js';
import { LINKEDIN_LOGIN, SESSION_FILE } from './config.js';

export async function runLogin(): Promise<void> {
  console.log('Opening browser. Log in to LinkedIn, then come back here.');

  const context = await getContext(false);
  const page = await context.newPage();

  await page.goto(LINKEDIN_LOGIN);

  // Wait until the URL leaves the login page (up to 3 minutes for 2FA)
  await page.waitForURL(url => !url.href.includes('/login'), {
    timeout: 180_000,
  });

  await saveContext(context);
  await context.browser()?.close();

  console.log(`Session saved to ${SESSION_FILE}. You won't need to log in again until it expires.`);
}
