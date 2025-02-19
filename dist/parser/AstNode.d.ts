import type { WalkVisitor, WalkOptions } from '../astUtils/visitors';
import type { Position, Range } from 'vscode-languageserver';
import { CancellationTokenSource } from 'vscode-languageserver';
import { InternalWalkMode } from '../astUtils/visitors';
import type { SymbolTable } from '../SymbolTable';
import type { BrsTranspileState } from './BrsTranspileState';
import type { TranspileResult } from '../interfaces';
import type { AnnotationExpression } from './Expression';
/**
 * A BrightScript AST node
 */
export declare abstract class AstNode {
    /**
     *  The starting and ending location of the node.
     */
    abstract range: Range;
    abstract transpile(state: BrsTranspileState): TranspileResult;
    /**
     * When being considered by the walk visitor, this describes what type of element the current class is.
     */
    visitMode: InternalWalkMode;
    abstract walk(visitor: WalkVisitor, options: WalkOptions): any;
    /**
     * The parent node for this statement. This is set dynamically during `onFileValidate`, and should not be set directly.
     */
    parent?: AstNode;
    /**
     * Certain expressions or statements can have a symbol table (such as blocks, functions, namespace bodies, etc).
     * If you're interested in getting the closest SymbolTable, use `getSymbolTable` instead.
     */
    symbolTable?: SymbolTable;
    /**
     * Get the closest symbol table for this node
     */
    getSymbolTable(): SymbolTable;
    /**
     * Walk upward and return the first node that results in `true` from the matcher.
     * @param matcher a function called for each node. If you return true, this function returns the specified node. If you return a node, that node is returned. all other return values continue the loop
     *                The function's second parameter is a cancellation token. If you'd like to short-circuit the walk, call `cancellationToken.cancel()`, then this function will return `undefined`
     */
    findAncestor<TNode extends AstNode = AstNode>(matcher: (node: AstNode, cancellationToken: CancellationTokenSource) => boolean | AstNode | undefined | void): TNode;
    /**
     * Find the first child where the matcher evaluates to true.
     * @param matcher a function called for each node. If you return true, this function returns the specified node. If you return a node, that node is returned. all other return values continue the loop
     */
    findChild<TNode extends AstNode = AstNode>(matcher: (node: AstNode, cancellationSource: any) => boolean | AstNode | undefined | void, options?: WalkOptions): TNode;
    /**
     * FInd the deepest child that includes the given position
     */
    findChildAtPosition<TNodeType extends AstNode = AstNode>(position: Position, options?: WalkOptions): TNodeType;
    /**
     * Links all child nodes to their parent AstNode, and the same with symbol tables. This performs a full AST walk, so you should use this sparingly
     */
    link(): void;
}
export declare abstract class Statement extends AstNode {
    /**
     * When being considered by the walk visitor, this describes what type of element the current class is.
     */
    visitMode: InternalWalkMode;
    /**
     * Annotations for this statement
     */
    annotations: AnnotationExpression[];
}
/** A BrightScript expression */
export declare abstract class Expression extends AstNode {
    /**
     * When being considered by the walk visitor, this describes what type of element the current class is.
     */
    visitMode: InternalWalkMode;
}
