import type { Token } from './Token';
import type { Diagnostic } from 'vscode-languageserver';
export declare class Lexer {
    /**
     * The zero-indexed position at which the token under consideration begins.
     */
    private start;
    /**
     * The zero-indexed position being examined for the token under consideration.
     */
    private current;
    /**
     * The zero-indexed begin line number being parsed.
     */
    private lineBegin;
    /**
     * The zero-indexed end line number being parsed
     */
    private lineEnd;
    /**
     * The zero-indexed begin column number being parsed.
     */
    private columnBegin;
    /**
     * The zero-indexed end column number being parsed
     */
    private columnEnd;
    /**
     * The BrightScript code being converted to an array of `Token`s.
     */
    source: string;
    /**
     * The tokens produced from `source`.
     */
    tokens: Token[];
    /**
     * The errors produced from `source.`
     */
    diagnostics: Diagnostic[];
    /**
     * The options used to scan this file
     */
    options: ScanOptions;
    /**
     * Contains all of the leading whitespace that has not yet been consumed by a token
     */
    private leadingWhitespace;
    /**
     * A convenience function, equivalent to `new Lexer().scan(toScan)`, that converts a string
     * containing BrightScript code to an array of `Token` objects that will later be used to build
     * an abstract syntax tree.
     *
     * @param toScan the BrightScript code to convert into tokens
     * @param options options used to customize the scan process
     * @returns an object containing an array of `errors` and an array of `tokens` to be passed to a parser.
     */
    static scan(toScan: string, options?: ScanOptions): Lexer;
    /**
     * Converts a string containing BrightScript code to an array of `Token` objects that will
     * later be used to build an abstract syntax tree.
     *
     * @param toScan the BrightScript code to convert into tokens
     * @param options options used to customize the scan process
     * @returns an object containing an array of `errors` and an array of `tokens` to be passed to a parser.
     */
    scan(toScan: string, options?: ScanOptions): this;
    /**
     * Fill in missing/invalid options with defaults
     */
    private sanitizeOptions;
    /**
     * Determines whether or not the lexer as reached the end of its input.
     * @returns `true` if the lexer has read to (or past) the end of its input, otherwise `false`.
     */
    private isAtEnd;
    /**
     * Map for looking up token functions based solely upon a single character
     * Should be used in conjunction with `tokenKindMap`
     */
    private static tokenFunctionMap;
    /**
     * Determine if the current position is at the beginning of a statement.
     * This means the token to the left, excluding whitespace, is either a newline or a colon
     */
    private isStartOfStatement;
    /**
     * Map for looking up token kinds based solely on a single character.
     * Should be used in conjunction with `tokenFunctionMap`
     */
    private static tokenKindMap;
    /**
     * Reads a non-deterministic number of characters from `source`, produces a `Token`, and adds it to
     * the `tokens` array.
     *
     * Accepts and returns nothing, because it's side-effect driven.
     */
    scanToken(): void;
    private comment;
    private whitespace;
    private newline;
    /**
     * Reads and returns the next character from `string` while **moving the current position forward**.
     */
    private advance;
    private lookaheadStack;
    private pushLookahead;
    private popLookahead;
    /**
     * Returns the character at position `current` or a null character if we've reached the end of
     * input.
     *
     * @returns the current character if we haven't reached the end of input, otherwise a null
     *          character.
     */
    private peek;
    /**
     * Returns the character after position `current`, or a null character if we've reached the end of
     * input.
     *
     * @returns the character after the current one if we haven't reached the end of input, otherwise a
     *          null character.
     */
    private peekNext;
    /**
     * Reads characters within a string literal, advancing through escaped characters to the
     * terminating `"`, and adds the produced token to the `tokens` array. Creates a `BrsError` if the
     * string is terminated by a newline or the end of input.
     */
    private string;
    /**
     * Reads characters within a string literal, advancing through escaped characters to the
     * terminating `"`, and adds the produced token to the `tokens` array. Creates a `BrsError` if the
     * string is terminated by a newline or the end of input.
     */
    private templateString;
    private templateQuasiString;
    /**
     * Reads characters within a base-10 number literal, advancing through fractional and
     * exponential portions as well as trailing type identifiers, and adds the produced token
     * to the `tokens` array. Also responsible for BrightScript's integer literal vs. float
     * literal rules.
     * @param hasSeenDecimal `true` if decimal point has already been found, otherwise `false`
     * @see https://sdkdocs.roku.com/display/sdkdoc/Expressions%2C+Variables%2C+and+Types#Expressions,Variables,andTypes-NumericLiterals
     */
    private decimalNumber;
    /**
     * Reads characters within a base-16 number literal, advancing through trailing type
     * identifiers, and adds the produced token to the `tokens` array. Also responsible for
     * BrightScript's integer literal vs. long-integer literal rules _for hex literals only_.
     *
     * @see https://sdkdocs.roku.com/display/sdkdoc/Expressions%2C+Variables%2C+and+Types#Expressions,Variables,andTypes-NumericLiterals
     */
    private hexadecimalNumber;
    /**
     * Reads characters within an identifier, advancing through alphanumeric characters. Adds the
     * produced token to the `tokens` array.
     */
    private identifier;
    /**
     * Check that the previous token was of the specified type
     */
    private checkPreviousToken;
    /**
     * Looks at the current char and returns true if at least one of the candidates is a match
     */
    private check;
    /**
     * Check the previous character
     */
    private checkPrevious;
    /**
     * Reads characters within an identifier with a leading '#', typically reserved for conditional
     * compilation. Adds the produced token to the `tokens` array.
     */
    private preProcessedConditional;
    /**
     * Find the closest previous non-whtespace token
     */
    private getPreviousNonWhitespaceToken;
    /**
     * Capture a regex literal token. Returns false if not found.
     * This is lookahead lexing which might techincally belong in the parser,
     * but it's easy enough to do here in the lexer
     */
    private regexLiteral;
    /**
     * Creates a `Token` and adds it to the `tokens` array.
     * @param kind the type of token to produce.
     */
    private addToken;
    /**
     * Move all location and char pointers to current position. Normally called after adding a token.
     */
    private sync;
    /**
     * Creates a `TokenLocation` at the lexer's current position for the provided `text`.
     * @returns the range of `text` as a `TokenLocation`
     */
    private rangeOf;
}
export interface ScanOptions {
    /**
     * If true, the whitespace tokens are included. If false, they are discarded
     */
    includeWhitespace: boolean;
}
