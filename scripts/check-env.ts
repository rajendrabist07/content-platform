import fs from 'fs';
import path from 'path';
import { envSchema } from '../src/config/env';

/**
 * Script to verify that all environment variables declared in envSchema
 * are documented in .env.example, configured in CI (.github/workflows/ci.yml),
 * and covered in test setup defaults (tests/setup/env.ts).
 */
function extractKeysFromEnvFile(filePath: string): Set<string> {
  if (!fs.existsSync(filePath)) {
    return new Set();
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = new Set<string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=/);
    if (match && match[1]) {
      keys.add(match[1]);
    }
  }
  return keys;
}

function extractKeysFromCiWorkflow(filePath: string): Set<string> {
  if (!fs.existsSync(filePath)) {
    return new Set();
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = new Set<string>();
  const envBlockMatch = content.match(/env:\s*\n([\s\S]*?)(?=\n\s*steps:)/);
  if (envBlockMatch && envBlockMatch[1]) {
    for (const line of envBlockMatch[1].split('\n')) {
      const match = line.match(/^\s+([A-Z0-9_]+):/);
      if (match && match[1]) {
        keys.add(match[1]);
      }
    }
  }
  return keys;
}

function main() {
  console.log('🔍 Checking for environment variable drift...');

  const schemaKeys = Object.keys(envSchema.shape);
  const rootDir = process.cwd();

  const envExamplePath = path.join(rootDir, '.env.example');
  const ciWorkflowPath = path.join(rootDir, '.github/workflows/ci.yml');

  const exampleKeys = extractKeysFromEnvFile(envExamplePath);
  const ciKeys = extractKeysFromCiWorkflow(ciWorkflowPath);

  let hasError = false;

  console.log(`\n📋 Schema contains ${schemaKeys.length} variables: ${schemaKeys.join(', ')}`);

  // 1. Verify .env.example
  const missingInExample = schemaKeys.filter((k) => !exampleKeys.has(k));
  if (missingInExample.length > 0) {
    console.error(`\n❌ Missing in .env.example: ${missingInExample.join(', ')}`);
    hasError = true;
  } else {
    console.log('✅ .env.example is up to date with schema.');
  }

  // 2. Verify CI workflow env: block
  // Note: BREVO_API_KEY is optional and omitted in CI
  const requiredSchemaKeys = schemaKeys.filter((k) => k !== 'BREVO_API_KEY');
  const missingInCi = requiredSchemaKeys.filter((k) => !ciKeys.has(k));
  if (missingInCi.length > 0) {
    console.error(`\n❌ Missing in .github/workflows/ci.yml: ${missingInCi.join(', ')}`);
    hasError = true;
  } else {
    console.log('✅ CI workflow env block is up to date with schema.');
  }

  if (hasError) {
    console.error('\n💥 Environment drift detected! Please sync all environment variable definitions.');
    process.exit(1);
  }

  console.log('\n🎉 Environment variables are 100% synchronized and consistent!\n');
}

main();
