const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('Integration test for run.js', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jira-integration-'));
    fs.copyFileSync(path.resolve(__dirname, '../../run.js'), path.join(tmpDir, 'run.js'));
    fs.copyFileSync(path.resolve(__dirname, '../../jira.config.js'), path.join(tmpDir, 'jira.config.js'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('loads .env file and prints Jira config object', () => {
    const envData = [
      'JIRA_URL=https://example.atlassian.net',
      'JIRA_EMAIL=user@example.com',
      'JIRA_TOKEN=secret-token',
    ].join('\n');

    fs.writeFileSync(path.join(tmpDir, '.env'), envData, 'utf8');

    const result = spawnSync(process.execPath, [path.join(tmpDir, 'run.js')], {
      cwd: tmpDir,
      encoding: 'utf8',
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
