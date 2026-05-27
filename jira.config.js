// Jira configuration loader
// dotenv is loaded by run.js, but we also try loading it here when required.
try {
  require('dotenv').config({ path: '.env' });
} catch (err) {
  // dotenv may not be installed when Jira config is required from another app.
}

const jiraConfig = {
  jiraUrl: process.env.JIRA_URL,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraToken: process.env.JIRA_TOKEN,
};

module.exports = jiraConfig;
