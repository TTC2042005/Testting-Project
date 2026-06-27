const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.resolve(__dirname, '.env');

const resolveIssueKey = (args = [], env = process.env) => {
  const issueIndex = args.indexOf('--issue');
  if (issueIndex >= 0 && args[issueIndex + 1]) {
    return args[issueIndex + 1];
  }

  return env.JIRA_ISSUE_KEY || undefined;
};

const loadJiraReportModule = () => {
  try {
    return require('./jira-report');
  } catch (error) {
    return null;
  }
};

const loadEnv = () => {
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

const requestJira = (pathName, options = {}) => new Promise((resolve, reject) => {
  const config = require('./jira.config.js');
  const jiraUrl = new URL(config.jiraUrl);
  const req = https.request(
    {
      hostname: jiraUrl.hostname,
      port: jiraUrl.port || 443,
      path: pathName,
      method: options.method || 'GET',
      protocol: jiraUrl.protocol,
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.jiraEmail}:${config.jiraToken}`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Jira request failed with ${res.statusCode}: ${data}`));
          return;
        }

        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (error) {
          reject(error);
        }
      });
    },
  );

  req.on('error', reject);
  if (options.body) {
    req.write(JSON.stringify(options.body));
  }
  req.end();
});

const run = async () => {
  loadEnv();

  const config = require('./jira.config.js');
  const args = process.argv.slice(2);
  const issueKeyIndex = args.indexOf('--issue');
  const commentIndex = args.indexOf('--comment');
  const checkOnly = args.includes('--check') || args.includes('--health');
  const shouldComment = issueKeyIndex >= 0 && commentIndex >= 0;
  const issueKey = resolveIssueKey(args);

  if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken) {
    console.error(JSON.stringify({
      ok: false,
      error: 'Missing Jira credentials. Set JIRA_URL, JIRA_EMAIL, and JIRA_TOKEN in jira/.env or environment variables.',
      jiraConfig: {
        jiraUrl: config.jiraUrl || null,
        jiraEmail: config.jiraEmail || null,
      },
    }, null, 2));
    process.exit(1);
    return;
  }

  if (!checkOnly && !shouldComment) {
    console.error(JSON.stringify({
      ok: false,
      error: 'No Jira action specified. Use --check or --issue <KEY> --comment "<text>".',
    }, null, 2));
    process.exit(1);
    return;
  }

  if (shouldComment) {
    const issueKey = args[issueKeyIndex + 1];
    const comment = args[commentIndex + 1];
    if (!issueKey || !comment) {
      throw new Error('Usage: node run.js --issue <KEY> --comment "text"');
    }

    const result = await requestJira(`/rest/api/3/issue/${issueKey}/comment`, {
      method: 'POST',
      body: {
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
      },
    });

    console.log(JSON.stringify({ ok: true, issueKey, commentAdded: true, result }, null, 2));
    process.exit(0);
    return;
  }

  const account = await requestJira('/rest/api/3/myself');
  console.log(JSON.stringify({ ok: true, check: 'connected', account, jiraUrl: config.jiraUrl }, null, 2));

  if (checkOnly) {
    process.exit(0);
    return;
  }

  console.log('Tip: run "node run.js --issue <ISSUE_KEY> --comment \"Your update\"" to post an update to Jira.');
  process.exit(0);
};

const handleError = async (error) => {
  const config = require('./jira.config.js');
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check') || args.includes('--health');
  const shouldComment = args.indexOf('--issue') >= 0 && args.indexOf('--comment') >= 0;

  if (checkOnly && !shouldComment) {
    console.error(JSON.stringify({ ok: false, error: error.message, mode: 'check', reason: 'Jira connectivity test failed' }, null, 2));
    process.exit(1);
    return;
  }

  if (shouldComment) {
    const issueKey = resolveIssueKey(args);
    if (!issueKey) {
      console.error(JSON.stringify({ ok: false, error: error.message, jiraReport: { ok: false, skipped: true, reason: 'No Jira issue key provided' } }, null, 2));
      process.exit(1);
      return;
    }

    const jiraReport = loadJiraReportModule();
    if (jiraReport && typeof jiraReport.postFailureToJira === 'function') {
      try {
        const result = await jiraReport.postFailureToJira({ issueKey, command: args.join(' '), exitCode: 1, output: error.message });
        console.error(JSON.stringify({ ok: false, error: error.message, jiraReport: result }, null, 2));
        process.exit(1);
        return;
      } catch (reportError) {
        console.error(JSON.stringify({ ok: false, error: error.message, jiraReportError: reportError.message }, null, 2));
        process.exit(1);
        return;
      }
    }

    console.error(JSON.stringify({ ok: false, error: error.message, jiraReport: { ok: false, skipped: true, reason: 'Jira report helper unavailable' } }, null, 2));
    process.exit(1);
    return;
  }

  console.log(JSON.stringify(config));
  process.exit(0);
};

run().catch(handleError);
