const { buildFailureComment, resolveIssueKey } = require('../jira-report');

describe('jira-report helpers', () => {
  test('builds a readable Jira comment for failed tests', () => {
    const comment = buildFailureComment({
      issueKey: 'TEST-1',
      command: 'npm run test:auto',
      exitCode: 1,
      output: 'FAIL test suite\nError: something broke',
    });

    expect(comment).toContain('TEST-1');
    expect(comment).toContain('FAILED');
    expect(comment).toContain('npm run test:auto');
    expect(comment).toContain('Error: something broke');
  });

  test('resolves issue key from explicit argument or environment', () => {
    expect(resolveIssueKey(['--issue', 'XYZ-9'], {})).toBe('XYZ-9');
    expect(resolveIssueKey([], { JIRA_ISSUE_KEY: 'TEST-1' })).toBe('TEST-1');
    expect(resolveIssueKey([], {})).toBeUndefined();
  });

  test('connects to Jira using run.js --check and displays any connection error', () => {
    const jiraUrl = process.env.JIRA_URL;
    const jiraEmail = process.env.JIRA_EMAIL;
    const jiraToken = process.env.JIRA_TOKEN;

    if (!jiraUrl || !jiraEmail || !jiraToken) {
      console.warn('Skipping Jira integration test because Jira credentials are not set in environment.');
      return;
    }

    const result = require('child_process').spawnSync(process.execPath, [
      require('path').resolve(__dirname, '../run.js'),
      '--check',
    ], {
      cwd: require('path').resolve(__dirname, '..'),
      encoding: 'utf8',
      env: { ...process.env, JIRA_URL: jiraUrl, JIRA_EMAIL: jiraEmail, JIRA_TOKEN: jiraToken },
      shell: false,
    });

    const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
    expect(result.error).toBeUndefined();
    expect(output).toContain('"ok": true');
    expect(result.status).toBe(0);
  });
});
