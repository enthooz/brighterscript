"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_config_spec_1 = require("../../chai-config.spec");
const DiagnosticMessages_1 = require("../../DiagnosticMessages");
const testHelpers_spec_1 = require("../../testHelpers.spec");
const Program_1 = require("../../Program");
const reflection_1 = require("../../astUtils/reflection");
const util_1 = require("../../util");
describe('BrsFileValidator', () => {
    let program;
    beforeEach(() => {
        program = new Program_1.Program({});
    });
    it('links dotted get expression parents', () => {
        const file = program.setFile('source/main.bs', `
            sub main()
                print {}.beta.charlie
            end sub
        `);
        program.validate();
        const func = file.parser.ast.statements[0];
        const print = func.func.body.statements[0];
        (0, chai_config_spec_1.expect)(print.parent).to.equal(func.func.body);
        const charlie = print.expressions[0];
        (0, chai_config_spec_1.expect)(charlie.parent).to.equal(print);
        const beta = charlie.obj;
        (0, chai_config_spec_1.expect)(beta.parent).to.equal(charlie);
        const aaLiteral = beta.obj;
        (0, chai_config_spec_1.expect)(aaLiteral.parent).to.equal(beta);
    });
    it('links NamespacedVariableNameExpression dotted get parents', () => {
        const { ast } = program.setFile('source/main.bs', `
            namespace alpha.bravo
                class Delta extends alpha.bravo.Charlie
                end class
                class Charlie
                end class
            end namespace
        `);
        const namespace = ast.findChild(reflection_1.isNamespaceStatement);
        const deltaClass = namespace.findChild(reflection_1.isClassStatement);
        (0, chai_config_spec_1.expect)(deltaClass.parent).to.equal(namespace.body);
        const charlie = deltaClass.parentClassName.expression;
        (0, chai_config_spec_1.expect)(charlie.parent).to.equal(deltaClass.parentClassName);
        const bravo = charlie.obj;
        (0, chai_config_spec_1.expect)(bravo.parent).to.equal(charlie);
        const alpha = bravo.obj;
        (0, chai_config_spec_1.expect)(alpha.parent).to.equal(bravo);
    });
    describe('namespace validation', () => {
        it('succeeds if namespaces are defined inside other namespaces', () => {
            program.setFile('source/main.bs', `
                namespace alpha
                    ' random comment
                    namespace bravo
                        ' random comment
                        sub main()
                        end sub
                    end namespace
                end namespace
            `);
            program.validate();
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        it('fails if namespaces are defined inside a function', () => {
            program.setFile('source/main.bs', `
                function f()
                    namespace alpha
                    end namespace
                end function
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('namespace')
            ]);
        });
    });
    it('allows classes in correct locations', () => {
        program.setFile('source/main.bs', `
            class Alpha
            end class
            namespace Beta
                class Charlie
                end class
                namespace Delta
                    class Echo
                    end class
                end namespace
            end namespace
        `);
        program.validate();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
    });
    it('flags classes in wrong locations', () => {
        program.setFile('source/main.bs', `
            function test()
                class Alpha
                end class
                if true then
                    class Beta
                    end class
                end if
            end function
        `);
        program.validate();
        (0, testHelpers_spec_1.expectDiagnostics)(program, [Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('class')), { range: util_1.default.createRange(2, 16, 2, 27) }), Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('class')), { range: util_1.default.createRange(5, 20, 5, 30) })]);
    });
    it('allows enums in correct locations', () => {
        program.setFile('source/main.bs', `
            enum Alpha
                value1
            end enum
            namespace Beta
                enum Charlie
                    value1
                end enum
                namespace Delta
                    enum Echo
                        value1
                    end enum
                end namespace
            end namespace
        `);
        program.validate();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
    });
    it('flags enums in wrong locations', () => {
        program.setFile('source/main.bs', `
            function test()
                enum Alpha
                    value1
                end enum
                if true then
                    enum Beta
                        value1
                    end enum
                end if
            end function
        `);
        program.validate();
        (0, testHelpers_spec_1.expectDiagnostics)(program, [Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('enum')), { range: util_1.default.createRange(2, 16, 2, 26) }), Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('enum')), { range: util_1.default.createRange(6, 20, 6, 29) })]);
    });
    it('allows functions in correct locations', () => {
        program.setFile('source/main.bs', `
            function Alpha()
            end function
            namespace Beta
                function Charlie()
                end function
                namespace Delta
                    function Echo()
                    end function
                end namespace
            end namespace
        `);
        program.validate();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
    });
    it('flags functions in wrong locations', () => {
        program.setFile('source/main.bs', `
            function test()
                function Alpha()
                end function
                if true then
                    function Beta()
                    end function
                end if
            end function
        `);
        program.validate();
        (0, testHelpers_spec_1.expectDiagnostics)(program, [Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('function')), { range: util_1.default.createRange(2, 16, 2, 30) }), Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('function')), { range: util_1.default.createRange(5, 20, 5, 33) })]);
    });
    it('allows namespaces in correct locations', () => {
        program.setFile('source/main.bs', `
            namespace Alpha
            end namespace
            namespace Beta
                namespace Charlie
                end namespace
                namespace Delta
                    namespace Echo
                    end namespace
                end namespace
            end namespace
        `);
        program.validate();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
    });
    it('flags classes in wrong locations', () => {
        program.setFile('source/main.bs', `
            function test()
                namespace Alpha
                end namespace
                if true then
                    namespace Beta
                    end namespace
                end if
            end function
        `);
        program.validate();
        (0, testHelpers_spec_1.expectDiagnostics)(program, [Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('namespace')), { range: util_1.default.createRange(2, 16, 2, 31) }), Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('namespace')), { range: util_1.default.createRange(5, 20, 5, 34) })]);
    });
    it('allows interfaces in correct locations', () => {
        program.setFile('source/main.bs', `
            interface Alpha
                prop as string
            end interface
            namespace Beta
                interface Charlie
                    prop as string
                end interface
                namespace Delta
                    interface Echo
                        prop as string
                    end interface
                end namespace
            end namespace
        `);
        program.validate();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
    });
    it('flags interfaces in wrong locations', () => {
        program.setFile('source/main.bs', `
            function test()
                interface Alpha
                    prop as string
                end interface
                if true then
                    interface Beta
                        prop as string
                    end interface
                end if
            end function
        `);
        program.validate();
        (0, testHelpers_spec_1.expectDiagnostics)(program, [Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('interface')), { range: util_1.default.createRange(2, 16, 2, 31) }), Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('interface')), { range: util_1.default.createRange(6, 20, 6, 34) })]);
    });
    it('allows consts in correct locations', () => {
        program.setFile('source/main.bs', `
            const Alpha = 1
            namespace Beta
                const Charlie = 2
                namespace Delta
                    const Echo = 3
                end namespace
            end namespace
        `);
        program.validate();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
    });
    it('flags consts in wrong locations', () => {
        program.setFile('source/main.bs', `
            function test()
                const Alpha = 1
                if true then
                    const Beta = 2
                end if
            end function
        `);
        program.validate();
        (0, testHelpers_spec_1.expectDiagnostics)(program, [Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('const')), { range: util_1.default.createRange(2, 16, 2, 27) }), Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.keywordMustBeDeclaredAtNamespaceLevel('const')), { range: util_1.default.createRange(4, 20, 4, 30) })]);
    });
});
//# sourceMappingURL=BrsFileValidator.spec.js.map