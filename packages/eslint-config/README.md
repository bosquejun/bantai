# @bantai-dev/eslint-config

> Shared ESLint configurations for the Bantai monorepo

This package provides consistent ESLint configurations across the Bantai monorepo. It includes configurations for base TypeScript projects, Next.js applications, and React libraries.

## Installation

```bash
npm install --save-dev @bantai-dev/eslint-config
# or
pnpm add -D @bantai-dev/eslint-config
# or
yarn add -D @bantai-dev/eslint-config
```

## Available Configurations

### Base Configuration (`base`)

Base ESLint configuration for TypeScript projects. Includes:

- TypeScript ESLint recommended rules
- Prettier integration (disables conflicting rules)
- Turbo plugin for monorepo support
- Only-warn plugin (converts errors to warnings)

**Usage:**

```javascript
// eslint.config.js
import { config } from '@bantai-dev/eslint-config/base';

export default config;
```

**Features:**
- TypeScript support
- Prettier compatibility
- Turbo monorepo rules
- Ignores `dist/**` directory

### Next.js Configuration (`next-js`)

ESLint configuration for Next.js applications. Extends the base configuration and adds:

- Next.js ESLint plugin
- React and React Hooks support
- Next.js core web vitals rules
- Service worker globals

**Usage:**

```javascript
// eslint.config.js
import { nextJsConfig } from '@bantai-dev/eslint-config/next-js';

export default nextJsConfig;
```

**Features:**
- All base configuration features
- Next.js specific rules
- React Hooks rules
- Core Web Vitals checks
- Ignores `.next/`, `out/`, `build/` directories

### React Internal Configuration (`react-internal`)

ESLint configuration for React libraries. Extends the base configuration and adds:

- React plugin
- React Hooks plugin
- Browser and service worker globals

**Usage:**

```javascript
// eslint.config.js
import { config } from '@bantai-dev/eslint-config/react-internal';

export default config;
```

**Features:**
- All base configuration features
- React recommended rules
- React Hooks rules
- Browser environment globals
- JSX transform support (no React import required)

## Examples

### TypeScript Package

For a TypeScript package in the monorepo:

```javascript
// packages/my-package/eslint.config.js
import { config } from '@bantai-dev/eslint-config/base';

export default config;
```

### Next.js Application

For a Next.js application:

```javascript
// apps/my-app/eslint.config.js
import { nextJsConfig } from '@bantai-dev/eslint-config/next-js';

export default nextJsConfig;
```

### React Component Library

For a React component library:

```javascript
// packages/ui-components/eslint.config.js
import { config } from '@bantai-dev/eslint-config/react-internal';

export default config;
```

## Extending Configurations

You can extend any configuration with additional rules:

```javascript
// eslint.config.js
import { config } from '@bantai-dev/eslint-config/base';

export default [
  ...config,
  {
    rules: {
      // Your custom rules
      'no-console': 'warn',
    },
  },
];
```

## Included Plugins

- **@eslint/js**: Core ESLint JavaScript rules
- **typescript-eslint**: TypeScript linting
- **eslint-config-prettier**: Disables ESLint rules that conflict with Prettier
- **eslint-plugin-turbo**: Turbo monorepo linting rules
- **eslint-plugin-only-warn**: Converts errors to warnings
- **eslint-plugin-react**: React linting rules
- **eslint-plugin-react-hooks**: React Hooks linting rules
- **@next/eslint-plugin-next**: Next.js specific linting rules

## Requirements

- ESLint >= 9.0.0
- TypeScript >= 5.0.0
- Node.js >= 18

## License

MIT
