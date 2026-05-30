const path = require('path');

describe('jira.config.js', () => {
  const configPath = path.resolve(__dirname, '../jira.config.js');

  beforeEach(() => {
    jest.resetModules();
    delete process.env.JIRA_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_TOKEN;
  });

  test('returns values from environment variables', () => {
    process.env.JIRA_URL = 'https://example.atlassian.net';
    process.env.JIRA_EMAIL = 'user@example.com';
    process.env.JIRA_TOKEN = 'secret-token';

    const config = require(configPath);

    expect(config).toEqual({
      jiraUrl: 'https://example.atlassian.net',
      jiraEmail: 'user@example.com',
      jiraToken: 'secret-token',
    });
  });

  test('returns undefined for missing environment variables', () => {
    const config = require(configPath);

    expect(config).toEqual({
      jiraUrl: undefined,
      jiraEmail: undefined,
      jiraToken: undefined,
    });
  });
});
