import 'dotenv/config';
import { runLogin } from './login.js';
import { runPost } from './post.js';

const [,, command, ...args] = process.argv;

if (command === 'login') {
  await runLogin();
} else if (command === 'post') {
  const context = args.join(' ');
  if (!context) {
    console.error('Usage: npm run post -- "context about what you built or learned"');
    process.exit(1);
  }
  await runPost(context);
} else {
  console.log('Commands: login | post "context"');
  process.exit(1);
}
