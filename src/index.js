const core = require('@actions/core');
const crypto = require('crypto');

const API_BASE = 'https://myaispeed-worker.vankristoff.workers.dev';

async function fetchProviders() {
  const res = await fetch(`${API_BASE}/api/providers`);
  if (!res.ok) throw new Error(`Failed to fetch providers: ${res.status} ${res.statusText}`);
  return res.json();
}

async function testProvider(provider, testId, metadata) {
  const start = performance.now();
  const res = await fetch(`${API_BASE}/api/test/connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: provider.slug,
      test_id: testId,
      test_source: 'github_action',
      ...metadata,
    }),
  });
  const latency = Math.round(performance.now() - start);

  if (!res.ok) {
    return { provider: provider.slug, name: provider.name, latency: -1, status: 'error', error: `${res.status} ${res.statusText}` };
  }

  const data = await res.json();
  return { provider: provider.slug, name: provider.name, latency, status: 'ok', ...data };
}

function formatTable(results) {
  const nameWidth = Math.max(10, ...results.map(r => r.name.length)) + 2;
  const header = `${'Provider'.padEnd(nameWidth)} ${'Latency'.padStart(10)}  Status`;
  const separator = '─'.repeat(header.length);

  const rows = results.map(r => {
    const latencyStr = r.latency >= 0 ? `${r.latency} ms` : 'N/A';
    return `${r.name.padEnd(nameWidth)} ${latencyStr.padStart(10)}  ${r.status}`;
  });

  return [separator, header, separator, ...rows, separator].join('\n');
}

async function run() {
  const providersInput = core.getInput('providers');
  const failThreshold = parseInt(core.getInput('fail-threshold'), 10) || 0;
  const jsonOutput = core.getInput('json-output') === 'true';
  const testId = crypto.randomUUID();

  const metadata = {
    runner_os: process.env.RUNNER_OS || 'unknown',
    runner_arch: process.env.RUNNER_ARCH || 'unknown',
    repository: process.env.GITHUB_REPOSITORY || 'unknown',
  };

  core.info(`MyAISpeed Latency Test (test_id: ${testId})`);
  core.info(`Runner: ${metadata.runner_os}/${metadata.runner_arch} | Repo: ${metadata.repository}`);

  let providers = await fetchProviders();

  if (providersInput !== 'all') {
    const selected = providersInput.split(',').map(s => s.trim().toLowerCase());
    providers = providers.filter(p => selected.includes(p.slug.toLowerCase()));
    if (providers.length === 0) {
      core.setFailed(`No matching providers found for: ${providersInput}`);
      return;
    }
  }

  core.info(`Testing ${providers.length} provider(s)...\n`);

  const results = [];
  for (const provider of providers) {
    core.info(`  Testing ${provider.name}...`);
    const result = await testProvider(provider, testId, metadata);
    results.push(result);
  }

  core.info('');
  core.info(formatTable(results));

  if (jsonOutput) {
    core.info(`\nJSON Results:\n${JSON.stringify(results, null, 2)}`);
  }

  const successful = results.filter(r => r.status === 'ok' && r.latency >= 0);
  const fastest = successful.sort((a, b) => a.latency - b.latency)[0];

  core.setOutput('results', JSON.stringify(results));
  core.setOutput('fastest-provider', fastest ? fastest.provider : '');
  core.setOutput('fastest-latency', fastest ? String(fastest.latency) : '');

  if (fastest) {
    core.info(`\nFastest: ${fastest.name} (${fastest.latency} ms)`);
  }

  if (failThreshold > 0) {
    const exceeded = results.filter(r => r.status === 'ok' && r.latency > failThreshold);
    if (exceeded.length > 0) {
      const names = exceeded.map(r => `${r.name} (${r.latency} ms)`).join(', ');
      core.setFailed(`Latency threshold of ${failThreshold} ms exceeded by: ${names}`);
    }
  }
}

run().catch(err => {
  core.setFailed(`Action failed: ${err.message}`);
});
