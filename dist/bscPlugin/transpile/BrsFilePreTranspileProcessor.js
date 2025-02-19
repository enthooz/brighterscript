"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrsFilePreTranspileProcessor = void 0;
const creators_1 = require("../../astUtils/creators");
const reflection_1 = require("../../astUtils/reflection");
const TokenKind_1 = require("../../lexer/TokenKind");
const Expression_1 = require("../../parser/Expression");
const Parser_1 = require("../../parser/Parser");
const util_1 = require("../../util");
class BrsFilePreTranspileProcessor {
    constructor(event) {
        this.event = event;
    }
    process() {
        if ((0, reflection_1.isBrsFile)(this.event.file)) {
            this.iterateExpressions();
        }
    }
    iterateExpressions() {
        const scope = this.event.program.getFirstScopeForFile(this.event.file);
        for (let expression of this.event.file.parser.references.expressions) {
            if (expression) {
                this.processExpression(expression, scope);
            }
        }
    }
    /**
     * Given a string optionally separated by dots, find an enum related to it.
     * For example, all of these would return the enum: `SomeNamespace.SomeEnum.SomeMember`, SomeEnum.SomeMember, `SomeEnum`
     */
    getEnumInfo(name, containingNamespace, scope) {
        //look for the enum directly
        let result = scope === null || scope === void 0 ? void 0 : scope.getEnumFileLink(name, containingNamespace);
        if (result) {
            return {
                enum: result.item
            };
        }
        //assume we've been given the enum.member syntax, so pop the member and try again
        const parts = name.split('.');
        const memberName = parts.pop();
        result = scope === null || scope === void 0 ? void 0 : scope.getEnumMap().get(parts.join('.'));
        if (result) {
            const value = result.item.getMemberValue(memberName);
            return {
                enum: result.item,
                value: new Expression_1.LiteralExpression((0, creators_1.createToken)(
                //just use float literal for now...it will transpile properly with any literal value
                value.startsWith('"') ? TokenKind_1.TokenKind.StringLiteral : TokenKind_1.TokenKind.FloatLiteral, value))
            };
        }
    }
    processExpression(expression, scope) {
        var _a, _b, _c, _d;
        let containingNamespace = (_a = this.event.file.getNamespaceStatementForPosition(expression.range.start)) === null || _a === void 0 ? void 0 : _a.getName(Parser_1.ParseMode.BrighterScript);
        const parts = util_1.default.splitExpression(expression);
        const processedNames = [];
        for (let part of parts) {
            let entityName;
            if ((0, reflection_1.isVariableExpression)(part) || (0, reflection_1.isDottedGetExpression)(part)) {
                processedNames.push((_c = (_b = part === null || part === void 0 ? void 0 : part.name) === null || _b === void 0 ? void 0 : _b.text) === null || _c === void 0 ? void 0 : _c.toLocaleLowerCase());
                entityName = processedNames.join('.');
            }
            else {
                return;
            }
            let value;
            //did we find a const? transpile the value
            let constStatement = (_d = scope === null || scope === void 0 ? void 0 : scope.getConstFileLink(entityName, containingNamespace)) === null || _d === void 0 ? void 0 : _d.item;
            if (constStatement) {
                value = constStatement.value;
            }
            else {
                //did we find an enum member? transpile that
                let enumInfo = this.getEnumInfo(entityName, containingNamespace, scope);
                if (enumInfo === null || enumInfo === void 0 ? void 0 : enumInfo.value) {
                    value = enumInfo.value;
                }
            }
            if (value) {
                //override the transpile for this item.
                this.event.editor.setProperty(part, 'transpile', (state) => {
                    if ((0, reflection_1.isLiteralExpression)(value)) {
                        return value.transpile(state);
                    }
                    else {
                        //wrap non-literals with parens to prevent on-device compile errors
                        return ['(', ...value.transpile(state), ')'];
                    }
                });
                //we are finished handling this expression
                return;
            }
        }
    }
}
exports.BrsFilePreTranspileProcessor = BrsFilePreTranspileProcessor;
//# sourceMappingURL=BrsFilePreTranspileProcessor.js.map