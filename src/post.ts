import readline from 'readline';
import fs from 'fs';
import { generatePost, generateQuestions, reviewDraft, Question } from './claude.js';
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

async function askQuestions(questions: Question[]): Promise<string[]> {
  const answers: string[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`\nQ${i + 1}: ${q.question}`);
    q.options.forEach((opt, j) => console.log(`  ${j + 1}) ${opt}`));
    console.log(`  ${q.options.length + 1}) Other (type your own)`);

    const answer = await prompt('> ');
    const num = parseInt(answer);

    if (num >= 1 && num <= q.options.length) {
      answers.push(q.options[num - 1]);
    } else if (num === q.options.length + 1 || isNaN(num)) {
      const custom = isNaN(num) && answer ? answer : await prompt('Your answer: ');
      answers.push(custom);
    } else {
      answers.push(q.options[0]);
    }
  }
  return answers;
}

async function askApproval(draft: string): Promise<{ action: 'post' | 'regenerate' | 'modify' | 'cancel'; feedback?: string }> {
  console.log('\n---');
  console.log(`(${draft.length}/${MAX_POST_CHARS} chars)`);

  const answer = await prompt('[P]ost / [M]odify / [R]egenerate / [C]ancel: ');
  const a = answer.toLowerCase();

  if (a === 'm') {
    const feedback = await prompt('How should it be changed? ');
    return { action: 'modify', feedback: feedback || undefined };
  }

  if (a === 'r') return { action: 'regenerate' };
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

  console.log('Analyzing your context...');
  const questions = await generateQuestions(context);
  const answers = await askQuestions(questions);

  const enrichedContext = context + '\n\nUser preferences:\n' +
    answers.map((a, i) => `- ${questions[i].question}: ${a}`).join('\n');

  console.log('\nGenerating draft...');
  const initialDraft = await generatePost(enrichedContext);
  let draft = await reviewDraft(initialDraft);

  while (true) {
    const { action, feedback } = await askApproval(draft);

    if (action === 'post') {
      console.log('Publishing...');
      await publishToLinkedIn(draft);
      console.log('Posted successfully.');
      break;
    } else if (action === 'modify') {
      console.log('Modifying...');
      const modified = await generatePost(enrichedContext, draft, feedback);
      draft = await reviewDraft(modified);
    } else if (action === 'regenerate') {
      console.log('Regenerating...');
      const regenerated = await generatePost(enrichedContext);
      draft = await reviewDraft(regenerated);
    } else {
      console.log('Cancelled.');
      break;
    }
  }
}
