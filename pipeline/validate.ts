/** `npm run data:validate [-- --strict]` */
import { loadCurated, printIssues, validate } from './lib/curated.ts';

const strict = process.argv.includes('--strict');
const { data, issues: parseIssues } = loadCurated();
const issues = [...parseIssues, ...validate(data, { strict })];
printIssues(issues);
const errors = issues.filter((i) => i.level === 'error').length;
console.log(`\n${errors} errori, ${issues.length - errors} avvisi${strict ? ' (strict)' : ''}`);
process.exit(errors ? 1 : 0);
