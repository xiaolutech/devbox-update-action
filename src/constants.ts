/**
 * Constants used throughout the Devbox Updater Action
 */

// Devbox Search API configuration
export const DEVBOX_API = {
  BASE_URL: 'https://search.devbox.sh/v2',
  ENDPOINTS: {
    RESOLVE: '/resolve',
    PACKAGE: '/pkg'
  },
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000 // 1 second base delay
} as const;

// File paths and names
export const FILES = {
  DEVBOX_CONFIG: 'devbox.json',
  DEVBOX_LOCK: 'devbox.lock'
} as const;

// GitHub-related constants
export const GITHUB = {
  DEFAULT_BRANCH_PREFIX: 'devbox-updates',
  DEFAULT_PR_TITLE: 'Update Devbox packages',
  PR_LABELS: ['dependencies', 'devbox', 'automated'],
  MAX_PR_BODY_LENGTH: 65536 // GitHub's limit
} as const;

// Action configuration defaults
export const DEFAULTS = {
  DEVBOX_VERSION: 'latest',
  MAX_RETRIES: 3,
  TIMEOUT: 30000
} as const;

// Validation patterns
export const PATTERNS = {
  PACKAGE_NAME: /^[a-zA-Z0-9_-]+(@[a-zA-Z0-9._-]+)?$/,
  VERSION: /^[a-zA-Z0-9._-]+$/,
  BRANCH_NAME: /^[a-zA-Z0-9/_-]+$/
} as const;