"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testHelpers_spec_1 = require("../../../testHelpers.spec");
const util_1 = require("../../../util");
const Program_1 = require("../../../Program");
const sinon_1 = require("sinon");
const Parser_1 = require("../../Parser");
const chai_config_spec_1 = require("../../../chai-config.spec");
const TokenKind_1 = require("../../../lexer/TokenKind");
const Expression_1 = require("../../Expression");
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const testHelpers_spec_2 = require("../../../testHelpers.spec");
const sinon = (0, sinon_1.createSandbox)();
describe('ConstStatement', () => {
    let program;
    let parser;
    let testTranspile = (0, testHelpers_spec_1.getTestTranspile)(() => [program, testHelpers_spec_2.rootDir]);
    let testGetTypedef = (0, testHelpers_spec_1.getTestGetTypedef)(() => [program, testHelpers_spec_2.rootDir]);
    beforeEach(() => {
        program = new Program_1.Program({ rootDir: testHelpers_spec_2.rootDir, sourceMap: true });
        parser = new Parser_1.Parser();
    });
    afterEach(() => {
        sinon.restore();
        program.dispose();
    });
    it('does not prevent using `const` as a variable name in .brs files', () => {
        program.setFile('source/main.brs', `
            sub main()
                const = {
                    name: "Bob"
                }
                print const.name = {}
            end sub
        `);
        program.validate();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
    });
    it('supports basic structure', () => {
        var _a, _b;
        parser.parse('const API_KEY = "abc"', { mode: Parser_1.ParseMode.BrighterScript });
        (0, testHelpers_spec_1.expectZeroDiagnostics)(parser);
        const statement = parser.ast.statements[0];
        (0, chai_config_spec_1.expect)((_a = statement.tokens.const) === null || _a === void 0 ? void 0 : _a.kind).to.eql(TokenKind_1.TokenKind.Const);
        (0, chai_config_spec_1.expect)(statement.tokens.name).to.include({
            kind: TokenKind_1.TokenKind.Identifier,
            text: 'API_KEY'
        });
        const value = statement.value;
        (0, chai_config_spec_1.expect)(value).to.be.instanceof(Expression_1.LiteralExpression);
        (0, chai_config_spec_1.expect)((_b = value.token) === null || _b === void 0 ? void 0 : _b.text).to.eql('"abc"');
        //ensure range is correct
        (0, chai_config_spec_1.expect)(statement.range).to.eql(util_1.util.createRange(0, 0, 0, 21));
    });
    it('produces typedef', () => {
        testGetTypedef(`
            const API_KEY = "abc"
            const SOME_OBJ = {}
            const SOME_ARR = []
        `);
    });
    describe('transpile', () => {
        it('transpiles simple consts', () => {
            testTranspile(`
                const API_KEY = "abc"
                sub main()
                    print API_KEY
                end sub
            `, `
                sub main()
                    print "abc"
                end sub
            `);
        });
        it('transpiles arrays', () => {
            testTranspile(`
                const WORDS = [
                    "alpha"
                    "beta"
                ]
                sub main()
                    print WORDS
                end sub
            `, `
                sub main()
                    print ([
                        "alpha"
                        "beta"
                    ])
                end sub
            `);
        });
        it('transpiles objects', () => {
            testTranspile(`
                const DEFAULTS = {
                    alpha: true
                    beta: true
                }
                sub main()
                    print DEFAULTS
                end sub
            `, `
                sub main()
                    print ({
                        alpha: true
                        beta: true
                    })
                end sub
            `);
        });
        it('supports consts inside namespaces', () => {
            testTranspile(`
                namespace network
                    const API_KEY = "abc"
                    sub get()
                        print API_KEY
                    end sub
                end namespace
                sub main()
                    print network.API_KEY
                end sub
            `, `
                sub network_get()
                    print "abc"
                end sub

                sub main()
                    print "abc"
                end sub
            `);
        });
        it('supports property access on complex objects', () => {
            testTranspile(`
                const DEFAULTS = {
                    enabled: true
                }
                sub main()
                    print DEFAULTS.enabled
                end sub
            `, `
                sub main()
                    print ({
                        enabled: true
                    }).enabled
                end sub
            `);
        });
        it('supports calling methods on consts', () => {
            testTranspile(`
                const API_KEY ="ABC"
                sub main()
                    print API_KEY.toString()
                end sub
            `, `
                sub main()
                    print "ABC".toString()
                end sub
            `);
        });
        it('transpiles within += operator', () => {
            testTranspile(`
                namespace constants
                    const API_KEY = "test"
                end namespace
                const API_URL = "url"
                sub main()
                    value = ""
                    value += constants.API_KEY
                    value += API_URL
                end sub
            `, `
                sub main()
                    value = ""
                    value += "test"
                    value += "url"
                end sub
            `);
        });
    });
    describe('completions', () => {
        it('shows up in standard completions', () => {
            program.setFile('source/main.bs', `
                const API_KEY = "123"
                sub log(message)
                    log()
                end sub
            `);
            (0, testHelpers_spec_1.expectCompletionsIncludes)(
            // log(|)
            program.getCompletions('source/main.bs', util_1.util.createPosition(3, 24)), [{
                    label: 'API_KEY',
                    kind: vscode_languageserver_protocol_1.CompletionItemKind.Constant
                }]);
        });
        it('shows up in namespace completions', () => {
            program.setFile('source/main.bs', `
                namespace constants
                    const API_KEY = "123"
                end namespace
                sub log(message)
                    log(constants.)
                end sub
            `);
            (0, testHelpers_spec_1.expectCompletionsIncludes)(
            // log(|)
            program.getCompletions('source/main.bs', util_1.util.createPosition(5, 34)), [{
                    label: 'API_KEY',
                    kind: vscode_languageserver_protocol_1.CompletionItemKind.Constant
                }]);
        });
    });
});
//# sourceMappingURL=ConstStatement.spec.js.map