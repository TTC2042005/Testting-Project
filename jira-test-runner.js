const { spawnSync } = require('child_process');
const path = require('path');
const { loadEnv, postFailureToJira, resolveIssueKey } = require('./jira-report');

(async () => {
  loadEnv();

  const cwd = path.resolve(__dirname);
  const args = process.argv.slice(2);
  const issueArgIndex = args.indexOf('--issue');
  const issueKey = issueArgIndex >= 0 && args[issueArgIndex + 1]
    ? args[issueArgIndex + 1]
    : resolveIssueKey([], process.env);
  const commandArgs = args.filter((arg, index) => !(arg === '--issue' || arg === '--issue-key' || index === issueArgIndex + 1));
  const testCommand = commandArgs.length > 0 ? commandArgs.join(' ') : 'npm run test:auto';

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['run', 'test:auto'], {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: process.env,
  });

  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (result.status === 0) {
    if (output) {
      process.stdout.write(output + '\n');
    }
    process.exit(0);
  }

  const failureMessage = output || `Test command failed with exit code ${result.status}`;
  const report = issueKey
    ? await postFailureToJira({
        issueKey,
        command: testCommand,
        exitCode: result.status || 1,
        output: failureMessage,
      })
    : { ok: false, skipped: true, reason: 'No Jira issue key provided' };

  if (output) {
    process.stderr.write(output + '\n');
  }
  process.stderr.write(JSON.stringify({ ok: false, jiraReport: report }, null, 2) + '\n');
  process.exit(result.status || 1);
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
