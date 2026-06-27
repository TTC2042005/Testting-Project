const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jira-integration-'));
fs.copyFileSync(path.resolve(__dirname, 'run.js'), path.join(tmpDir, 'run.js'));
fs.copyFileSync(path.resolve(__dirname, 'jira.config.js'), path.join(tmpDir, 'jira.config.js'));
fs.writeFileSync(path.join(tmpDir, '.env'), 'JIRA_URL=https://example.atlassian.net\nJIRA_EMAIL=user@example.com\nJIRA_TOKEN=secret-token\n', 'utf8');

const result = spawnSync(process.execPath, [path.join(tmpDir, 'run.js')], {
  cwd: tmpDir,
  encoding: 'utf8',
});

fs.writeFileSync(path.resolve(__dirname, 'artifacts/integration-check.json'), JSON.stringify({
  status: result.status,
  stdout: result.stdout,
  stderr: result.stderr,
  tmpDir,
}, null, 2));
