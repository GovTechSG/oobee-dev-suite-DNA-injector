export interface OobeeOptions {
    /** File path patterns to include for transformation. */
    includePatterns?: RegExp[];
    /** File path patterns to exclude from transformation. */
    excludePatterns?: RegExp[];
    /** Tag / component names that must never receive injected attributes. */
    blacklist?: string[];
    /** Prefix used for the injected data attributes. Defaults to `"data-oobee"`. */
    attributePrefix?: string;
    /** Enable or disable the transformation entirely. Defaults to `true`. */
    enabled?: boolean;
    /** Print a log line for every transformed file. Defaults to `false`. */
    verbose?: boolean;
}

export declare const DEFAULT_OPTIONS: Required<OobeeOptions>;

export declare function mergeOptions(userOptions?: OobeeOptions): Required<OobeeOptions>;
