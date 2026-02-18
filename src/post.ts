import readline from 'readline';
import fs from 'fs';
import { generatePost } from './claude.js';
import { getContext } from './browser.js';
import { LINKEDIN_HOME, SELECTORS, SESSION_FILE, MAX_POST_CHARS } from './config.js';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function askApproval(draft: string): Promise<{ action: 'post' | 'regenerate' | 'cancel'; feedback?: string }> {
  console.log('\n--- DRAFT ---\n');
  console.log(draft);
  console.log('\n--- END DRAFT ---\n');
  console.log(`(${draft.length}/${MAX_POST_CHARS} chars)`);

  const answer = await prompt('[P]ost / [R]egenerate / [C]ancel: ');
  const a = answer.toLowerCase();

  if (a === 'r') {
    const feedback = await prompt('What should be different? ');
    return { action: 'regenerate', feedback: feedback || undefined };
  }

  if (a === 'p') return { action: 'post' };
  return { action: 'cancel' };
}

async function publishToLinkedIn(postText: string): Promise<void> {
  const context = await getContext(false);
  const page = await context.newPage();

  await page.goto(LINKEDIN_HOME, { waitUntil: 'networkidle' });
  await page.click(SELECTORS.startPostButton);
  await page.waitForSelector(SELECTORS.postEditor, { timeout: 10_000 });
  await page.click(SELECTORS.postEditor);
  await page.keyboard.type(postText, { delay: 30 });
  await page.click(SELECTORS.submitButton);

  // Wait for the modal to close, confirming the post went through
  await page.waitForSelector(SELECTORS.postEditor, { state: 'hidden', timeout: 15_000 });
  await context.browser()?.close();
}

export async function runPost(context: string): Promise<void> {
  if (!fs.existsSync(SESSION_FILE)) {
    console.error('No session found. Run `npm run login` first.');
    process.exit(1);
  }

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY not set. Add it to your .env file.');
    process.exit(1);
  }

  console.log(`Generating post about: "${context}"...`);
  let draft = await generatePost(context);

  while (true) {
    const { action, feedback } = await askApproval(draft);

    if (action === 'post') {
      console.log('Publishing...');
      await publishToLinkedIn(draft);
      console.log('Posted successfully.');
      break;
    } else if (action === 'regenerate') {
      console.log('Regenerating...');
      draft = await generatePost(context, draft, feedback);
    } else {
      console.log('Cancelled.');
      break;
    }
  }
}
