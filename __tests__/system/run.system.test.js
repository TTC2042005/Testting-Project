const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('System test for jira runner', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jira-system-'));
    fs.copyFileSync(path.resolve(__dirname, '../../package.json'), path.join(tmpDir, 'package.json'));
    fs.copyFileSync(path.resolve(__dirname, '../../run.js'), path.join(tmpDir, 'run.js'));
    fs.copyFileSync(path.resolve(__dirname, '../../jira.config.js'), path.join(tmpDir, 'jira.config.js'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('npm start loads .env and prints Jira config object', () => {
    const envData = [
      'JIRA_URL=https://example.atlassian.net',
      'JIRA_EMAIL=user@example.com',
      'JIRA_TOKEN=secret-token',
    ].join('\n');

    fs.writeFileSync(path.join(tmpDir, '.env'), envData, 'utf8');

    const result = spawnSync('cmd.exe', ['/c', 'npm', '--silent', 'start'], {
      cwd: tmpDir,
      encoding: 'utf8',
      env: { ...process.env },
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(
      JSON.stringify({
        jiraUrl: 'https://example.atlassian.net',
        jiraEmail: 'user@example.com',
        jiraToken: 'secret-token',
      })
    );
  });
});
