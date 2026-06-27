const fs = require('fs');
const path = require('path');
const https = require('https');

const loadEnv = () => {
  const envPath = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContents = fs.readFileSync(envPath, 'utf8');
  envContents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const idx = line.indexOf('=');
    if (idx < 0) {
      return;
    }

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    process.env[key] = value;
  });
};

const buildFailureComment = ({ issueKey, command, exitCode, output }) => {
  const summary = [
    `Issue: ${issueKey}`,
    'Status: FAILED',
    `Command: ${command}`,
    `Exit code: ${exitCode}`,
    '---',
    output || 'No output captured.',
  ].join('\n');

  return summary;
};

const resolveIssueKey = (args = [], env = process.env) => {
  const issueIndex = args.indexOf('--issue');
  if (issueIndex >= 0 && args[issueIndex + 1]) {
    return args[issueIndex + 1];
  }

  return env.JIRA_ISSUE_KEY || undefined;
};

const postFailureToJira = async ({ issueKey, command, exitCode, output }) => {
  loadEnv();

  const config = require('./jira.config.js');
  if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken || !issueKey) {
    return { ok: false, skipped: true, reason: 'Missing Jira config or issue key' };
  }

  const comment = buildFailureComment({ issueKey, command, exitCode, output });

  return new Promise((resolve) => {
    const jiraUrl = new URL(config.jiraUrl);
    const req = https.request(
      {
        hostname: jiraUrl.hostname,
        port: jiraUrl.port || 443,
        path: `/rest/api/3/issue/${issueKey}/comment`,
        method: 'POST',
        protocol: jiraUrl.protocol,
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.jiraEmail}:${config.jiraToken}`).toString('base64')}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            resolve({ ok: false, skipped: false, reason: `Jira request failed with ${res.statusCode}: ${data}` });
            return;
          }

          resolve({ ok: true, skipped: false, result: data ? JSON.parse(data) : {} });
        });
      },
    );

    req.on('error', (error) => {
      resolve({ ok: false, skipped: false, reason: error.message });
    });

    req.write(JSON.stringify({
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: comment }],
          },
        ],
      },
    }));
    req.end();
  });
};

module.exports = {
  loadEnv,
  buildFailureComment,
  resolveIssueKey,
  postFailureToJira,
};
