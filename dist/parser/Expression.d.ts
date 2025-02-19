import type { Token, Identifier } from '../lexer/Token';
import type { Block, CommentStatement, FunctionStatement } from './Statement';
import type { Range } from 'vscode-languageserver';
import type { BrsTranspileState } from './BrsTranspileState';
import { ParseMode } from './Parser';
import type { WalkOptions, WalkVisitor } from '../astUtils/visitors';
import type { TranspileResult, TypedefProvider } from '../interfaces';
import type { BscType } from '../types/BscType';
import { FunctionType } from '../types/FunctionType';
import { Expression } from './AstNode';
import { SourceNode } from 'source-map';
export declare type ExpressionVisitor = (expression: Expression, parent: Expression) => void;
export declare class BinaryExpression extends Expression {
    left: Expression;
    operator: Token;
    right: Expression;
    constructor(left: Expression, operator: Token, right: Expression);
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class CallExpression extends Expression {
    readonly callee: Expression;
    /**
     * Can either be `(`, or `?(` for optional chaining
     */
    readonly openingParen: Token;
    readonly closingParen: Token;
    readonly args: Expression[];
    static MaximumArguments: number;
    constructor(callee: Expression, 
    /**
     * Can either be `(`, or `?(` for optional chaining
     */
    openingParen: Token, closingParen: Token, args: Expression[], unused?: any);
    readonly range: Range;
    /**
     * Get the name of the wrapping namespace (if it exists)
     * @deprecated use `.findAncestor(isNamespaceStatement)` instead.
     */
    get namespaceName(): NamespacedVariableNameExpression;
    transpile(state: BrsTranspileState, nameOverride?: string): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class FunctionExpression extends Expression implements TypedefProvider {
    readonly parameters: FunctionParameterExpression[];
    body: Block;
    readonly functionType: Token | null;
    end: Token;
    readonly leftParen: Token;
    readonly rightParen: Token;
    readonly asToken?: Token;
    readonly returnTypeToken?: Token;
    constructor(parameters: FunctionParameterExpression[], body: Block, functionType: Token | null, end: Token, leftParen: Token, rightParen: Token, asToken?: Token, returnTypeToken?: Token);
    /**
     * The type this function returns
     */
    returnType: BscType;
    /**
     * Get the name of the wrapping namespace (if it exists)
     * @deprecated use `.findAncestor(isNamespaceStatement)` instead.
     */
    get namespaceName(): NamespacedVariableNameExpression;
    /**
     * Get the name of the wrapping namespace (if it exists)
     * @deprecated use `.findAncestor(isFunctionExpression)` instead.
     */
    get parentFunction(): FunctionExpression;
    /**
     * The list of function calls that are declared within this function scope. This excludes CallExpressions
     * declared in child functions
     */
    callExpressions: CallExpression[];
    /**
     * If this function is part of a FunctionStatement, this will be set. Otherwise this will be undefined
     */
    functionStatement?: FunctionStatement;
    /**
     * A list of all child functions declared directly within this function
     * @deprecated use `.walk(createVisitor({ FunctionExpression: ()=>{}), { walkMode: WalkMode.visitAllRecursive })` instead
     */
    get childFunctionExpressions(): FunctionExpression[];
    /**
     * The range of the function, starting at the 'f' in function or 's' in sub (or the open paren if the keyword is missing),
     * and ending with the last n' in 'end function' or 'b' in 'end sub'
     */
    get range(): Range;
    transpile(state: BrsTranspileState, name?: Identifier, includeBody?: boolean): any[];
    getTypedef(state: BrsTranspileState): SourceNode[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
    getFunctionType(): FunctionType;
}
export declare class FunctionParameterExpression extends Expression {
    name: Identifier;
    typeToken?: Token;
    defaultValue?: Expression;
    asToken?: Token;
    constructor(name: Identifier, typeToken?: Token, defaultValue?: Expression, asToken?: Token);
    type: BscType;
    get range(): Range;
    transpile(state: BrsTranspileState): any[];
    getTypedef(state: BrsTranspileState): TranspileResult;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class NamespacedVariableNameExpression extends Expression {
    readonly expression: DottedGetExpression | VariableExpression;
    constructor(expression: DottedGetExpression | VariableExpression);
    range: Range;
    transpile(state: BrsTranspileState): SourceNode[];
    getNameParts(): string[];
    getName(parseMode: ParseMode): string;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class DottedGetExpression extends Expression {
    readonly obj: Expression;
    readonly name: Identifier;
    /**
     * Can either be `.`, or `?.` for optional chaining
     */
    readonly dot: Token;
    constructor(obj: Expression, name: Identifier, 
    /**
     * Can either be `.`, or `?.` for optional chaining
     */
    dot: Token);
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class XmlAttributeGetExpression extends Expression {
    readonly obj: Expression;
    readonly name: Identifier;
    /**
     * Can either be `@`, or `?@` for optional chaining
     */
    readonly at: Token;
    constructor(obj: Expression, name: Identifier, 
    /**
     * Can either be `@`, or `?@` for optional chaining
     */
    at: Token);
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class IndexedGetExpression extends Expression {
    obj: Expression;
    index: Expression;
    /**
     * Can either be `[` or `?[`. If `?.[` is used, this will be `[` and `optionalChainingToken` will be `?.`
     */
    openingSquare: Token;
    closingSquare: Token;
    questionDotToken?: Token;
    constructor(obj: Expression, index: Expression, 
    /**
     * Can either be `[` or `?[`. If `?.[` is used, this will be `[` and `optionalChainingToken` will be `?.`
     */
    openingSquare: Token, closingSquare: Token, questionDotToken?: Token);
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class GroupingExpression extends Expression {
    readonly tokens: {
        left: Token;
        right: Token;
    };
    expression: Expression;
    constructor(tokens: {
        left: Token;
        right: Token;
    }, expression: Expression);
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class LiteralExpression extends Expression {
    token: Token;
    constructor(token: Token);
    get range(): Range;
    /**
     * The (data) type of this expression
     */
    type: BscType;
    transpile(state: BrsTranspileState): SourceNode[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
/**
 * This is a special expression only used within template strings. It exists so we can prevent producing lots of empty strings
 * during template string transpile by identifying these expressions explicitly and skipping the bslib_toString around them
 */
export declare class EscapedCharCodeLiteralExpression extends Expression {
    readonly token: Token & {
        charCode: number;
    };
    constructor(token: Token & {
        charCode: number;
    });
    readonly range: Range;
    transpile(state: BrsTranspileState): SourceNode[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class ArrayLiteralExpression extends Expression {
    readonly elements: Array<Expression | CommentStatement>;
    readonly open: Token;
    readonly close: Token;
    readonly hasSpread: boolean;
    constructor(elements: Array<Expression | CommentStatement>, open: Token, close: Token, hasSpread?: boolean);
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class AAMemberExpression extends Expression {
    keyToken: Token;
    colonToken: Token;
    /** The expression evaluated to determine the member's initial value. */
    value: Expression;
    constructor(keyToken: Token, colonToken: Token, 
    /** The expression evaluated to determine the member's initial value. */
    value: Expression);
    range: Range;
    commaToken?: Token;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class AALiteralExpression extends Expression {
    readonly elements: Array<AAMemberExpression | CommentStatement>;
    readonly open: Token;
    readonly close: Token;
    constructor(elements: Array<AAMemberExpression | CommentStatement>, open: Token, close: Token);
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class UnaryExpression extends Expression {
    operator: Token;
    right: Expression;
    constructor(operator: Token, right: Expression);
    readonly range: Range;
    transpile(state: BrsTranspileState): (string | SourceNode)[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class VariableExpression extends Expression {
    readonly name: Identifier;
    constructor(name: Identifier);
    readonly range: Range;
    getName(parseMode: ParseMode): string;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class SourceLiteralExpression extends Expression {
    readonly token: Token;
    constructor(token: Token);
    readonly range: Range;
    private getFunctionName;
    transpile(state: BrsTranspileState): SourceNode[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
/**
 * This expression transpiles and acts exactly like a CallExpression,
 * except we need to uniquely identify these statements so we can
 * do more type checking.
 */
export declare class NewExpression extends Expression {
    readonly newKeyword: Token;
    readonly call: CallExpression;
    constructor(newKeyword: Token, call: CallExpression);
    /**
     * The name of the class to initialize (with optional namespace prefixed)
     */
    get className(): NamespacedVariableNameExpression;
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class CallfuncExpression extends Expression {
    readonly callee: Expression;
    readonly operator: Token;
    readonly methodName: Identifier;
    readonly openingParen: Token;
    readonly args: Expression[];
    readonly closingParen: Token;
    constructor(callee: Expression, operator: Token, methodName: Identifier, openingParen: Token, args: Expression[], closingParen: Token);
    readonly range: Range;
    /**
     * Get the name of the wrapping namespace (if it exists)
     * @deprecated use `.findAncestor(isNamespaceStatement)` instead.
     */
    get namespaceName(): NamespacedVariableNameExpression;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
/**
 * Since template strings can contain newlines, we need to concatenate multiple strings together with chr() calls.
 * This is a single expression that represents the string contatenation of all parts of a single quasi.
 */
export declare class TemplateStringQuasiExpression extends Expression {
    readonly expressions: Array<LiteralExpression | EscapedCharCodeLiteralExpression>;
    constructor(expressions: Array<LiteralExpression | EscapedCharCodeLiteralExpression>);
    readonly range: Range;
    transpile(state: BrsTranspileState, skipEmptyStrings?: boolean): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class TemplateStringExpression extends Expression {
    readonly openingBacktick: Token;
    readonly quasis: TemplateStringQuasiExpression[];
    readonly expressions: Expression[];
    readonly closingBacktick: Token;
    constructor(openingBacktick: Token, quasis: TemplateStringQuasiExpression[], expressions: Expression[], closingBacktick: Token);
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class TaggedTemplateStringExpression extends Expression {
    readonly tagName: Identifier;
    readonly openingBacktick: Token;
    readonly quasis: TemplateStringQuasiExpression[];
    readonly expressions: Expression[];
    readonly closingBacktick: Token;
    constructor(tagName: Identifier, openingBacktick: Token, quasis: TemplateStringQuasiExpression[], expressions: Expression[], closingBacktick: Token);
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class AnnotationExpression extends Expression {
    readonly atToken: Token;
    readonly nameToken: Token;
    constructor(atToken: Token, nameToken: Token);
    name: string;
    range: Range;
    call: CallExpression;
    /**
     * Convert annotation arguments to JavaScript types
     * @param strict If false, keep Expression objects not corresponding to JS types
     */
    getArguments(strict?: boolean): ExpressionValue[];
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
    getTypedef(state: BrsTranspileState): any[];
}
export declare class TernaryExpression extends Expression {
    readonly test: Expression;
    readonly questionMarkToken: Token;
    readonly consequent?: Expression;
    readonly colonToken?: Token;
    readonly alternate?: Expression;
    constructor(test: Expression, questionMarkToken: Token, consequent?: Expression, colonToken?: Token, alternate?: Expression);
    range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class NullCoalescingExpression extends Expression {
    consequent: Expression;
    questionQuestionToken: Token;
    alternate: Expression;
    constructor(consequent: Expression, questionQuestionToken: Token, alternate: Expression);
    readonly range: Range;
    transpile(state: BrsTranspileState): any[];
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
export declare class RegexLiteralExpression extends Expression {
    tokens: {
        regexLiteral: Token;
    };
    constructor(tokens: {
        regexLiteral: Token;
    });
    get range(): Range;
    transpile(state: BrsTranspileState): TranspileResult;
    walk(visitor: WalkVisitor, options: WalkOptions): void;
}
declare type ExpressionValue = string | number | boolean | Expression | ExpressionValue[] | {
    [key: string]: ExpressionValue;
};
export {};
