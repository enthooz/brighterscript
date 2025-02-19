export declare class Logger {
    prefix?: string;
    static subscribe(callback: any): () => void;
    private static emitter;
    /**
     * A string with whitespace used for indenting all messages
     */
    private indent;
    constructor(logLevel?: LogLevel, prefix?: string);
    get logLevel(): LogLevel;
    set logLevel(value: LogLevel);
    private _logLevel;
    getTimestamp(): string;
    private writeToLog;
    /**
     * Log an error message to the console
     */
    error(...messages: any[]): void;
    /**
     * Log a warning message to the console
     */
    warn(...messages: any[]): void;
    /**
     * Log a standard log message to the console
     */
    log(...messages: any[]): void;
    /**
     * Log an info message to the console
     */
    info(...messages: any[]): void;
    /**
     * Log a debug message to the console
     */
    debug(...messages: any[]): void;
    /**
     * Log a debug message to the console
     */
    trace(...messages: any[]): void;
    /**
     * Writes to the log (if logLevel matches), and also times how long the action took to occur.
     * `action` is called regardless of logLevel, so this function can be used to nicely wrap
     * pieces of functionality.
     * The action function also includes two parameters, `pause` and `resume`, which can be used to improve timings by focusing only on
     * the actual logic of that action.
     */
    time<T>(logLevel: LogLevel, messages: any[], action: (pause: () => void, resume: () => void) => T): T;
}
export declare function noop(): void;
export declare enum LogLevel {
    off = 0,
    error = 1,
    warn = 2,
    log = 3,
    info = 4,
    debug = 5,
    trace = 6
}
