/**
 * Constants used throughout the Devbox Updater Action
 */
export declare const DEVBOX_API: {
    readonly BASE_URL: "https://search.devbox.sh/v2";
    readonly ENDPOINTS: {
        readonly RESOLVE: "/resolve";
        readonly PACKAGE: "/pkg";
    };
    readonly TIMEOUT: 30000;
    readonly MAX_RETRIES: 3;
    readonly RETRY_DELAY: 1000;
    readonly RETRY_MULTIPLIER: 2;
    readonly MAX_RETRY_DELAY: 10000;
};
export declare const FILES: {
    readonly DEVBOX_CONFIG: "devbox.json";
    readonly DEVBOX_LOCK: "devbox.lock";
};
export declare const GITHUB: {
    readonly DEFAULT_BRANCH_PREFIX: "devbox-updates";
    readonly DEFAULT_PR_TITLE: "Update Devbox packages";
    readonly PR_LABELS: readonly ["dependencies", "devbox", "automated"];
    readonly MAX_PR_BODY_LENGTH: 65536;
};
export declare const DEFAULTS: {
    readonly DEVBOX_VERSION: "latest";
    readonly MAX_RETRIES: 3;
    readonly TIMEOUT: 30000;
};
export declare const PATTERNS: {
    readonly PACKAGE_NAME: RegExp;
    readonly VERSION: RegExp;
    readonly BRANCH_NAME: RegExp;
};
