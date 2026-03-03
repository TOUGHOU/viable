#!/usr/bin/env node

const args = process.argv.slice(2);

function printVersion() {
  console.log('@vibe/cli 0.0.0');
}

function main() {
  if (args.includes('--version') || args.includes('-v')) {
    printVersion();
    process.exit(0);
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: vibe [options]

Options:
  -v, --version  Show version
  -h, --help     Show this help
`);
    process.exit(0);
  }
  console.log('Vibe Coding CLI - ready for commands');
}

main();
