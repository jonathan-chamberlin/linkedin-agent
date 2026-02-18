export const SESSION_FILE = './session.json';

export const LINKEDIN_HOME = 'https://www.linkedin.com/feed/';
export const LINKEDIN_LOGIN = 'https://www.linkedin.com/login';

// LinkedIn selectors — update here when LinkedIn changes their DOM
export const SELECTORS = {
  startPostButton: 'button:has-text("Start a post")',
  postEditor: 'div[role="textbox"]',
  submitButton: 'button:has-text("Post")',
};

export const MODEL = 'anthropic/claude-sonnet-4-5';
export const MAX_POST_CHARS = 3000;
