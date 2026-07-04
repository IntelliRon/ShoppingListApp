# Pre-commit Hooks Setup

This project uses Husky and lint-staged to automatically format and lint code before commits.

## Installation

The hooks are automatically installed when you run:

```bash
npm install
```

This runs the `prepare` script in package.json, which calls `husky install`.

## What Gets Formatted

- **JavaScript files** (.js) - Prettier formatting
- **JSON files** (.json) - Prettier formatting
- **HTML files** (.html) - Prettier formatting
- **CSS files** (.css) - Prettier formatting
- **Markdown files** (.md) - Prettier formatting

**Note:** Kotlin and Gradle formatting is not currently supported by the repo's tooling setup. These files should be formatted manually or with IDE integration.

## Configuration Files

- `.lintstagedrc.json` - Defines which tools run on which file types
- `.prettierrc.json` - Prettier configuration (tabs, line width, quotes, etc.)
- `.prettierignore` - Files Prettier should skip
- `.husky/pre-commit` - The hook script that runs on commit

## Manual Formatting

To format all files without committing:

```bash
npm run format
```

To lint and fix JavaScript in the backend:

```bash
cd Web/server
npm run lint:fix
```

## Bypass Hooks (Not Recommended)

If you need to bypass pre-commit hooks for a specific commit:

```bash
git commit --no-verify
```

Only use this in exceptional circumstances.

## Troubleshooting

**Hooks not running?**

1. Ensure Node.js and npm are installed
2. Run `npm install` again
3. Run `husky install` manually
4. Check that `.husky/pre-commit` is executable

**Files not formatting?**

1. Check that the files are staged: `git status`
2. Run formatting manually first: `npx prettier --write .`
3. Check error output during commit for specific issues

**ktlint not found?**

The Kotlin formatter is optional. Install it with:

```bash
# macOS
brew install ktlint

# Windows (requires Chocolatey)
choco install ktlint
```

Or download from: https://github.com/pinterest/ktlint/releases
