"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_config_spec_1 = require("./chai-config.spec");
const sinonImport = require("sinon");
const vscode_languageserver_1 = require("vscode-languageserver");
const util_1 = require("./util");
const DiagnosticMessages_1 = require("./DiagnosticMessages");
const Program_1 = require("./Program");
const Parser_1 = require("./parser/Parser");
const PluginInterface_1 = require("./PluginInterface");
const testHelpers_spec_1 = require("./testHelpers.spec");
const Logger_1 = require("./Logger");
describe('Scope', () => {
    let sinon = sinonImport.createSandbox();
    let rootDir = process.cwd();
    let program;
    beforeEach(() => {
        program = new Program_1.Program({
            rootDir: rootDir
        });
        program.createSourceScope();
    });
    afterEach(() => {
        sinon.restore();
        program.dispose();
    });
    it('getEnumMemberFileLink does not crash on undefined name', () => {
        program.setFile('source/main.bs', ``);
        const scope = program.getScopesForFile('source/main.bs')[0];
        scope.getEnumMemberFileLink(null);
        //test passes if this doesn't explode
    });
    it('does not mark namespace functions as collisions with stdlib', () => {
        program.setFile(`source/main.bs`, `
            namespace a
                function constructor()
                end function
            end namespace
        `);
        program.validate();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
    });
    it('builds symbol table with namespace-relative entries', () => {
        const file = program.setFile('source/alpha.bs', `
            namespace alpha
                class Beta
                end class
            end namespace
            namespace alpha
                class Charlie extends Beta
                end class
                function createBeta()
                    return new Beta()
                end function
            end namespace
        `);
        program.setFile('source/main.bs', `
            function main()
                alpha.createBeta()
                thing = new alpha.Beta()
            end function
        `);
        program.validate();
        const scope = program.getScopesForFile('source/alpha.bs')[0];
        scope.linkSymbolTable();
        const symbolTable = file.parser.references.namespaceStatements[1].body.getSymbolTable();
        //the symbol table should contain the relative names for all items in this namespace across the entire scope
        (0, chai_config_spec_1.expect)(symbolTable.hasSymbol('Beta')).to.be.true;
        (0, chai_config_spec_1.expect)(symbolTable.hasSymbol('Charlie')).to.be.true;
        (0, chai_config_spec_1.expect)(symbolTable.hasSymbol('createBeta')).to.be.true;
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
    });
    it('handles variables with javascript prototype names', () => {
        program.setFile('source/main.brs', `
            sub main()
                constructor = true
            end sub
        `);
        program.validate();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
    });
    it('flags parameter with same name as namespace', () => {
        program.setFile('source/main.bs', `
            namespace NameA.NameB
            end namespace
            sub main(nameA)
            end sub
        `);
        program.validate();
        (0, testHelpers_spec_1.expectDiagnostics)(program, [
            DiagnosticMessages_1.DiagnosticMessages.parameterMayNotHaveSameNameAsNamespace('nameA')
        ]);
    });
    it('flags parameter with same name as a sub namespace part', () => {
        program.setFile('source/main.bs', `
            namespace alpha
                sub test(lineHeight as integer)
                end sub
            end namespace

            namespace alpha.lineHeight
            end namespace
        `);
        program.validate();
        (0, testHelpers_spec_1.expectDiagnostics)(program, [{
                //sub test(|lineHeight| as integer)
                message: DiagnosticMessages_1.DiagnosticMessages.parameterMayNotHaveSameNameAsNamespace('lineHeight').message,
                range: util_1.default.createRange(2, 25, 2, 35)
            }]);
    });
    it('flags assignments with same name as namespace', () => {
        program.setFile('source/main.bs', `
            namespace NameA.NameB
            end namespace
            sub main()
                namea = 2
                NAMEA += 1
            end sub
        `);
        program.validate();
        (0, testHelpers_spec_1.expectDiagnostics)(program, [
            Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.variableMayNotHaveSameNameAsNamespace('namea')), { range: util_1.default.createRange(4, 16, 4, 21) }),
            Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.variableMayNotHaveSameNameAsNamespace('NAMEA')), { range: util_1.default.createRange(5, 16, 5, 21) }),
            Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.itemCannotBeUsedAsVariable('namespace')), { range: util_1.default.createRange(5, 16, 5, 21) })
        ]);
    });
    it('allows adding diagnostics', () => {
        const source = program.getScopeByName('source');
        const expected = [{
                message: 'message',
                file: undefined,
                range: undefined
            }];
        source.addDiagnostics(expected);
        (0, testHelpers_spec_1.expectDiagnostics)(source, expected);
    });
    it('allows getting all scopes', () => {
        const scopes = program.getScopes();
        (0, chai_config_spec_1.expect)(scopes.length).to.equal(2);
    });
    describe('addFile', () => {
        it('detects callables from all loaded files', () => {
            const sourceScope = program.getScopeByName('source');
            program.setFile(`source/main.brs`, `
                sub Main()

                end sub

                sub ActionA()
                end sub
            `);
            program.setFile(`source/lib.brs`, `
                sub ActionB()
                end sub
            `);
            program.validate();
            (0, chai_config_spec_1.expect)(sourceScope.getOwnFiles().map(x => x.srcPath).sort()).eql([
                (0, util_1.standardizePath) `${rootDir}/source/lib.brs`,
                (0, util_1.standardizePath) `${rootDir}/source/main.brs`
            ]);
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            (0, chai_config_spec_1.expect)(sourceScope.getOwnCallables()).is.lengthOf(3);
            (0, chai_config_spec_1.expect)(sourceScope.getAllCallables()).is.length.greaterThan(3);
        });
        it('picks up new callables', () => {
            program.setFile('source/file.brs', '');
            //we have global callables, so get that initial number
            let originalLength = program.getScopeByName('source').getAllCallables().length;
            program.setFile('source/file.brs', `
                function DoA()
                    print "A"
                end function

                function DoA()
                    print "A"
                end function
            `);
            (0, chai_config_spec_1.expect)(program.getScopeByName('source').getAllCallables().length).to.equal(originalLength + 2);
        });
    });
    describe('removeFile', () => {
        it('removes callables from list', () => {
            //add the file
            let file = program.setFile(`source/file.brs`, `
                function DoA()
                    print "A"
                end function
            `);
            let initCallableCount = program.getScopeByName('source').getAllCallables().length;
            //remove the file
            program.removeFile(file.srcPath);
            (0, chai_config_spec_1.expect)(program.getScopeByName('source').getAllCallables().length).to.equal(initCallableCount - 1);
        });
    });
    describe('validate', () => {
        it('Validates not too many callfunc argument count', () => {
            program.options.autoImportComponentScript = true;
            program.setFile(`components/myComponent.bs`, `
                function myFunc(a, b, c, d, e)
                    return true
                end function
            `);
            program.setFile(`components/myComponent.xml`, `
                <component name="MyComponent" extends="Group">
                    <interface>
                        <function name="myFunc" />
                    </interface>
                </component>
            `);
            program.setFile(`components/main.bs`, `
                sub init()
                    m.mc@.callFunc(1,2,3,4,5)
                end sub
            `);
            program.setFile(`components/main.xml`, `
                <component name="MainScene" extends="Scene">
                    <children>
                        <MyComponent id="mc" />
                    </children>
                </component>
            `);
            program.validate();
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        it('Validates too many callfunc argument count', () => {
            program.options.autoImportComponentScript = true;
            program.setFile(`components/myComponent.bs`, `
                function myFunc(a, b, c, d, e, f)
                    return true
                end function
            `);
            program.setFile(`components/myComponent.xml`, `
                <component name="MyComponent" extends="Group">
                    <interface>
                        <function name="myFunc" />
                    </interface>
                </component>
            `);
            program.setFile(`components/main.bs`, `
                sub init()
                    m.mc@.callFunc(1,2,3,4,5,6)
                end sub
            `);
            program.setFile(`components/main.xml`, `
                <component name="MainScene" extends="Scene">
                    <children>
                        <MyComponent id="mc" />
                    </children>
                </component>
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.callfuncHasToManyArgs(6)
            ]);
        });
        it('diagnostics are assigned to correct child scope', () => {
            program.options.autoImportComponentScript = true;
            program.setFile('components/constants.bs', `
                namespace constants.alpha.beta
                    const charlie = "charlie"
                end namespace
            `);
            program.setFile('components/ButtonBase.xml', `<component name="ButtonBase" extends="Scene" />`);
            const buttonPrimary = program.setFile('components/ButtonPrimary.bs', `
                import "constants.bs"
                sub init()
                    print constants.alpha.delta.charlie
                end sub
            `);
            program.setFile('components/ButtonPrimary.xml', `<component name="ButtonPrimary" extends="ButtonBase" />`);
            const buttonSecondary = program.setFile('components/ButtonSecondary.bs', `
                import "constants.bs"
                sub init()
                    print constants.alpha.delta.charlie
                end sub
            `);
            program.setFile('components/ButtonSecondary.xml', `<component name="ButtonSecondary" extends="ButtonBase" />`);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                {
                    message: DiagnosticMessages_1.DiagnosticMessages.cannotFindName('delta').message,
                    file: {
                        srcPath: buttonPrimary.srcPath
                    },
                    relatedInformation: [{
                            message: `Not defined in scope '${(0, util_1.standardizePath)('components/ButtonPrimary.xml')}'`
                        }]
                }, {
                    message: DiagnosticMessages_1.DiagnosticMessages.cannotFindName('delta').message,
                    file: {
                        srcPath: buttonSecondary.srcPath
                    },
                    relatedInformation: [{
                            message: `Not defined in scope '${(0, util_1.standardizePath)('components/ButtonSecondary.xml')}'`
                        }]
                }
            ]);
        });
        it('recognizes dimmed vars', () => {
            program.setFile(`source/file.brs`, `
                function buildArray(numItems)
                    dim result[3]
                    for i = 0 to numItems
                        result.push(i)
                    end for
                    return result
                end function
            `);
            program.validate();
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        it('detects unknown namespace names', () => {
            program.setFile('source/main.bs', `
                sub main()
                    Name1.thing()
                    Name2.thing()
                end sub
                namespace Name1
                    sub thing()
                    end sub
                end namespace
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('Name2')
            ]);
        });
        it('detects namespace-relative namespace name used like a variable', () => {
            program.setFile('source/main.bs', `
                namespace Alpha.Beta
                    namespace Charlie
                    end namespace

                    sub test()
                        thing = Charlie
                        thing = Alpha.Beta.Charlie
                    end sub
                end namespace
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.itemCannotBeUsedAsVariable('namespace')), { range: util_1.default.createRange(6, 32, 6, 39) }), Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.itemCannotBeUsedAsVariable('namespace')), { range: util_1.default.createRange(7, 32, 7, 50) })]);
        });
        it('flags assignment with same name as a sub namespace part', () => {
            program.setFile('source/main.bs', `
                namespace alpha
                    sub test()
                        lineHeight = 1
                    end sub
                end namespace

                namespace alpha.lineHeight
                end namespace
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [{
                    //|lineHeight| = 1
                    message: DiagnosticMessages_1.DiagnosticMessages.variableMayNotHaveSameNameAsNamespace('lineHeight').message,
                    range: util_1.default.createRange(3, 24, 3, 34)
                }]);
        });
        it('flags local vars with same name as a sub namespace part', () => {
            program.setFile('source/main.bs', `
                namespace alpha
                    sub test()
                        print lineHeight
                    end sub
                end namespace

                namespace alpha.lineHeight
                    const lg = 1.75
                    const md = 1.5
                    const sm = 1.25
                    const xs = 1.0
                end namespace
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [{
                    //print |lineHeight|
                    message: DiagnosticMessages_1.DiagnosticMessages.itemCannotBeUsedAsVariable('namespace').message,
                    range: util_1.default.createRange(3, 30, 3, 40)
                }]);
        });
        it('accepts namespace names in their transpiled form in .brs files', () => {
            program.setFile('source/ns.bs', `
                namespace MyNamespace
                    sub foo()
                    end sub
                end namespace

                namespace A.B.C
                    sub ga()
                    end sub
                end namespace
            `);
            program.setFile('source/main.brs', `
                sub main()
                    MyNamespace_foo()
                    A_B_C_ga()
                end sub
            `);
            program.setFile('source/main.xml', `
                <?xml version="1.0" encoding="UTF-8"?>
                    <component name="MyComponent" extends="Group">
                    <script type="text/brightscript" uri="main.brs"/>
                    <script type="text/brightscript" uri="ns.bs"/>
                </component>
            `);
            program.validate();
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        it('Validates NOT too deep nested files', () => {
            program.setFile('source/folder2/folder3/folder4/folder5/folder6/folder7/main.brs', ``);
            program.setFile('source/folder2/folder3/folder4/folder5/folder6/folder7/main2.bs', ``);
            program.setFile('components/folder2/folder3/folder4/folder5/folder6/folder7/ButtonSecondary.xml', `<component name="ButtonSecondary" extends="ButtonBase" />`);
            program.validate();
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        it('Validates too deep nested files', () => {
            program.setFile('source/folder2/folder3/folder4/folder5/folder6/folder7/folder8/main.brs', ``);
            program.setFile('source/folder2/folder3/folder4/folder5/folder6/folder7/folder8/main2.bs', ``);
            program.setFile('components/folder2/folder3/folder4/folder5/folder6/folder7/folder8/ButtonSecondary.xml', `<component name="ButtonSecondary" extends="ButtonBase" />`);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.detectedTooDeepFileSource(8),
                DiagnosticMessages_1.DiagnosticMessages.detectedTooDeepFileSource(8),
                DiagnosticMessages_1.DiagnosticMessages.detectedTooDeepFileSource(8)
            ]);
        });
        it('detects unknown namespace sub-names', () => {
            program.setFile('source/main.bs', `
                sub main()
                    Name1.subname.thing()
                end sub
                namespace Name1
                    sub thing()
                    end sub
                end namespace
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.cannotFindName('subname', 'Name1.subname')), { range: util_1.default.createRange(2, 26, 2, 33) })]);
        });
        it('detects unknown enum names', () => {
            program.setFile('source/main.bs', `
                sub main()
                    print Direction.up
                    print up.Direction
                end sub
                enum Direction
                    up
                end enum
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('up')
            ]);
        });
        it('detects unknown function names', () => {
            program.setFile('source/main.bs', `
                sub main()
                    print go.toStr()
                    print go2.toStr()
                end sub

                function go()
                end function
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('go2')
            ]);
        });
        it('detects unknown const in assignment operator', () => {
            program.setFile('source/main.bs', `
                sub main()
                    value = ""
                    value += constants.API_KEY
                    value += API_URL
                end sub
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('constants'),
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('API_URL')
            ]);
        });
        it('detects unknown local var names', () => {
            program.setFile('source/lib.bs', `
                sub libFunc(param1)
                    print param1
                    print param2
                    name1 = "bob"
                    print name1
                    print name2
                    for each item1 in param1
                        print item1
                        print item2
                    end for
                    for idx1 = 0 to 10
                        print idx1
                        print idx2
                    end for
                    try
                        print 1
                    catch ex1
                        print ex1
                        print ex2
                    end try
                end sub

                function go()
                end function
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('param2'),
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('name2'),
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('item2'),
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('idx2'),
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('ex2')
            ]);
        });
        describe('createObject', () => {
            it('recognizes various scenegraph nodes', () => {
                program.setFile(`source/file.brs`, `
                    sub main()
                        scene = CreateObject("roSGScreen")
                        button = CreateObject("roSGNode", "Button")
                        list = CreateObject("roSGNode", "MarkupList")
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('recognizes valid custom components', () => {
                program.setFile('components/comp1.xml', (0, testHelpers_spec_1.trim) `
                    <?xml version="1.0" encoding="utf-8" ?>
                    <component name="Comp1" extends="Scene">
                    </component>
                `);
                program.setFile('components/comp2.xml', (0, testHelpers_spec_1.trim) `
                    <?xml version="1.0" encoding="utf-8" ?>
                    <component name="Comp2" extends="Scene">
                    </component>
                `);
                program.setFile(`source/file.brs`, `
                    sub main()
                        comp1 = CreateObject("roSGNode", "Comp1")
                        comp2 = CreateObject("roSGNode", "Comp2")
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('catches unknown roSGNodes', () => {
                program.setFile(`source/file.brs`, `
                    sub main()
                        scene = CreateObject("roSGNode", "notReal")
                        button = CreateObject("roSGNode", "alsoNotReal")
                        list = CreateObject("roSGNode", "definitelyNotReal")
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [
                    DiagnosticMessages_1.DiagnosticMessages.unknownRoSGNode('notReal'),
                    DiagnosticMessages_1.DiagnosticMessages.unknownRoSGNode('alsoNotReal'),
                    DiagnosticMessages_1.DiagnosticMessages.unknownRoSGNode('definitelyNotReal')
                ]);
            });
            it('only adds a single diagnostic when the file is used in multiple scopes', () => {
                program.setFile('components/Comp1.xml', (0, testHelpers_spec_1.trim) `
                    <?xml version="1.0" encoding="utf-8" ?>
                    <component name="Comp1" extends="Scene">
                        <script type="text/brightscript" uri="lib.brs" />
                    </component>
                `);
                program.setFile('components/Comp2.xml', (0, testHelpers_spec_1.trim) `
                    <?xml version="1.0" encoding="utf-8" ?>
                    <component name="Comp2" extends="Scene">
                        <script type="text/brightscript" uri="lib.brs" />
                    </component>
                `);
                program.setFile('components/lib.brs', `
                    sub init()

                        'unknown BrightScript component
                        createObject("roDateTime_FAKE")

                        'Wrong number of params
                        createObject("roDateTime", "this param should not be here")

                        'unknown roSGNode
                        createObject("roSGNode", "Rectangle_FAKE")

                        'deprecated
                        fontMetrics = CreateObject("roFontMetrics", "someFontName")
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [
                    DiagnosticMessages_1.DiagnosticMessages.unknownBrightScriptComponent('roDateTime_FAKE'),
                    DiagnosticMessages_1.DiagnosticMessages.mismatchCreateObjectArgumentCount('roDateTime', [1, 1], 2),
                    DiagnosticMessages_1.DiagnosticMessages.unknownRoSGNode('Rectangle_FAKE'),
                    DiagnosticMessages_1.DiagnosticMessages.unknownBrightScriptComponent('roFontMetrics')
                ]);
            });
            it('disregards component library components', () => {
                program.setFile(`source/file.brs`, `
                    sub main()
                        scene = CreateObject("roSGNode", "Complib1:MainScene")
                        button = CreateObject("roSGNode", "buttonlib:Button")
                        list = CreateObject("roSGNode", "listlib:List")
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('disregards non-literal args', () => {
                program.setFile(`source/file.brs`, `
                    sub main()
                        sgNodeName =  "roSGNode"
                        compNameAsVar =  "Button"
                        button = CreateObject(sgNodeName, compNameAsVar)
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('recognizes valid BrightScript components', () => {
                program.setFile(`source/file.brs`, `
                    sub main()
                        timeSpan = CreateObject("roTimespan")
                        bitmap = CreateObject("roBitmap", {width:10, height:10, AlphaEnable:false, name:"MyBitmapName"})
                        path = CreateObject("roPath", "ext1:/vid")
                        region = CreateObject("roRegion", bitmap, 20, 30, 100, 200)
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('catches invalid BrightScript components', () => {
                program.setFile(`source/file.brs`, `
                    sub main()
                        timeSpan = CreateObject("Thing")
                        bitmap = CreateObject("OtherThing", {width:10, height:10, AlphaEnable:false, name:"MyBitmapName"})
                        path = CreateObject("SomethingElse", "ext1:/vid")
                        region = CreateObject("Button", bitmap, 20, 30, 100, 200)
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [
                    DiagnosticMessages_1.DiagnosticMessages.unknownBrightScriptComponent('Thing'),
                    DiagnosticMessages_1.DiagnosticMessages.unknownBrightScriptComponent('OtherThing'),
                    DiagnosticMessages_1.DiagnosticMessages.unknownBrightScriptComponent('SomethingElse'),
                    DiagnosticMessages_1.DiagnosticMessages.unknownBrightScriptComponent('Button')
                ]);
            });
            it('catches wrong number of arguments', () => {
                program.setFile(`source/file.brs`, `
                    sub main()
                        button = CreateObject("roSGNode", "Button", "extraArg")
                        bitmap = CreateObject("roBitmap") ' no 2nd arg
                        timeSpan = CreateObject("roTimespan", 1, 2, 3)
                        region = CreateObject("roRegion", bitmap, 20, 30, 100) ' missing last arg
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [
                    DiagnosticMessages_1.DiagnosticMessages.mismatchCreateObjectArgumentCount('roSGNode', [2], 3),
                    DiagnosticMessages_1.DiagnosticMessages.mismatchCreateObjectArgumentCount('roBitmap', [2], 1),
                    DiagnosticMessages_1.DiagnosticMessages.mismatchCreateObjectArgumentCount('roTimespan', [1], 4),
                    DiagnosticMessages_1.DiagnosticMessages.mismatchCreateObjectArgumentCount('roRegion', [6], 5)
                ]);
            });
            it('catches deprecated components', () => {
                program.setFile(`source/file.brs`, `
                    sub main()
                        fontMetrics = CreateObject("roFontMetrics", "someFontName")
                    end sub
                `);
                program.validate();
                // only care about code and `roFontMetrics` match
                (0, testHelpers_spec_1.expectDiagnostics)(program, [
                    DiagnosticMessages_1.DiagnosticMessages.unknownBrightScriptComponent('roFontMetrics')
                ]);
            });
        });
        it('marks the scope as validated after validation has occurred', () => {
            program.setFile(`source/main.bs`, `
               sub main()
               end sub
            `);
            let lib = program.setFile(`source/lib.bs`, `
               sub libFunc()
               end sub
            `);
            (0, chai_config_spec_1.expect)(program.getScopesForFile(lib)[0].isValidated).to.be.false;
            program.validate();
            (0, chai_config_spec_1.expect)(program.getScopesForFile(lib)[0].isValidated).to.be.true;
            lib = program.setFile(`source/lib.bs`, `
                sub libFunc()
                end sub
            `);
            //scope gets marked as invalidated
            (0, chai_config_spec_1.expect)(program.getScopesForFile(lib)[0].isValidated).to.be.false;
        });
        it('does not mark same-named-functions in different namespaces as an error', () => {
            program.setFile(`source/main.bs`, `
                namespace NameA
                    sub alert()
                    end sub
                end namespace
                namespace NameB
                    sub alert()
                    end sub
                end namespace
            `);
            program.validate();
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        it('resolves local-variable function calls', () => {
            program.setFile(`source/main.brs`, `
                sub DoSomething()
                    sayMyName = function(name as string)
                    end function

                    sayMyName()
                end sub`);
            program.validate();
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        describe('function shadowing', () => {
            it('warns when local var function has same name as stdlib function', () => {
                program.setFile(`source/main.brs`, `
                    sub main()
                        str = function(p)
                            return "override"
                        end function
                        print str(12345) 'prints "12345" (i.e. our local function is never used)
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.localVarFunctionShadowsParentFunction('stdlib')), { range: vscode_languageserver_1.Range.create(2, 24, 2, 27) })]);
            });
            it('warns when local var has same name as built-in function', () => {
                program.setFile(`source/main.brs`, `
                    sub main()
                        str = 12345
                        print str ' prints "12345" (i.e. our local variable is allowed to shadow the built-in function name)
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('warns when local var has same name as built-in function', () => {
                program.setFile(`source/main.brs`, `
                    sub main()
                        str = 6789
                        print str(12345) ' prints "12345" (i.e. our local variable did not override the callable global function)
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('detects local function with same name as scope function', () => {
                program.setFile(`source/main.brs`, `
                    sub main()
                        getHello = function()
                            return "override"
                        end function
                        print getHello() 'prints "hello" (i.e. our local variable is never called)
                    end sub

                    function getHello()
                        return "hello"
                    end function
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [{
                        message: DiagnosticMessages_1.DiagnosticMessages.localVarFunctionShadowsParentFunction('scope').message,
                        range: vscode_languageserver_1.Range.create(2, 24, 2, 32)
                    }]);
            });
            it('detects local function with same name as scope function', () => {
                program.setFile(`source/main.brs`, `
                    sub main()
                        getHello = "override"
                        print getHello ' prints <Function: gethello> (i.e. local variable override does NOT work for same-scope-defined methods)
                    end sub
                    function getHello()
                        return "hello"
                    end function
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [{
                        message: DiagnosticMessages_1.DiagnosticMessages.localVarShadowedByScopedFunction().message,
                        range: vscode_languageserver_1.Range.create(2, 24, 2, 32)
                    }]);
            });
            it('flags scope function with same name (but different case) as built-in function', () => {
                program.setFile('source/main.brs', `
                    sub main()
                        print str(12345) ' prints 12345 (i.e. our str() function below is ignored)
                    end sub
                    function STR(num)
                        return "override"
                    end function
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [{
                        message: DiagnosticMessages_1.DiagnosticMessages.scopeFunctionShadowedByBuiltInFunction().message,
                        range: vscode_languageserver_1.Range.create(4, 29, 4, 32)
                    }]);
            });
        });
        it('detects duplicate callables', () => {
            program.setFile('source/file.brs', `
                function DoA()
                    print "A"
                end function

                 function DoA()
                     print "A"
                 end function
            `);
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            //validate the scope
            program.validate();
            //we should have the "DoA declared more than once" error twice (one for each function named "DoA")
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.duplicateFunctionImplementation('DoA', 'source'),
                DiagnosticMessages_1.DiagnosticMessages.duplicateFunctionImplementation('DoA', 'source')
            ]);
        });
        it('detects calls to unknown callables', () => {
            program.setFile('source/file.brs', `
                function DoA()
                    DoB()
                end function
            `);
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            //validate the scope
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('DoB')
            ]);
        });
        it('recognizes known callables', () => {
            program.setFile('source/file.brs', `
                function DoA()
                    DoB()
                end function
                function DoB()
                    DoC()
                end function
            `);
            //validate the scope
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.cannotFindName('DoC')
            ]);
        });
        it('does not error with calls to callables in same namespace', () => {
            program.setFile('source/file.bs', `
                namespace Name.Space
                    sub a(param as string)
                        print param
                    end sub

                    sub b()
                        a("hello")
                    end sub
                end namespace
            `);
            //validate the scope
            program.validate();
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        //We don't currently support someObj.callSomething() format, so don't throw errors on those
        it('does not fail on object callables', () => {
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            program.setFile('source/file.brs', `
               function DoB()
                    m.doSomething()
                end function
            `);
            //validate the scope
            program.validate();
            //shouldn't have any errors
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        it('detects calling functions with too many parameters', () => {
            program.setFile('source/file.brs', `
                sub a()
                end sub
                sub b()
                    a(1)
                end sub
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.mismatchArgumentCount(0, 1).message
            ]);
        });
        it('detects calling class constructors with too many parameters', () => {
            program.setFile('source/main.bs', `
                function noop0()
                end function

                function noop1(p1)
                end function

                sub main()
                   noop0(1)
                   noop1(1,2)
                   noop1()
                end sub
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.mismatchArgumentCount(0, 1),
                DiagnosticMessages_1.DiagnosticMessages.mismatchArgumentCount(1, 2),
                DiagnosticMessages_1.DiagnosticMessages.mismatchArgumentCount(1, 0)
            ]);
        });
        it('detects calling functions with too many parameters', () => {
            program.setFile('source/file.brs', `
                sub a(name)
                end sub
                sub b()
                    a()
                end sub
            `);
            program.validate();
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.mismatchArgumentCount(1, 0)
            ]);
        });
        it('allows skipping optional parameter', () => {
            program.setFile('source/file.brs', `
                sub a(name="Bob")
                end sub
                sub b()
                    a()
                end sub
            `);
            program.validate();
            //should have an error
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        it('shows expected parameter range in error message', () => {
            program.setFile('source/file.brs', `
                sub a(age, name="Bob")
                end sub
                sub b()
                    a()
                end sub
            `);
            program.validate();
            //should have an error
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.mismatchArgumentCount('1-2', 0)
            ]);
        });
        it('handles expressions as arguments to a function', () => {
            program.setFile('source/file.brs', `
                sub a(age, name="Bob")
                end sub
                sub b()
                    a("cat" + "dog" + "mouse")
                end sub
            `);
            program.validate();
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        it('Catches extra arguments for expressions as arguments to a function', () => {
            program.setFile('source/file.brs', `
                sub a(age)
                end sub
                sub b()
                    a(m.lib.movies[0], 1)
                end sub
            `);
            program.validate();
            //should have an error
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.mismatchArgumentCount(1, 2)
            ]);
        });
        it('handles JavaScript reserved names', () => {
            program.setFile('source/file.brs', `
                sub constructor()
                end sub
                sub toString()
                end sub
                sub valueOf()
                end sub
                sub getPrototypeOf()
                end sub
            `);
            program.validate();
            (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
        });
        it('Emits validation events', () => {
            program.setFile('source/file.brs', ``);
            program.setFile('components/comp.xml', (0, testHelpers_spec_1.trim) `
                <?xml version="1.0" encoding="utf-8" ?>
                <component name="comp" extends="Scene">
                    <script uri="comp.brs"/>
                </component>
            `);
            program.setFile((0, util_1.standardizePath) `components/comp.brs`, ``);
            const sourceScope = program.getScopeByName('source');
            const compScope = program.getScopeByName('components/comp.xml');
            program.plugins = new PluginInterface_1.default([], { logger: new Logger_1.Logger() });
            const plugin = program.plugins.add({
                name: 'Emits validation events',
                beforeScopeValidate: sinon.spy(),
                onScopeValidate: sinon.spy(),
                afterScopeValidate: sinon.spy()
            });
            program.validate();
            const scopeNames = program.getScopes().map(x => x.name).filter(x => x !== 'global').sort();
            (0, chai_config_spec_1.expect)(plugin.beforeScopeValidate.callCount).to.equal(2);
            (0, chai_config_spec_1.expect)(plugin.beforeScopeValidate.calledWith(sourceScope)).to.be.true;
            (0, chai_config_spec_1.expect)(plugin.beforeScopeValidate.calledWith(compScope)).to.be.true;
            (0, chai_config_spec_1.expect)(plugin.onScopeValidate.callCount).to.equal(2);
            (0, chai_config_spec_1.expect)(plugin.onScopeValidate.getCalls().map(x => x.args[0].scope.name).sort()).to.eql(scopeNames);
            (0, chai_config_spec_1.expect)(plugin.afterScopeValidate.callCount).to.equal(2);
            (0, chai_config_spec_1.expect)(plugin.afterScopeValidate.calledWith(sourceScope)).to.be.true;
            (0, chai_config_spec_1.expect)(plugin.afterScopeValidate.calledWith(compScope)).to.be.true;
        });
        describe('custom types', () => {
            it('detects an unknown function return type', () => {
                program.setFile(`source/main.bs`, `
                    function a()
                        return invalid
                    end function

                    function b() as integer
                        return 1
                    end function

                    function c() as unknownType 'error
                        return 2
                    end function

                    class myClass
                        function myClassMethod() as unknownType 'error
                            return 2
                        end function
                    end class

                    function d() as myClass
                        return new myClass()
                    end function
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [
                    DiagnosticMessages_1.DiagnosticMessages.invalidFunctionReturnType('unknownType').message,
                    DiagnosticMessages_1.DiagnosticMessages.invalidFunctionReturnType('unknownType').message
                ]);
            });
            it('detects an unknown function parameter type', () => {
                program.setFile(`source/main.bs`, `
                    sub a(num as integer)
                    end sub

                    sub b(unknownParam as unknownType) 'error
                    end sub

                    class myClass
                        sub myClassMethod(unknownParam as unknownType) 'error
                        end sub
                    end class

                    sub d(obj as myClass)
                    end sub
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [
                    DiagnosticMessages_1.DiagnosticMessages.functionParameterTypeIsInvalid('unknownParam', 'unknownType').message,
                    DiagnosticMessages_1.DiagnosticMessages.functionParameterTypeIsInvalid('unknownParam', 'unknownType').message
                ]);
            });
            it('detects an unknown field parameter type', () => {
                program.setFile(`source/main.bs`, `
                    class myClass
                        foo as unknownType 'error
                    end class

                    class myOtherClass
                        foo as unknownType 'error
                        bar as myClass
                        buz as myOtherClass
                    end class
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [
                    DiagnosticMessages_1.DiagnosticMessages.cannotFindType('unknownType').message,
                    DiagnosticMessages_1.DiagnosticMessages.cannotFindType('unknownType').message
                ]);
            });
            it('supports enums and interfaces as types', () => {
                program.setFile(`source/main.bs`, `

                    interface MyInterface
                        title as string
                    end interface
                    enum myEnum
                        title = "t"
                    end enum

                    class myClass
                        foo as myInterface
                        foo2 as myEnum
                    end class
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('finds interface types', () => {
                program.setFile(`source/main.bs`, `
                    namespace MyNamespace
                        interface MyInterface
                          title as string
                        end interface

                        function bar(param as MyNamespace.MyInterface) as MyNamespace.MyInterface
                        end function

                    end namespace

                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('finds non-namespaced interface types', () => {
                program.setFile(`source/main.bs`, `
                    interface MyInterface
                        title as string
                    end interface

                    namespace MyNamespace
                        function bar(param as MyInterface) as MyInterface
                        end function

                    end namespace

                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('finds enum types', () => {
                program.setFile(`source/main.bs`, `
                    namespace MyNamespace
                        enum MyEnum
                          title = "t"
                        end enum

                        function bar(param as MyNamespace.MyEnum) as MyNamespace.MyEnum
                        end function

                    end namespace

                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('finds non-namespaced enum types', () => {
                program.setFile(`source/main.bs`, `
                    enum MyEnum
                        title = "t"
                    end enum

                    namespace MyNamespace
                        function bar(param as MyEnum) as MyEnum
                        end function

                    end namespace

                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('finds custom types inside namespaces', () => {
                program.setFile(`source/main.bs`, `
                    namespace MyNamespace
                        class MyClass
                        end class

                        function foo(param as MyClass) as MyClass
                        end function

                        function bar(param as MyNamespace.MyClass) as MyNamespace.MyClass
                        end function

                    end namespace

                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('finds custom types from other namespaces', () => {
                program.setFile(`source/main.bs`, `
                    namespace MyNamespace
                        class MyClass
                        end class
                    end namespace

                    function foo(param as MyNamespace.MyClass) as MyNamespace.MyClass
                    end function
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('detects missing custom types from current namespaces', () => {
                program.setFile(`source/main.bs`, `
                    namespace MyNamespace
                        class MyClass
                        end class

                        function foo() as UnknownType
                        end function
                    end namespace
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [
                    DiagnosticMessages_1.DiagnosticMessages.invalidFunctionReturnType('UnknownType').message
                ]);
            });
            it('finds custom types from other other files', () => {
                program.setFile(`source/main.bs`, `
                    function foo(param as MyClass) as MyClass
                    end function
                `);
                program.setFile(`source/MyClass.bs`, `
                    class MyClass
                    end class
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('finds custom types from other other files', () => {
                program.setFile(`source/main.bs`, `
                    function foo(param as MyNameSpace.MyClass) as MyNameSpace.MyClass
                    end function
                `);
                program.setFile(`source/MyNameSpace.bs`, `
                    namespace MyNameSpace
                      class MyClass
                      end class
                    end namespace
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
            it('detects missing custom types from another namespaces', () => {
                program.setFile(`source/main.bs`, `
                    namespace MyNamespace
                        class MyClass
                        end class
                    end namespace

                    function foo() as MyNamespace.UnknownType
                    end function
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [
                    DiagnosticMessages_1.DiagnosticMessages.invalidFunctionReturnType('MyNamespace.UnknownType')
                ]);
            });
            it('scopes types to correct scope', () => {
                program = new Program_1.Program({ rootDir: rootDir });
                program.setFile('components/foo.xml', (0, testHelpers_spec_1.trim) `
                    <?xml version="1.0" encoding="utf-8" ?>
                    <component name="foo" extends="Scene">
                        <script uri="foo.bs"/>
                    </component>
                `);
                program.setFile((0, util_1.standardizePath) `components/foo.bs`, `
                    class MyClass
                    end class
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
                program.setFile('components/bar.xml', (0, testHelpers_spec_1.trim) `
                    <?xml version="1.0" encoding="utf-8" ?>
                    <component name="bar" extends="Scene">
                        <script uri="bar.bs"/>
                    </component>
                `);
                program.setFile((0, util_1.standardizePath) `components/bar.bs`, `
                    function getFoo() as MyClass
                    end function
                `);
                program.validate();
                (0, testHelpers_spec_1.expectDiagnostics)(program, [
                    DiagnosticMessages_1.DiagnosticMessages.invalidFunctionReturnType('MyClass').message
                ]);
            });
            it('can reference types from parent component', () => {
                program = new Program_1.Program({ rootDir: rootDir });
                program.setFile('components/parent.xml', (0, testHelpers_spec_1.trim) `
                    <?xml version="1.0" encoding="utf-8" ?>
                    <component name="parent" extends="Scene">
                        <script uri="parent.bs"/>
                    </component>
                `);
                program.setFile((0, util_1.standardizePath) `components/parent.bs`, `
                    class MyClass
                    end class
                `);
                program.setFile('components/child.xml', (0, testHelpers_spec_1.trim) `
                    <?xml version="1.0" encoding="utf-8" ?>
                    <component name="child" extends="parent">
                        <script uri="child.bs"/>
                    </component>
                `);
                program.setFile((0, util_1.standardizePath) `components/child.bs`, `
                    function getFoo() as MyClass
                    end function
                `);
                program.validate();
                (0, testHelpers_spec_1.expectZeroDiagnostics)(program);
            });
        });
    });
    describe('inheritance', () => {
        it('inherits callables from parent', () => {
            program = new Program_1.Program({ rootDir: rootDir });
            program.setFile('components/child.xml', (0, testHelpers_spec_1.trim) `
                <?xml version="1.0" encoding="utf-8" ?>
                <component name="child" extends="parent">
                    <script uri="child.brs"/>
                </component>
            `);
            program.setFile((0, util_1.standardizePath) `components/child.brs`, ``);
            program.validate();
            let childScope = program.getComponentScope('child');
            (0, chai_config_spec_1.expect)(childScope.getAllCallables().map(x => x.callable.name)).not.to.include('parentSub');
            program.setFile('components/parent.xml', (0, testHelpers_spec_1.trim) `
                <?xml version="1.0" encoding="utf-8" ?>
                <component name="parent" extends="Scene">
                    <script uri="parent.brs"/>
                </component>
            `);
            program.setFile((0, util_1.standardizePath) `components/parent.brs`, `
                sub parentSub()
                end sub
            `);
            program.validate();
            (0, chai_config_spec_1.expect)(childScope.getAllCallables().map(x => x.callable.name)).to.include('parentSub');
        });
    });
    describe('detachParent', () => {
        it('does not attach global to itself', () => {
            (0, chai_config_spec_1.expect)(program.globalScope.getParentScope()).not.to.exist;
        });
    });
    describe('getDefinition', () => {
        it('returns empty list when there are no files', () => {
            let file = program.setFile('source/main.brs', '');
            let scope = program.getScopeByName('source');
            (0, chai_config_spec_1.expect)(scope.getDefinition(file, vscode_languageserver_1.Position.create(0, 0))).to.be.lengthOf(0);
        });
    });
    describe('getCallablesAsCompletions', () => {
        it('returns documentation when possible', () => {
            let completions = program.globalScope.getCallablesAsCompletions(Parser_1.ParseMode.BrightScript);
            //it should find the completions for the global scope
            (0, chai_config_spec_1.expect)(completions).to.be.length.greaterThan(0);
            //it should find documentation for completions
            (0, chai_config_spec_1.expect)(completions.filter(x => !!x.documentation)).to.have.length.greaterThan(0);
        });
    });
    describe('buildNamespaceLookup', () => {
        it('does not crash when class statement is missing `name` prop', () => {
            program.setFile('source/main.bs', `
                namespace NameA
                    class
                    end class
                end namespace
            `);
            program['scopes']['source'].buildNamespaceLookup();
        });
        it('does not crash when function statement is missing `name` prop', () => {
            const file = program.setFile('source/main.bs', `
                namespace NameA
                    function doSomething()
                    end function
                end namespace
            `);
            delete file.ast.statements[0].body.statements[0].name;
            program.validate();
            program['scopes']['source'].buildNamespaceLookup();
        });
    });
    describe('buildEnumLookup', () => {
        it('builds enum lookup', () => {
            const sourceScope = program.getScopeByName('source');
            //eslint-disable-next-line @typescript-eslint/no-floating-promises
            program.setFile('source/main.bs', `
                enum foo
                    bar1
                    bar2
                end enum

                namespace test
                    function fooFace2()
                    end function

                    class fooClass2
                    end class

                    enum foo2
                        bar2_1
                        bar2_2
                    end enum
                end namespace

                enum foo3
                    bar3_1
                    bar3_2
                end enum
            `);
            program.validate();
            (0, chai_config_spec_1.expect)([...sourceScope.getEnumMap().keys()]).to.eql([
                'foo',
                'test.foo2',
                'foo3'
            ]);
        });
    });
});
//# sourceMappingURL=Scope.spec.js.map