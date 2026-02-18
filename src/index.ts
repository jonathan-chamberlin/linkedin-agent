import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { runLogin } from './login.js';
import { runPost } from './post.js';

const [,, command, ...args] = process.argv;

if (command === 'login') {
  await runLogin();
} else if (command === 'post') {
  const context = args[0]?.trim();
  if (!context) {
    console.error('Usage: linkedin "context" "file1 file2 ..."');
    process.exit(1);
  }

  let fullContext = context;
  const fileArg = args[1]?.trim();
  if (fileArg) {
    for (const file of fileArg.split(/\s+/).filter(Boolean)) {
      const resolved = path.resolve(file);
      if (!fs.existsSync(resolved)) {
        console.error(`File not found: ${resolved}`);
        process.exit(1);
      }
      const content = fs.readFileSync(resolved, 'utf-8');
      fullContext += `\n\n--- ${path.basename(resolved)} ---\n${content}`;
    }
  }

  await runPost(fullContext);
} else {
  console.log('Commands: login | post "context"');
  process.exit(1);
}
