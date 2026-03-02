#!/usr/bin/env node
/**
 * Scenario: Next.js App Router + Supabase + TypeScript + Tailwind
 * Expected: nextjs project with supabase detected, edge functions, RLS, SSR
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FORGEBEE_ROOT = process.env.FORGEBEE_ROOT || path.resolve(__dirname, '../..');
const TMPDIR = process.env.TMPDIR || os.tmpdir();
const SCENARIO_DIR = path.join(TMPDIR, 'nextjs-supabase');

// Helper to get nested property from object
function getPath(obj, pathStr) {
  const parts = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.');
  return parts.reduce((current, part) => {
    if (current === null || current === undefined) return undefined;
    return current[part];
  }, obj);
}

// Helper assertion function
function assertEq(pathStr, expected) {
  const actual = getPath(output, pathStr);
  if (String(actual) !== String(expected)) {
    console.error(`FAIL: ${pathStr} expected '${expected}', got '${actual}'`);
    console.error(`Full output: ${JSON.stringify(output, null, 2)}`);
    process.exit(1);
  }
}

// Helper to check if string/array contains value
function assertContains(pathStr, value) {
  const actual = getPath(output, pathStr);
  if (typeof actual === 'string') {
    if (!actual.includes(value)) {
      console.error(`FAIL: ${pathStr} expected to contain '${value}', got '${actual}'`);
      process.exit(1);
    }
  } else if (Array.isArray(actual)) {
    if (!actual.includes(value)) {
      console.error(`FAIL: ${pathStr} expected to contain '${value}', got ${JSON.stringify(actual)}`);
      process.exit(1);
    }
  } else {
    console.error(`FAIL: ${pathStr} is not a string or array`);
    process.exit(1);
  }
}

// Setup
fs.mkdirSync(SCENARIO_DIR, { recursive: true });

fs.writeFileSync(
  path.join(SCENARIO_DIR, 'package.json'),
  `{
  "name": "my-saas-app",
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.44.0",
    "@supabase/ssr": "^0.4.0",
    "tailwindcss": "^3.4.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
`
);

fs.writeFileSync(path.join(SCENARIO_DIR, 'pnpm-lock.yaml'), '');

// Next.js App Router
fs.mkdirSync(path.join(SCENARIO_DIR, 'app'), { recursive: true });

fs.writeFileSync(
  path.join(SCENARIO_DIR, 'tsconfig.json'),
  '{ "compilerOptions": { "strict": true } }'
);

fs.writeFileSync(
  path.join(SCENARIO_DIR, 'tailwind.config.ts'),
  'export default { content: ["./app/**/*.{ts,tsx}"] }'
);

// Supabase config
fs.mkdirSync(path.join(SCENARIO_DIR, 'supabase', 'migrations'), { recursive: true });
fs.mkdirSync(path.join(SCENARIO_DIR, 'supabase', 'functions', 'process-webhook'), { recursive: true });

fs.writeFileSync(
  path.join(SCENARIO_DIR, 'supabase', 'config.toml'),
  `[api]
port = 54321
`
);

fs.writeFileSync(
  path.join(SCENARIO_DIR, 'supabase', 'migrations', '20240101000000_init.sql'),
  `CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
`
);

fs.writeFileSync(
  path.join(SCENARIO_DIR, 'supabase', 'functions', 'process-webhook', 'index.ts'),
  'Deno.serve(async (req) => new Response("ok"));'
);

fs.writeFileSync(
  path.join(SCENARIO_DIR, 'supabase', 'seed.sql'),
  `INSERT INTO public.profiles (id, display_name) VALUES ('00000000-0000-0000-0000-000000000000', 'Test User');
`
);

fs.writeFileSync(
  path.join(SCENARIO_DIR, '.env'),
  `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-key
`
);

fs.mkdirSync(path.join(SCENARIO_DIR, 'lib'), { recursive: true });
fs.writeFileSync(
  path.join(SCENARIO_DIR, 'lib', 'realtime.ts'),
  `const channel = supabase.channel('test').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {}).subscribe();
`
);

// Run detection
const detectScript = path.join(FORGEBEE_ROOT, 'skills/project-router/scripts/detect_project.js');
let output;
try {
  const result = execSync(`node "${detectScript}" "${SCENARIO_DIR}"`, { encoding: 'utf8' });
  output = JSON.parse(result);
} catch (e) {
  console.error('Failed to run detect_project.js');
  console.error(e.message);
  process.exit(1);
}

// Core project detection
assertEq('project_type', 'nextjs');
assertEq('node.framework', 'nextjs');
assertEq('node.typescript', 'true');
assertEq('node.package_manager', 'pnpm');

// Supabase detection
assertEq('supabase.detected', 'true');
assertEq('supabase.edge_function_count', '1');
assertEq('database.orm', 'supabase');
assertEq('database.engine', 'postgresql');

// Supabase features
const featuresStr = getPath(output, 'supabase.features').join(',');
if (!featuresStr.includes('migrations')) {
  console.error('FAIL: migrations not in supabase.features');
  process.exit(1);
}
if (!featuresStr.includes('edge-functions')) {
  console.error('FAIL: edge-functions not in supabase.features');
  process.exit(1);
}
if (!featuresStr.includes('seed')) {
  console.error('FAIL: seed not in supabase.features');
  process.exit(1);
}
if (!featuresStr.includes('rls')) {
  console.error('FAIL: rls not in supabase.features');
  process.exit(1);
}
if (!featuresStr.includes('ssr')) {
  console.error('FAIL: ssr not in supabase.features');
  process.exit(1);
}
if (!featuresStr.includes('realtime')) {
  console.error('FAIL: realtime not in supabase.features');
  process.exit(1);
}

// Styling
const stylingStr = getPath(output, 'styling.systems').join(',');
if (!stylingStr.includes('tailwindcss')) {
  console.error('FAIL: tailwindcss not in styling.systems');
  process.exit(1);
}

console.log('All assertions passed');
