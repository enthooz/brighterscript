"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegexLiteralExpression = exports.NullCoalescingExpression = exports.TernaryExpression = exports.AnnotationExpression = exports.TaggedTemplateStringExpression = exports.TemplateStringExpression = exports.TemplateStringQuasiExpression = exports.CallfuncExpression = exports.NewExpression = exports.SourceLiteralExpression = exports.VariableExpression = exports.UnaryExpression = exports.AALiteralExpression = exports.AAMemberExpression = exports.ArrayLiteralExpression = exports.EscapedCharCodeLiteralExpression = exports.LiteralExpression = exports.GroupingExpression = exports.IndexedGetExpression = exports.XmlAttributeGetExpression = exports.DottedGetExpression = exports.NamespacedVariableNameExpression = exports.FunctionParameterExpression = exports.FunctionExpression = exports.CallExpression = exports.BinaryExpression = void 0;
const TokenKind_1 = require("../lexer/TokenKind");
const util_1 = require("../util");
const Parser_1 = require("./Parser");
const fileUrl = require("file-url");
const visitors_1 = require("../astUtils/visitors");
const visitors_2 = require("../astUtils/visitors");
const reflection_1 = require("../astUtils/reflection");
const VoidType_1 = require("../types/VoidType");
const DynamicType_1 = require("../types/DynamicType");
const FunctionType_1 = require("../types/FunctionType");
const AstNode_1 = require("./AstNode");
const SymbolTable_1 = require("../SymbolTable");
const source_map_1 = require("source-map");
class BinaryExpression extends AstNode_1.Expression {
    constructor(left, operator, right) {
        super();
        this.left = left;
        this.operator = operator;
        this.right = right;
        this.range = util_1.default.createRangeFromPositions(this.left.range.start, this.right.range.end);
    }
    transpile(state) {
        return [
            state.sourceNode(this.left, this.left.transpile(state)),
            ' ',
            state.transpileToken(this.operator),
            ' ',
            state.sourceNode(this.right, this.right.transpile(state))
        ];
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'left', visitor, options);
            (0, visitors_2.walk)(this, 'right', visitor, options);
        }
    }
}
exports.BinaryExpression = BinaryExpression;
class CallExpression extends AstNode_1.Expression {
    constructor(callee, 
    /**
     * Can either be `(`, or `?(` for optional chaining
     */
    openingParen, closingParen, args, unused) {
        super();
        this.callee = callee;
        this.openingParen = openingParen;
        this.closingParen = closingParen;
        this.args = args;
        this.range = util_1.default.createBoundingRange(this.callee, this.openingParen, ...args, this.closingParen);
    }
    /**
     * Get the name of the wrapping namespace (if it exists)
     * @deprecated use `.findAncestor(isNamespaceStatement)` instead.
     */
    get namespaceName() {
        var _a;
        return (_a = this.findAncestor(reflection_1.isNamespaceStatement)) === null || _a === void 0 ? void 0 : _a.nameExpression;
    }
    transpile(state, nameOverride) {
        let result = [];
        //transpile the name
        if (nameOverride) {
            result.push(state.sourceNode(this.callee, nameOverride));
        }
        else {
            result.push(...this.callee.transpile(state));
        }
        result.push(state.transpileToken(this.openingParen));
        for (let i = 0; i < this.args.length; i++) {
            //add comma between args
            if (i > 0) {
                result.push(', ');
            }
            let arg = this.args[i];
            result.push(...arg.transpile(state));
        }
        if (this.closingParen) {
            result.push(state.transpileToken(this.closingParen));
        }
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'callee', visitor, options);
            (0, visitors_2.walkArray)(this.args, visitor, options, this);
        }
    }
}
exports.CallExpression = CallExpression;
CallExpression.MaximumArguments = 32;
class FunctionExpression extends AstNode_1.Expression {
    constructor(parameters, body, functionType, end, leftParen, rightParen, asToken, returnTypeToken) {
        super();
        this.parameters = parameters;
        this.body = body;
        this.functionType = functionType;
        this.end = end;
        this.leftParen = leftParen;
        this.rightParen = rightParen;
        this.asToken = asToken;
        this.returnTypeToken = returnTypeToken;
        /**
         * The list of function calls that are declared within this function scope. This excludes CallExpressions
         * declared in child functions
         */
        this.callExpressions = [];
        if (this.returnTypeToken) {
            this.returnType = util_1.default.tokenToBscType(this.returnTypeToken);
        }
        else if (this.functionType.text.toLowerCase() === 'sub') {
            this.returnType = new VoidType_1.VoidType();
        }
        else {
            this.returnType = DynamicType_1.DynamicType.instance;
        }
        //if there's a body, and it doesn't have a SymbolTable, assign one
        if (this.body && !this.body.symbolTable) {
            this.body.symbolTable = new SymbolTable_1.SymbolTable(`Function Body`);
        }
        this.symbolTable = new SymbolTable_1.SymbolTable('FunctionExpression', () => { var _a; return (_a = this.parent) === null || _a === void 0 ? void 0 : _a.getSymbolTable(); });
    }
    /**
     * Get the name of the wrapping namespace (if it exists)
     * @deprecated use `.findAncestor(isNamespaceStatement)` instead.
     */
    get namespaceName() {
        var _a;
        return (_a = this.findAncestor(reflection_1.isNamespaceStatement)) === null || _a === void 0 ? void 0 : _a.nameExpression;
    }
    /**
     * Get the name of the wrapping namespace (if it exists)
     * @deprecated use `.findAncestor(isFunctionExpression)` instead.
     */
    get parentFunction() {
        return this.findAncestor(reflection_1.isFunctionExpression);
    }
    /**
     * A list of all child functions declared directly within this function
     * @deprecated use `.walk(createVisitor({ FunctionExpression: ()=>{}), { walkMode: WalkMode.visitAllRecursive })` instead
     */
    get childFunctionExpressions() {
        const expressions = [];
        this.walk((0, visitors_1.createVisitor)({
            FunctionExpression: (expression) => {
                expressions.push(expression);
            }
        }), {
            walkMode: visitors_1.WalkMode.visitAllRecursive
        });
        return expressions;
    }
    /**
     * The range of the function, starting at the 'f' in function or 's' in sub (or the open paren if the keyword is missing),
     * and ending with the last n' in 'end function' or 'b' in 'end sub'
     */
    get range() {
        return util_1.default.createBoundingRange(this.functionType, this.leftParen, ...this.parameters, this.rightParen, this.asToken, this.returnTypeToken, this.end);
    }
    transpile(state, name, includeBody = true) {
        let results = [];
        //'function'|'sub'
        results.push(state.transpileToken(this.functionType));
        //functionName?
        if (name) {
            results.push(' ', state.transpileToken(name));
        }
        //leftParen
        results.push(state.transpileToken(this.leftParen));
        //parameters
        for (let i = 0; i < this.parameters.length; i++) {
            let param = this.parameters[i];
            //add commas
            if (i > 0) {
                results.push(', ');
            }
            //add parameter
            results.push(param.transpile(state));
        }
        //right paren
        results.push(state.transpileToken(this.rightParen));
        //as [Type]
        if (this.asToken && !state.options.removeParameterTypes) {
            results.push(' ', 
            //as
            state.transpileToken(this.asToken), ' ', 
            //return type
            state.sourceNode(this.returnTypeToken, this.returnType.toTypeString()));
        }
        if (includeBody) {
            state.lineage.unshift(this);
            let body = this.body.transpile(state);
            state.lineage.shift();
            results.push(...body);
        }
        results.push('\n');
        //'end sub'|'end function'
        results.push(state.indent(), state.transpileToken(this.end));
        return results;
    }
    getTypedef(state) {
        var _a, _b, _c, _d, _e, _f;
        let results = [
            new source_map_1.SourceNode(1, 0, null, [
                //'function'|'sub'
                (_a = this.functionType) === null || _a === void 0 ? void 0 : _a.text,
                //functionName?
                ...((0, reflection_1.isFunctionStatement)(this.parent) || (0, reflection_1.isMethodStatement)(this.parent) ? [' ', (_c = (_b = this.parent.name) === null || _b === void 0 ? void 0 : _b.text) !== null && _c !== void 0 ? _c : ''] : []),
                //leftParen
                '(',
                //parameters
                ...((_e = (_d = this.parameters) === null || _d === void 0 ? void 0 : _d.map((param, i) => ([
                    //separating comma
                    i > 0 ? ', ' : '',
                    ...param.getTypedef(state)
                ]))) !== null && _e !== void 0 ? _e : []),
                //right paren
                ')',
                //as <ReturnType>
                ...(this.asToken ? [
                    ' as ',
                    (_f = this.returnTypeToken) === null || _f === void 0 ? void 0 : _f.text
                ] : []),
                '\n',
                state.indent(),
                //'end sub'|'end function'
                this.end.text
            ])
        ];
        return results;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walkArray)(this.parameters, visitor, options, this);
            //This is the core of full-program walking...it allows us to step into sub functions
            if (options.walkMode & visitors_2.InternalWalkMode.recurseChildFunctions) {
                (0, visitors_2.walk)(this, 'body', visitor, options);
            }
        }
    }
    getFunctionType() {
        let functionType = new FunctionType_1.FunctionType(this.returnType);
        functionType.isSub = this.functionType.text === 'sub';
        for (let param of this.parameters) {
            functionType.addParameter(param.name.text, param.type, !!param.typeToken);
        }
        return functionType;
    }
}
exports.FunctionExpression = FunctionExpression;
class FunctionParameterExpression extends AstNode_1.Expression {
    constructor(name, typeToken, defaultValue, asToken) {
        super();
        this.name = name;
        this.typeToken = typeToken;
        this.defaultValue = defaultValue;
        this.asToken = asToken;
        if (typeToken) {
            this.type = util_1.default.tokenToBscType(typeToken);
        }
        else {
            this.type = new DynamicType_1.DynamicType();
        }
    }
    get range() {
        return util_1.default.createBoundingRange(this.name, this.asToken, this.typeToken, this.defaultValue);
    }
    transpile(state) {
        let result = [
            //name
            state.transpileToken(this.name)
        ];
        //default value
        if (this.defaultValue) {
            result.push(' = ');
            result.push(this.defaultValue.transpile(state));
        }
        //type declaration
        if (this.asToken && !state.options.removeParameterTypes) {
            result.push(' ');
            result.push(state.transpileToken(this.asToken));
            result.push(' ');
            result.push(state.sourceNode(this.typeToken, this.type.toTypeString()));
        }
        return result;
    }
    getTypedef(state) {
        var _a;
        return [
            //name
            this.name.text,
            //default value
            ...(this.defaultValue ? [
                ' = ',
                ...this.defaultValue.transpile(state)
            ] : []),
            //type declaration
            ...(this.asToken ? [
                ' as ',
                (_a = this.typeToken) === null || _a === void 0 ? void 0 : _a.text
            ] : [])
        ];
    }
    walk(visitor, options) {
        // eslint-disable-next-line no-bitwise
        if (this.defaultValue && options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'defaultValue', visitor, options);
        }
    }
}
exports.FunctionParameterExpression = FunctionParameterExpression;
class NamespacedVariableNameExpression extends AstNode_1.Expression {
    constructor(
    //if this is a `DottedGetExpression`, it must be comprised only of `VariableExpression`s
    expression) {
        super();
        this.expression = expression;
        this.range = expression.range;
    }
    transpile(state) {
        return [
            state.sourceNode(this, this.getName(Parser_1.ParseMode.BrightScript))
        ];
    }
    getNameParts() {
        let parts = [];
        if ((0, reflection_1.isVariableExpression)(this.expression)) {
            parts.push(this.expression.name.text);
        }
        else {
            let expr = this.expression;
            parts.push(expr.name.text);
            while ((0, reflection_1.isVariableExpression)(expr) === false) {
                expr = expr.obj;
                parts.unshift(expr.name.text);
            }
        }
        return parts;
    }
    getName(parseMode) {
        if (parseMode === Parser_1.ParseMode.BrighterScript) {
            return this.getNameParts().join('.');
        }
        else {
            return this.getNameParts().join('_');
        }
    }
    walk(visitor, options) {
        var _a;
        (_a = this.expression) === null || _a === void 0 ? void 0 : _a.link();
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'expression', visitor, options);
        }
    }
}
exports.NamespacedVariableNameExpression = NamespacedVariableNameExpression;
class DottedGetExpression extends AstNode_1.Expression {
    constructor(obj, name, 
    /**
     * Can either be `.`, or `?.` for optional chaining
     */
    dot) {
        super();
        this.obj = obj;
        this.name = name;
        this.dot = dot;
        this.range = util_1.default.createBoundingRange(this.obj, this.dot, this.name);
    }
    transpile(state) {
        //if the callee starts with a namespace name, transpile the name
        if (state.file.calleeStartsWithNamespace(this)) {
            return new NamespacedVariableNameExpression(this).transpile(state);
        }
        else {
            return [
                ...this.obj.transpile(state),
                state.transpileToken(this.dot),
                state.transpileToken(this.name)
            ];
        }
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'obj', visitor, options);
        }
    }
}
exports.DottedGetExpression = DottedGetExpression;
class XmlAttributeGetExpression extends AstNode_1.Expression {
    constructor(obj, name, 
    /**
     * Can either be `@`, or `?@` for optional chaining
     */
    at) {
        super();
        this.obj = obj;
        this.name = name;
        this.at = at;
        this.range = util_1.default.createBoundingRange(this.obj, this.at, this.name);
    }
    transpile(state) {
        return [
            ...this.obj.transpile(state),
            state.transpileToken(this.at),
            state.transpileToken(this.name)
        ];
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'obj', visitor, options);
        }
    }
}
exports.XmlAttributeGetExpression = XmlAttributeGetExpression;
class IndexedGetExpression extends AstNode_1.Expression {
    constructor(obj, index, 
    /**
     * Can either be `[` or `?[`. If `?.[` is used, this will be `[` and `optionalChainingToken` will be `?.`
     */
    openingSquare, closingSquare, questionDotToken //  ? or ?.
    ) {
        super();
        this.obj = obj;
        this.index = index;
        this.openingSquare = openingSquare;
        this.closingSquare = closingSquare;
        this.questionDotToken = questionDotToken;
        this.range = util_1.default.createBoundingRange(this.obj, this.openingSquare, this.questionDotToken, this.openingSquare, this.index, this.closingSquare);
    }
    transpile(state) {
        var _a, _b;
        return [
            ...this.obj.transpile(state),
            this.questionDotToken ? state.transpileToken(this.questionDotToken) : '',
            state.transpileToken(this.openingSquare),
            ...((_b = (_a = this.index) === null || _a === void 0 ? void 0 : _a.transpile(state)) !== null && _b !== void 0 ? _b : []),
            this.closingSquare ? state.transpileToken(this.closingSquare) : ''
        ];
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'obj', visitor, options);
            (0, visitors_2.walk)(this, 'index', visitor, options);
        }
    }
}
exports.IndexedGetExpression = IndexedGetExpression;
class GroupingExpression extends AstNode_1.Expression {
    constructor(tokens, expression) {
        super();
        this.tokens = tokens;
        this.expression = expression;
        this.range = util_1.default.createBoundingRange(this.tokens.left, this.expression, this.tokens.right);
    }
    transpile(state) {
        return [
            state.transpileToken(this.tokens.left),
            ...this.expression.transpile(state),
            state.transpileToken(this.tokens.right)
        ];
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'expression', visitor, options);
        }
    }
}
exports.GroupingExpression = GroupingExpression;
class LiteralExpression extends AstNode_1.Expression {
    constructor(token) {
        super();
        this.token = token;
        this.type = util_1.default.tokenToBscType(token);
    }
    get range() {
        return this.token.range;
    }
    transpile(state) {
        let text;
        if (this.token.kind === TokenKind_1.TokenKind.TemplateStringQuasi) {
            //wrap quasis with quotes (and escape inner quotemarks)
            text = `"${this.token.text.replace(/"/g, '""')}"`;
        }
        else if ((0, reflection_1.isStringType)(this.type)) {
            text = this.token.text;
            //add trailing quotemark if it's missing. We will have already generated a diagnostic for this.
            if (text.endsWith('"') === false) {
                text += '"';
            }
        }
        else {
            text = this.token.text;
        }
        return [
            state.sourceNode(this, text)
        ];
    }
    walk(visitor, options) {
        //nothing to walk
    }
}
exports.LiteralExpression = LiteralExpression;
/**
 * This is a special expression only used within template strings. It exists so we can prevent producing lots of empty strings
 * during template string transpile by identifying these expressions explicitly and skipping the bslib_toString around them
 */
class EscapedCharCodeLiteralExpression extends AstNode_1.Expression {
    constructor(token) {
        super();
        this.token = token;
        this.range = token.range;
    }
    transpile(state) {
        return [
            state.sourceNode(this, `chr(${this.token.charCode})`)
        ];
    }
    walk(visitor, options) {
        //nothing to walk
    }
}
exports.EscapedCharCodeLiteralExpression = EscapedCharCodeLiteralExpression;
class ArrayLiteralExpression extends AstNode_1.Expression {
    constructor(elements, open, close, hasSpread = false) {
        super();
        this.elements = elements;
        this.open = open;
        this.close = close;
        this.hasSpread = hasSpread;
        this.range = util_1.default.createBoundingRange(this.open, ...this.elements, this.close);
    }
    transpile(state) {
        let result = [];
        result.push(state.transpileToken(this.open));
        let hasChildren = this.elements.length > 0;
        state.blockDepth++;
        for (let i = 0; i < this.elements.length; i++) {
            let previousElement = this.elements[i - 1];
            let element = this.elements[i];
            if ((0, reflection_1.isCommentStatement)(element)) {
                //if the comment is on the same line as opening square or previous statement, don't add newline
                if (util_1.default.linesTouch(this.open, element) || util_1.default.linesTouch(previousElement, element)) {
                    result.push(' ');
                }
                else {
                    result.push('\n', state.indent());
                }
                state.lineage.unshift(this);
                result.push(element.transpile(state));
                state.lineage.shift();
            }
            else {
                result.push('\n');
                result.push(state.indent(), ...element.transpile(state));
            }
        }
        state.blockDepth--;
        //add a newline between open and close if there are elements
        if (hasChildren) {
            result.push('\n');
            result.push(state.indent());
        }
        if (this.close) {
            result.push(state.transpileToken(this.close));
        }
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walkArray)(this.elements, visitor, options, this);
        }
    }
}
exports.ArrayLiteralExpression = ArrayLiteralExpression;
class AAMemberExpression extends AstNode_1.Expression {
    constructor(keyToken, colonToken, 
    /** The expression evaluated to determine the member's initial value. */
    value) {
        super();
        this.keyToken = keyToken;
        this.colonToken = colonToken;
        this.value = value;
        this.range = util_1.default.createBoundingRange(this.keyToken, this.colonToken, this.value);
    }
    transpile(state) {
        //TODO move the logic from AALiteralExpression loop into this function
        return [];
    }
    walk(visitor, options) {
        (0, visitors_2.walk)(this, 'value', visitor, options);
    }
}
exports.AAMemberExpression = AAMemberExpression;
class AALiteralExpression extends AstNode_1.Expression {
    constructor(elements, open, close) {
        super();
        this.elements = elements;
        this.open = open;
        this.close = close;
        this.range = util_1.default.createBoundingRange(this.open, ...this.elements, this.close);
    }
    transpile(state) {
        let result = [];
        //open curly
        result.push(state.transpileToken(this.open));
        let hasChildren = this.elements.length > 0;
        //add newline if the object has children and the first child isn't a comment starting on the same line as opening curly
        if (hasChildren && ((0, reflection_1.isCommentStatement)(this.elements[0]) === false || !util_1.default.linesTouch(this.elements[0], this.open))) {
            result.push('\n');
        }
        state.blockDepth++;
        for (let i = 0; i < this.elements.length; i++) {
            let element = this.elements[i];
            let previousElement = this.elements[i - 1];
            let nextElement = this.elements[i + 1];
            //don't indent if comment is same-line
            if ((0, reflection_1.isCommentStatement)(element) &&
                (util_1.default.linesTouch(this.open, element) || util_1.default.linesTouch(previousElement, element))) {
                result.push(' ');
                //indent line
            }
            else {
                result.push(state.indent());
            }
            //render comments
            if ((0, reflection_1.isCommentStatement)(element)) {
                result.push(...element.transpile(state));
            }
            else {
                //key
                result.push(state.transpileToken(element.keyToken));
                //colon
                result.push(state.transpileToken(element.colonToken), ' ');
                //value
                result.push(...element.value.transpile(state));
            }
            //if next element is a same-line comment, skip the newline
            if (nextElement && (0, reflection_1.isCommentStatement)(nextElement) && nextElement.range.start.line === element.range.start.line) {
                //add a newline between statements
            }
            else {
                result.push('\n');
            }
        }
        state.blockDepth--;
        //only indent the closing curly if we have children
        if (hasChildren) {
            result.push(state.indent());
        }
        //close curly
        if (this.close) {
            result.push(state.transpileToken(this.close));
        }
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walkArray)(this.elements, visitor, options, this);
        }
    }
}
exports.AALiteralExpression = AALiteralExpression;
class UnaryExpression extends AstNode_1.Expression {
    constructor(operator, right) {
        super();
        this.operator = operator;
        this.right = right;
        this.range = util_1.default.createBoundingRange(this.operator, this.right);
    }
    transpile(state) {
        return [
            state.transpileToken(this.operator),
            ' ',
            ...this.right.transpile(state)
        ];
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'right', visitor, options);
        }
    }
}
exports.UnaryExpression = UnaryExpression;
class VariableExpression extends AstNode_1.Expression {
    constructor(name) {
        var _a;
        super();
        this.name = name;
        this.range = (_a = this.name) === null || _a === void 0 ? void 0 : _a.range;
    }
    getName(parseMode) {
        return this.name.text;
    }
    transpile(state) {
        let result = [];
        const namespace = this.findAncestor(reflection_1.isNamespaceStatement);
        //if the callee is the name of a known namespace function
        if (state.file.calleeIsKnownNamespaceFunction(this, namespace === null || namespace === void 0 ? void 0 : namespace.getName(Parser_1.ParseMode.BrighterScript))) {
            result.push(state.sourceNode(this, [
                namespace.getName(Parser_1.ParseMode.BrightScript),
                '_',
                this.getName(Parser_1.ParseMode.BrightScript)
            ]));
            //transpile  normally
        }
        else {
            result.push(state.transpileToken(this.name));
        }
        return result;
    }
    walk(visitor, options) {
        //nothing to walk
    }
}
exports.VariableExpression = VariableExpression;
class SourceLiteralExpression extends AstNode_1.Expression {
    constructor(token) {
        super();
        this.token = token;
        this.range = token === null || token === void 0 ? void 0 : token.range;
    }
    getFunctionName(state, parseMode) {
        let func = state.file.getFunctionScopeAtPosition(this.token.range.start).func;
        let nameParts = [];
        while (func.parentFunction) {
            let index = func.parentFunction.childFunctionExpressions.indexOf(func);
            nameParts.unshift(`anon${index}`);
            func = func.parentFunction;
        }
        //get the index of this function in its parent
        nameParts.unshift(func.functionStatement.getName(parseMode));
        return nameParts.join('$');
    }
    transpile(state) {
        let text;
        switch (this.token.kind) {
            case TokenKind_1.TokenKind.SourceFilePathLiteral:
                const pathUrl = fileUrl(state.srcPath);
                text = `"${pathUrl.substring(0, 4)}" + "${pathUrl.substring(4)}"`;
                break;
            case TokenKind_1.TokenKind.SourceLineNumLiteral:
                text = `${this.token.range.start.line + 1}`;
                break;
            case TokenKind_1.TokenKind.FunctionNameLiteral:
                text = `"${this.getFunctionName(state, Parser_1.ParseMode.BrightScript)}"`;
                break;
            case TokenKind_1.TokenKind.SourceFunctionNameLiteral:
                text = `"${this.getFunctionName(state, Parser_1.ParseMode.BrighterScript)}"`;
                break;
            case TokenKind_1.TokenKind.SourceLocationLiteral:
                const locationUrl = fileUrl(state.srcPath);
                text = `"${locationUrl.substring(0, 4)}" + "${locationUrl.substring(4)}:${this.token.range.start.line + 1}"`;
                break;
            case TokenKind_1.TokenKind.PkgPathLiteral:
                let pkgPath1 = `pkg:/${state.file.pkgPath}`
                    .replace(/\\/g, '/')
                    .replace(/\.bs$/i, '.brs');
                text = `"${pkgPath1}"`;
                break;
            case TokenKind_1.TokenKind.PkgLocationLiteral:
                let pkgPath2 = `pkg:/${state.file.pkgPath}`
                    .replace(/\\/g, '/')
                    .replace(/\.bs$/i, '.brs');
                text = `"${pkgPath2}:" + str(LINE_NUM)`;
                break;
            case TokenKind_1.TokenKind.LineNumLiteral:
            default:
                //use the original text (because it looks like a variable)
                text = this.token.text;
                break;
        }
        return [
            state.sourceNode(this, text)
        ];
    }
    walk(visitor, options) {
        //nothing to walk
    }
}
exports.SourceLiteralExpression = SourceLiteralExpression;
/**
 * This expression transpiles and acts exactly like a CallExpression,
 * except we need to uniquely identify these statements so we can
 * do more type checking.
 */
class NewExpression extends AstNode_1.Expression {
    constructor(newKeyword, call) {
        super();
        this.newKeyword = newKeyword;
        this.call = call;
        this.range = util_1.default.createBoundingRange(this.newKeyword, this.call);
    }
    /**
     * The name of the class to initialize (with optional namespace prefixed)
     */
    get className() {
        //the parser guarantees the callee of a new statement's call object will be
        //a NamespacedVariableNameExpression
        return this.call.callee;
    }
    transpile(state) {
        var _a;
        const namespace = this.findAncestor(reflection_1.isNamespaceStatement);
        const cls = (_a = state.file.getClassFileLink(this.className.getName(Parser_1.ParseMode.BrighterScript), namespace === null || namespace === void 0 ? void 0 : namespace.getName(Parser_1.ParseMode.BrighterScript))) === null || _a === void 0 ? void 0 : _a.item;
        //new statements within a namespace block can omit the leading namespace if the class resides in that same namespace.
        //So we need to figure out if this is a namespace-omitted class, or if this class exists without a namespace.
        return this.call.transpile(state, cls === null || cls === void 0 ? void 0 : cls.getName(Parser_1.ParseMode.BrightScript));
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'call', visitor, options);
        }
    }
}
exports.NewExpression = NewExpression;
class CallfuncExpression extends AstNode_1.Expression {
    constructor(callee, operator, methodName, openingParen, args, closingParen) {
        super();
        this.callee = callee;
        this.operator = operator;
        this.methodName = methodName;
        this.openingParen = openingParen;
        this.args = args;
        this.closingParen = closingParen;
        this.range = util_1.default.createBoundingRange(callee, operator, methodName, openingParen, ...args, closingParen);
    }
    /**
     * Get the name of the wrapping namespace (if it exists)
     * @deprecated use `.findAncestor(isNamespaceStatement)` instead.
     */
    get namespaceName() {
        var _a;
        return (_a = this.findAncestor(reflection_1.isNamespaceStatement)) === null || _a === void 0 ? void 0 : _a.nameExpression;
    }
    transpile(state) {
        let result = [];
        result.push(...this.callee.transpile(state), state.sourceNode(this.operator, '.callfunc'), state.transpileToken(this.openingParen), 
        //the name of the function
        state.sourceNode(this.methodName, ['"', this.methodName.text, '"']), ', ');
        //transpile args
        //callfunc with zero args never gets called, so pass invalid as the first parameter if there are no args
        if (this.args.length === 0) {
            result.push('invalid');
        }
        else {
            for (let i = 0; i < this.args.length; i++) {
                //add comma between args
                if (i > 0) {
                    result.push(', ');
                }
                let arg = this.args[i];
                result.push(...arg.transpile(state));
            }
        }
        result.push(state.transpileToken(this.closingParen));
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'callee', visitor, options);
            (0, visitors_2.walkArray)(this.args, visitor, options, this);
        }
    }
}
exports.CallfuncExpression = CallfuncExpression;
/**
 * Since template strings can contain newlines, we need to concatenate multiple strings together with chr() calls.
 * This is a single expression that represents the string contatenation of all parts of a single quasi.
 */
class TemplateStringQuasiExpression extends AstNode_1.Expression {
    constructor(expressions) {
        super();
        this.expressions = expressions;
        this.range = util_1.default.createBoundingRange(...expressions);
    }
    transpile(state, skipEmptyStrings = true) {
        let result = [];
        let plus = '';
        for (let expression of this.expressions) {
            //skip empty strings
            //TODO what does an empty string literal expression look like?
            if (expression.token.text === '' && skipEmptyStrings === true) {
                continue;
            }
            result.push(plus, ...expression.transpile(state));
            plus = ' + ';
        }
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walkArray)(this.expressions, visitor, options, this);
        }
    }
}
exports.TemplateStringQuasiExpression = TemplateStringQuasiExpression;
class TemplateStringExpression extends AstNode_1.Expression {
    constructor(openingBacktick, quasis, expressions, closingBacktick) {
        super();
        this.openingBacktick = openingBacktick;
        this.quasis = quasis;
        this.expressions = expressions;
        this.closingBacktick = closingBacktick;
        this.range = util_1.default.createBoundingRange(openingBacktick, quasis[0], quasis[quasis.length - 1], closingBacktick);
    }
    transpile(state) {
        if (this.quasis.length === 1 && this.expressions.length === 0) {
            return this.quasis[0].transpile(state);
        }
        let result = ['('];
        let plus = '';
        //helper function to figure out when to include the plus
        function add(...items) {
            if (items.length > 0) {
                result.push(plus, ...items);
            }
            //set the plus after the first occurance of a nonzero length set of items
            if (plus === '' && items.length > 0) {
                plus = ' + ';
            }
        }
        for (let i = 0; i < this.quasis.length; i++) {
            let quasi = this.quasis[i];
            let expression = this.expressions[i];
            add(...quasi.transpile(state));
            if (expression) {
                //skip the toString wrapper around certain expressions
                if ((0, reflection_1.isEscapedCharCodeLiteralExpression)(expression) ||
                    ((0, reflection_1.isLiteralExpression)(expression) && (0, reflection_1.isStringType)(expression.type))) {
                    add(...expression.transpile(state));
                    //wrap all other expressions with a bslib_toString call to prevent runtime type mismatch errors
                }
                else {
                    add(state.bslibPrefix + '_toString(', ...expression.transpile(state), ')');
                }
            }
        }
        //the expression should be wrapped in parens so it can be used line a single expression at runtime
        result.push(')');
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            //walk the quasis and expressions in left-to-right order
            for (let i = 0; i < this.quasis.length; i++) {
                (0, visitors_2.walk)(this.quasis, i, visitor, options, this);
                //this skips the final loop iteration since we'll always have one more quasi than expression
                if (this.expressions[i]) {
                    (0, visitors_2.walk)(this.expressions, i, visitor, options, this);
                }
            }
        }
    }
}
exports.TemplateStringExpression = TemplateStringExpression;
class TaggedTemplateStringExpression extends AstNode_1.Expression {
    constructor(tagName, openingBacktick, quasis, expressions, closingBacktick) {
        super();
        this.tagName = tagName;
        this.openingBacktick = openingBacktick;
        this.quasis = quasis;
        this.expressions = expressions;
        this.closingBacktick = closingBacktick;
        this.range = util_1.default.createBoundingRange(tagName, openingBacktick, quasis[0], quasis[quasis.length - 1], closingBacktick);
    }
    transpile(state) {
        let result = [];
        result.push(state.transpileToken(this.tagName), '([');
        //add quasis as the first array
        for (let i = 0; i < this.quasis.length; i++) {
            let quasi = this.quasis[i];
            //separate items with a comma
            if (i > 0) {
                result.push(', ');
            }
            result.push(...quasi.transpile(state, false));
        }
        result.push('], [');
        //add expressions as the second array
        for (let i = 0; i < this.expressions.length; i++) {
            let expression = this.expressions[i];
            if (i > 0) {
                result.push(', ');
            }
            result.push(...expression.transpile(state));
        }
        result.push(state.sourceNode(this.closingBacktick, '])'));
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            //walk the quasis and expressions in left-to-right order
            for (let i = 0; i < this.quasis.length; i++) {
                (0, visitors_2.walk)(this.quasis, i, visitor, options, this);
                //this skips the final loop iteration since we'll always have one more quasi than expression
                if (this.expressions[i]) {
                    (0, visitors_2.walk)(this.expressions, i, visitor, options, this);
                }
            }
        }
    }
}
exports.TaggedTemplateStringExpression = TaggedTemplateStringExpression;
class AnnotationExpression extends AstNode_1.Expression {
    constructor(atToken, nameToken) {
        super();
        this.atToken = atToken;
        this.nameToken = nameToken;
        this.name = nameToken.text;
        this.range = util_1.default.createBoundingRange(atToken, nameToken);
    }
    /**
     * Convert annotation arguments to JavaScript types
     * @param strict If false, keep Expression objects not corresponding to JS types
     */
    getArguments(strict = true) {
        if (!this.call) {
            return [];
        }
        return this.call.args.map(e => expressionToValue(e, strict));
    }
    transpile(state) {
        return [];
    }
    walk(visitor, options) {
        //nothing to walk
    }
    getTypedef(state) {
        var _a, _b;
        return [
            '@',
            this.name,
            ...((_b = (_a = this.call) === null || _a === void 0 ? void 0 : _a.transpile(state)) !== null && _b !== void 0 ? _b : [])
        ];
    }
}
exports.AnnotationExpression = AnnotationExpression;
class TernaryExpression extends AstNode_1.Expression {
    constructor(test, questionMarkToken, consequent, colonToken, alternate) {
        super();
        this.test = test;
        this.questionMarkToken = questionMarkToken;
        this.consequent = consequent;
        this.colonToken = colonToken;
        this.alternate = alternate;
        this.range = util_1.default.createBoundingRange(test, questionMarkToken, consequent, colonToken, alternate);
    }
    transpile(state) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        let result = [];
        let consequentInfo = util_1.default.getExpressionInfo(this.consequent);
        let alternateInfo = util_1.default.getExpressionInfo(this.alternate);
        //get all unique variable names used in the consequent and alternate, and sort them alphabetically so the output is consistent
        let allUniqueVarNames = [...new Set([...consequentInfo.uniqueVarNames, ...alternateInfo.uniqueVarNames])].sort();
        let mutatingExpressions = [
            ...consequentInfo.expressions,
            ...alternateInfo.expressions
        ].filter(e => e instanceof CallExpression || e instanceof CallfuncExpression || e instanceof DottedGetExpression);
        if (mutatingExpressions.length > 0) {
            result.push(state.sourceNode(this.questionMarkToken, 
            //write all the scope variables as parameters.
            //TODO handle when there are more than 31 parameters
            `(function(__bsCondition, ${allUniqueVarNames.join(', ')})`), state.newline, 
            //double indent so our `end function` line is still indented one at the end
            state.indent(2), state.sourceNode(this.test, `if __bsCondition then`), state.newline, state.indent(1), state.sourceNode((_a = this.consequent) !== null && _a !== void 0 ? _a : this.questionMarkToken, 'return '), ...(_c = (_b = this.consequent) === null || _b === void 0 ? void 0 : _b.transpile(state)) !== null && _c !== void 0 ? _c : [state.sourceNode(this.questionMarkToken, 'invalid')], state.newline, state.indent(-1), state.sourceNode((_d = this.consequent) !== null && _d !== void 0 ? _d : this.questionMarkToken, 'else'), state.newline, state.indent(1), state.sourceNode((_e = this.consequent) !== null && _e !== void 0 ? _e : this.questionMarkToken, 'return '), ...(_g = (_f = this.alternate) === null || _f === void 0 ? void 0 : _f.transpile(state)) !== null && _g !== void 0 ? _g : [state.sourceNode((_h = this.consequent) !== null && _h !== void 0 ? _h : this.questionMarkToken, 'invalid')], state.newline, state.indent(-1), state.sourceNode(this.questionMarkToken, 'end if'), state.newline, state.indent(-1), state.sourceNode(this.questionMarkToken, 'end function)('), ...this.test.transpile(state), state.sourceNode(this.questionMarkToken, `, ${allUniqueVarNames.join(', ')})`));
            state.blockDepth--;
        }
        else {
            result.push(state.sourceNode(this.test, state.bslibPrefix + `_ternary(`), ...this.test.transpile(state), state.sourceNode(this.test, `, `), ...(_k = (_j = this.consequent) === null || _j === void 0 ? void 0 : _j.transpile(state)) !== null && _k !== void 0 ? _k : ['invalid'], `, `, ...(_m = (_l = this.alternate) === null || _l === void 0 ? void 0 : _l.transpile(state)) !== null && _m !== void 0 ? _m : ['invalid'], `)`);
        }
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'test', visitor, options);
            (0, visitors_2.walk)(this, 'consequent', visitor, options);
            (0, visitors_2.walk)(this, 'alternate', visitor, options);
        }
    }
}
exports.TernaryExpression = TernaryExpression;
class NullCoalescingExpression extends AstNode_1.Expression {
    constructor(consequent, questionQuestionToken, alternate) {
        super();
        this.consequent = consequent;
        this.questionQuestionToken = questionQuestionToken;
        this.alternate = alternate;
        this.range = util_1.default.createBoundingRange(consequent, questionQuestionToken, alternate);
    }
    transpile(state) {
        let result = [];
        let consequentInfo = util_1.default.getExpressionInfo(this.consequent);
        let alternateInfo = util_1.default.getExpressionInfo(this.alternate);
        //get all unique variable names used in the consequent and alternate, and sort them alphabetically so the output is consistent
        let allUniqueVarNames = [...new Set([...consequentInfo.uniqueVarNames, ...alternateInfo.uniqueVarNames])].sort();
        let hasMutatingExpression = [
            ...consequentInfo.expressions,
            ...alternateInfo.expressions
        ].find(e => (0, reflection_1.isCallExpression)(e) || (0, reflection_1.isCallfuncExpression)(e) || (0, reflection_1.isDottedGetExpression)(e));
        if (hasMutatingExpression) {
            result.push(`(function(`, 
            //write all the scope variables as parameters.
            //TODO handle when there are more than 31 parameters
            allUniqueVarNames.join(', '), ')', state.newline, 
            //double indent so our `end function` line is still indented one at the end
            state.indent(2), 
            //evaluate the consequent exactly once, and then use it in the following condition
            `__bsConsequent = `, ...this.consequent.transpile(state), state.newline, state.indent(), `if __bsConsequent <> invalid then`, state.newline, state.indent(1), 'return __bsConsequent', state.newline, state.indent(-1), 'else', state.newline, state.indent(1), 'return ', ...this.alternate.transpile(state), state.newline, state.indent(-1), 'end if', state.newline, state.indent(-1), 'end function)(', allUniqueVarNames.join(', '), ')');
            state.blockDepth--;
        }
        else {
            result.push(state.bslibPrefix + `_coalesce(`, ...this.consequent.transpile(state), ', ', ...this.alternate.transpile(state), ')');
        }
        return result;
    }
    walk(visitor, options) {
        if (options.walkMode & visitors_2.InternalWalkMode.walkExpressions) {
            (0, visitors_2.walk)(this, 'consequent', visitor, options);
            (0, visitors_2.walk)(this, 'alternate', visitor, options);
        }
    }
}
exports.NullCoalescingExpression = NullCoalescingExpression;
class RegexLiteralExpression extends AstNode_1.Expression {
    constructor(tokens) {
        super();
        this.tokens = tokens;
    }
    get range() {
        var _a, _b;
        return (_b = (_a = this.tokens) === null || _a === void 0 ? void 0 : _a.regexLiteral) === null || _b === void 0 ? void 0 : _b.range;
    }
    transpile(state) {
        var _a, _b;
        let text = (_b = (_a = this.tokens.regexLiteral) === null || _a === void 0 ? void 0 : _a.text) !== null && _b !== void 0 ? _b : '';
        let flags = '';
        //get any flags from the end
        const flagMatch = /\/([a-z]+)$/i.exec(text);
        if (flagMatch) {
            text = text.substring(0, flagMatch.index + 1);
            flags = flagMatch[1];
        }
        let pattern = text
            //remove leading and trailing slashes
            .substring(1, text.length - 1)
            //escape quotemarks
            .split('"').join('" + chr(34) + "');
        return [
            state.sourceNode(this.tokens.regexLiteral, [
                'CreateObject("roRegex", ',
                `"${pattern}", `,
                `"${flags}"`,
                ')'
            ])
        ];
    }
    walk(visitor, options) {
        //nothing to walk
    }
}
exports.RegexLiteralExpression = RegexLiteralExpression;
function expressionToValue(expr, strict) {
    if (!expr) {
        return null;
    }
    if ((0, reflection_1.isUnaryExpression)(expr) && (0, reflection_1.isLiteralNumber)(expr.right)) {
        return numberExpressionToValue(expr.right, expr.operator.text);
    }
    if ((0, reflection_1.isLiteralString)(expr)) {
        //remove leading and trailing quotes
        return expr.token.text.replace(/^"/, '').replace(/"$/, '');
    }
    if ((0, reflection_1.isLiteralNumber)(expr)) {
        return numberExpressionToValue(expr);
    }
    if ((0, reflection_1.isLiteralBoolean)(expr)) {
        return expr.token.text.toLowerCase() === 'true';
    }
    if ((0, reflection_1.isArrayLiteralExpression)(expr)) {
        return expr.elements
            .filter(e => !(0, reflection_1.isCommentStatement)(e))
            .map(e => expressionToValue(e, strict));
    }
    if ((0, reflection_1.isAALiteralExpression)(expr)) {
        return expr.elements.reduce((acc, e) => {
            if (!(0, reflection_1.isCommentStatement)(e)) {
                acc[e.keyToken.text] = expressionToValue(e.value, strict);
            }
            return acc;
        }, {});
    }
    return strict ? null : expr;
}
function numberExpressionToValue(expr, operator = '') {
    if ((0, reflection_1.isIntegerType)(expr.type) || (0, reflection_1.isLongIntegerType)(expr.type)) {
        return parseInt(operator + expr.token.text);
    }
    else {
        return parseFloat(operator + expr.token.text);
    }
}
//# sourceMappingURL=Expression.js.map