#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

function printHelp() {
  console.log(`Usage:
  npm run branches:cleanup -- [options]
  npm run branches:cleanup:force

Deletes local branches that track a remote branch and are either:
  - fully merged into the remote's default branch, or
  - no longer present on the remote (after pruning).

Options:
  --dry-run          Show what would happen without deleting branches
  --force            Also delete gone branches with unmerged local commits
  --no-fetch         Skip "git fetch --prune"
  --remote <name>    Remote to inspect (default: origin)
  -h, --help         Show this help

The current branch, the remote default branch, main, master, develop, and
development are always protected.`);
}

function parseArguments(argv) {
  const options = {
    dryRun: false,
    fetch: true,
    // npm consumes `--force` when it appears before `--`, exposing it here instead.
    force: process.env.npm_config_force === 'true',
    remote: 'origin',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--dry-run') {
      options.dryRun = true;
    } else if (argument === '--force') {
      options.force = true;
    } else if (argument === '--no-fetch') {
      options.fetch = false;
    } else if (argument === '--remote') {
      options.remote = argv[index + 1];
      index += 1;
      if (!options.remote) {
        throw new Error('--remote requires a remote name');
      }
    } else if (argument.startsWith('--remote=')) {
      options.remote = argument.slice('--remote='.length);
      if (!options.remote) {
        throw new Error('--remote requires a remote name');
      }
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  return options;
}

function runGit(args, { allowFailure = false, cwd = process.cwd() } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !allowFailure) {
    const stderr = (result.stderr || '').trim();
    throw new Error(stderr || `git ${args.join(' ')} failed`);
  }

  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
  };
}

function refExists(ref, cwd) {
  return runGit(['show-ref', '--verify', '--quiet', ref], {
    allowFailure: true,
    cwd,
  }).ok;
}

function findDefaultBranch(remote, cwd) {
  const remoteHead = `refs/remotes/${remote}/HEAD`;
  const symbolicHead = runGit(['symbolic-ref', '--quiet', '--short', remoteHead], {
    allowFailure: true,
    cwd,
  });

  if (symbolicHead.ok) {
    return symbolicHead.stdout;
  }

  for (const branch of ['main', 'master']) {
    const candidate = `${remote}/${branch}`;
    if (refExists(`refs/remotes/${candidate}`, cwd)) {
      return candidate;
    }
  }

  throw new Error(
    `Cannot determine ${remote}'s default branch. Run "git remote set-head ${remote} --auto" and try again.`,
  );
}

function listLocalBranches(cwd) {
  const output = runGit(
    ['for-each-ref', '--format=%(refname:short)%00%(upstream:short)', 'refs/heads/'],
    { cwd },
  ).stdout;

  if (!output) {
    return [];
  }

  return output.split(/\r?\n/).map((line) => {
    const [name, upstream = ''] = line.split('\0');
    return { name, upstream };
  });
}

function isMergedInto(branch, target, cwd) {
  return runGit(['merge-base', '--is-ancestor', branch, target], {
    allowFailure: true,
    cwd,
  }).ok;
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const repositoryCheck = runGit(['rev-parse', '--is-inside-work-tree'], {
    allowFailure: true,
  });
  if (!repositoryCheck.ok || repositoryCheck.stdout !== 'true') {
    throw new Error('Run this command inside a Git working tree.');
  }

  const cwd = runGit(['rev-parse', '--show-toplevel']).stdout;
  if (!runGit(['remote', 'get-url', options.remote], { allowFailure: true, cwd }).ok) {
    throw new Error(`Remote "${options.remote}" does not exist.`);
  }

  if (options.fetch) {
    console.log(`Fetching and pruning ${options.remote}...`);
    runGit(['fetch', '--prune', options.remote], { cwd });
  }

  const defaultRemoteBranch = findDefaultBranch(options.remote, cwd);
  const defaultLocalBranch = defaultRemoteBranch.slice(options.remote.length + 1);
  const currentBranch = runGit(['branch', '--show-current'], { cwd }).stdout;
  const protectedBranches = new Set([
    currentBranch,
    defaultLocalBranch,
    'main',
    'master',
    'develop',
    'development',
  ]);
  const remotePrefix = `${options.remote}/`;
  const branches = listLocalBranches(cwd);
  let deleted = 0;
  let skipped = 0;

  console.log(`Using ${defaultRemoteBranch} as the merge target.`);

  for (const branch of branches) {
    if (protectedBranches.has(branch.name) || !branch.upstream.startsWith(remotePrefix)) {
      continue;
    }

    const upstreamExists = refExists(`refs/remotes/${branch.upstream}`, cwd);
    const merged = isMergedInto(branch.name, defaultRemoteBranch, cwd);
    const gone = !upstreamExists;

    if (!merged && !gone) {
      continue;
    }

    const reasons = [];
    if (merged) {
      reasons.push(`merged into ${defaultRemoteBranch}`);
    }
    if (gone) {
      reasons.push(`upstream ${branch.upstream} is gone`);
    }

    if (gone && !merged && !options.force) {
      console.log(`SKIP   ${branch.name} (${reasons.join('; ')}; use --force to delete)`);
      skipped += 1;
      continue;
    }

    if (options.dryRun) {
      console.log(`DELETE ${branch.name} (${reasons.join('; ')}) [dry run]`);
    } else {
      runGit(['branch', '-D', '--', branch.name], { cwd });
      console.log(`DELETE ${branch.name} (${reasons.join('; ')})`);
    }
    deleted += 1;
  }

  const action = options.dryRun ? 'would be deleted' : 'deleted';
  console.log(`Done: ${deleted} branch(es) ${action}, ${skipped} unmerged gone branch(es) skipped.`);
}

try {
  main();
} catch (error) {
  console.error(`Branch cleanup failed: ${error.message}`);
  process.exit(1);
}
