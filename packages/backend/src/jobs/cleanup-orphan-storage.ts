interface CliOptions {
  execute: boolean;
  minAgeHours: number;
  prefix?: string;
  maxDelete?: number;
  json: boolean;
}

const DEFAULT_MIN_AGE_HOURS = 24;

type CleanupResult = import('../services/orphan-storage-cleanup.service').OrphanStorageCleanupResult;
let closeDatabasePool: (() => Promise<void>) | undefined;

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    execute: false,
    minAgeHours: DEFAULT_MIN_AGE_HOURS,
    json: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--':
        break;
      case '--execute':
        options.execute = true;
        break;
      case '--dry-run':
        options.execute = false;
        break;
      case '--json':
        options.json = true;
        break;
      case '--min-age-hours':
        options.minAgeHours = parseNonNegativeNumber(args[index + 1], arg);
        index += 1;
        break;
      case '--prefix':
        options.prefix = requireValue(args[index + 1], arg).replace(/^\/+|\/+$/g, '');
        index += 1;
        break;
      case '--max-delete':
        options.maxDelete = parseNonNegativeInteger(args[index + 1], arg);
        index += 1;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function requireValue(value: string | undefined, flag: string): string {
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseNonNegativeNumber(value: string | undefined, flag: string): number {
  const parsed = Number(requireValue(value, flag));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative number`);
  }
  return parsed;
}

function parseNonNegativeInteger(value: string | undefined, flag: string): number {
  const parsed = parseNonNegativeNumber(value, flag);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${flag} must be a non-negative integer`);
  }
  return parsed;
}

function printHelp(): void {
  console.log(`
Usage:
  pnpm --filter @humanly/backend cleanup:orphan-storage [options]

Options:
  --dry-run                  Report orphan storage objects without deleting them (default)
  --execute                  Delete eligible orphan storage objects
  --min-age-hours <hours>    Only treat objects older than this as eligible (default: 24)
  --prefix <prefix>          Storage key prefix to scan (default: FILE_STORAGE_KEY_PREFIX/GCS_UPLOAD_PREFIX/files)
  --max-delete <count>       Safety cap for one execute run
  --json                     Print machine-readable JSON
  --help                     Show this help
`.trim());
}

function printTextSummary(result: CleanupResult): void {
  console.log(`Mode: ${result.execute ? 'execute' : 'dry-run'}`);
  console.log(`Provider: ${result.storageProvider}`);
  console.log(`Prefix: ${result.prefix || '(none)'}`);
  console.log(`Minimum age: ${result.minAgeHours} hour(s)`);
  console.log(`Scanned objects: ${result.scanned}`);
  console.log(`Referenced keys: ${result.referenced}`);
  console.log(`Eligible orphan candidates: ${result.orphanCandidates}`);
  console.log(`Skipped young/unversioned objects: ${result.skippedYoung}`);
  console.log(`Deleted objects: ${result.deleted}`);
  console.log(`Failed deletes: ${result.failed}`);
  console.log(`Eligible bytes: ${result.bytesEligible}`);
  console.log(`Deleted bytes: ${result.bytesDeleted}`);

  if (result.sampleCandidates.length > 0) {
    console.log('Sample candidates:');
    for (const storageKey of result.sampleCandidates) {
      console.log(`- ${storageKey}`);
    }
  }

  if (result.failures.length > 0) {
    console.log('Failures:');
    for (const failure of result.failures) {
      console.log(`- ${failure.storageKey}: ${failure.message}`);
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const [{ OrphanStorageCleanupService }, { pool }] = await Promise.all([
    import('../services/orphan-storage-cleanup.service'),
    import('../config/database'),
  ]);
  closeDatabasePool = () => pool.end();

  const result = await OrphanStorageCleanupService.run(options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printTextSummary(result);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (closeDatabasePool) {
      await Promise.race([
        closeDatabasePool(),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
    }
    process.exit(process.exitCode || 0);
  });
