import type { Token } from '../lexer/Token';
import type * as CC from './Chunk';
import type { Diagnostic } from 'vscode-languageserver';
import type { Manifest } from './Manifest';
/**
 * A simple pre-processor that executes BrightScript's conditional compilation directives by
 * selecting chunks of tokens to be considered for later evaluation.
 */
export declare class Preprocessor implements CC.Visitor {
    private constants;
    /** The set of errors encountered when pre-processing conditional compilation directives. */
    diagnostics: Diagnostic[];
    processedTokens: Token[];
    /**
     * Filters the tokens contained within a set of chunks based on a set of constants.
     * @param tokens the tokens
     * @param manifest a manifest used to extract bs_const properties from
     * @returns an object containing an array of `errors` and an array of `processedTokens` filtered by conditional
     *          compilation directives included within
     */
    process(tokens: Token[], manifest: Manifest): this;
    filter(chunks: ReadonlyArray<CC.Chunk>, bsConst?: Map<string, boolean>): this;
    static process(tokens: Token[], manifest: Manifest): Preprocessor;
    /**
     * Emits an error via this processor's `events` property, then throws it.
     * @param diagnostic the ParseError to emit then throw
     */
    private addError;
    /**
     * Handles a simple chunk of BrightScript tokens by returning the tokens contained within.
     * @param chunk the chunk to extract tokens from
     * @returns the array of tokens contained within `chunk`
     */
    visitBrightScript(chunk: CC.BrightScriptChunk): Token[];
    /**
     * Handles a BrightScript `#const` directive, creating a variable in-scope only for the
     * conditional compilation pass.
     * @param chunk the `#const` directive, including the name and variable to use for the constant
     * @returns an empty array, since `#const` directives are always removed from the evaluated script.
     */
    visitDeclaration(chunk: CC.DeclarationChunk): any[];
    /**
     * Throws an error, stopping "compilation" of the program.
     * @param chunk the error to report to users
     * @throws a JavaScript error with the provided message
     */
    visitError(chunk: CC.ErrorChunk): never;
    /**
     * Produces tokens from a branch of a conditional-compilation `#if`, or no tokens if no branches evaluate to `true`.
     * @param chunk the `#if` directive, any `#else if` or `#else` directives, and their associated BrightScript chunks.
     * @returns an array of tokens to include in the final executed script.
     */
    visitIf(chunk: CC.HashIfStatement): Token[];
    /**
     * Resolves a token to a JavaScript boolean value, or throws an error.
     * @param token the token to resolve to either `true`, `false`, or an error
     * @throws if attempting to reference an undefined `#const` or if `token` is neither `true`, `false`, nor an identifier.
     */
    evaluateCondition(token: Token): boolean;
}
