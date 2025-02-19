"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_config_spec_1 = require("../../chai-config.spec");
const vscode_uri_1 = require("vscode-uri");
const Program_1 = require("../../Program");
const testHelpers_spec_1 = require("../../testHelpers.spec");
const util_1 = require("../../util");
const testHelpers_spec_2 = require("../../testHelpers.spec");
describe('CodeActionsProcessor', () => {
    let program;
    beforeEach(() => {
        program = new Program_1.Program({
            rootDir: testHelpers_spec_2.rootDir,
            autoImportComponentScript: true
        });
    });
    afterEach(() => {
        program.dispose();
    });
    /**
     * Helper function for testing code actions
     */
    function testGetCodeActions(file, range, expected) {
        program.validate();
        (0, chai_config_spec_1.expect)(program.getCodeActions(typeof file === 'string' ? file : file.srcPath, range).map(x => x.title).sort()).to.eql(expected);
    }
    describe('getCodeActions', () => {
        it('suggests `extends=Group`', () => {
            const file = program.setFile('components/comp1.xml', (0, testHelpers_spec_1.trim) `
                <?xml version="1.0" encoding="utf-8" ?>
                <component name="comp1">
                </component>
            `);
            program.validate();
            (0, testHelpers_spec_1.expectCodeActions)(() => {
                program.getCodeActions(file.srcPath, 
                //<comp|onent name="comp1">
                util_1.util.createRange(1, 5, 1, 5));
            }, [{
                    title: `Extend "Group"`,
                    isPreferred: true,
                    kind: 'quickfix',
                    changes: [{
                            filePath: (0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/components/comp1.xml`,
                            newText: ' extends="Group"',
                            type: 'insert',
                            //<component name="comp1"|>
                            position: util_1.util.createPosition(1, 23)
                        }]
                }, {
                    title: `Extend "Task"`,
                    kind: 'quickfix',
                    changes: [{
                            filePath: (0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/components/comp1.xml`,
                            newText: ' extends="Task"',
                            type: 'insert',
                            //<component name="comp1"|>
                            position: util_1.util.createPosition(1, 23)
                        }]
                }, {
                    title: `Extend "ContentNode"`,
                    kind: 'quickfix',
                    changes: [{
                            filePath: (0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/components/comp1.xml`,
                            newText: ' extends="ContentNode"',
                            type: 'insert',
                            //<component name="comp1"|>
                            position: util_1.util.createPosition(1, 23)
                        }]
                }]);
        });
        it('adds attribute at end of component with multiple attributes`', () => {
            const file = program.setFile('components/comp1.xml', (0, testHelpers_spec_1.trim) `
                <?xml version="1.0" encoding="utf-8" ?>
                <component name="comp1" attr2="attr3" attr3="attr3">
                </component>
            `);
            program.validate();
            const codeActions = program.getCodeActions(file.srcPath, 
            //<comp|onent name="comp1">
            util_1.util.createRange(1, 5, 1, 5));
            (0, chai_config_spec_1.expect)(codeActions[0].edit.changes[vscode_uri_1.URI.file((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/components/comp1.xml`).toString()][0].range).to.eql(util_1.util.createRange(1, 51, 1, 51));
        });
        it('does not produce duplicate code actions for bs imports', () => {
            //define the function in two files
            program.setFile('components/lib1.brs', `
                sub doSomething()
                end sub
            `);
            program.setFile('components/lib2.brs', `
                sub doSomething()
                end sub
            `);
            //use the function in this file
            const componentCommonFile = program.setFile('components/ComponentCommon.bs', `
                sub init()
                    doSomething()
                end sub
            `);
            //import the file in two scopes
            program.setFile('components/comp1.xml', (0, testHelpers_spec_1.trim) `
                <?xml version="1.0" encoding="utf-8" ?>
                <component name="ChildScene">
                    <script uri="ComponentCommon.bs" />
                </component>
            `);
            program.setFile('components/comp2.xml', (0, testHelpers_spec_1.trim) `
                <?xml version="1.0" encoding="utf-8" ?>
                <component name="ChildScene">
                    <script uri="ComponentCommon.bs" />
                </component>
            `);
            program.validate();
            //we should only get each file import suggestion exactly once
            const codeActions = program.getCodeActions(componentCommonFile.srcPath, 
            // doSome|thing()
            util_1.util.createRange(2, 22, 2, 22));
            (0, chai_config_spec_1.expect)(codeActions.map(x => x.title).sort()).to.eql([
                `import "pkg:/components/lib1.brs"`,
                `import "pkg:/components/lib2.brs"`
            ]);
        });
        it('does not suggest imports for brs files', () => {
            //import the file in two scopes
            program.setFile('components/comp1.xml', (0, testHelpers_spec_1.trim) `
                <?xml version="1.0" encoding="utf-8" ?>
                <component name="ChildScene">
                    <script uri="comp1.brs" />
                </component>
            `);
            //import the function here
            const file = program.setFile('components/comp1.brs', `
                sub init()
                    DoSomething()
                end sub
            `);
            //define the function here
            program.setFile('source/lib.brs', `
                sub DoSomething()
                end sub
            `);
            program.validate();
            //there should be no code actions since this is a brs file
            const codeActions = program.getCodeActions(file.srcPath, 
            // DoSometh|ing()
            util_1.util.createRange(2, 28, 2, 28));
            (0, chai_config_spec_1.expect)(codeActions).to.be.empty;
        });
        it('suggests class imports', () => {
            //import the file in two scopes
            program.setFile('components/comp1.xml', (0, testHelpers_spec_1.trim) `
                <?xml version="1.0" encoding="utf-8" ?>
                <component name="ChildScene">
                    <script uri="comp1.bs" />
                </component>
            `);
            const file = program.setFile('components/comp1.bs', `
                sub init()
                    dude = new Person()
                end sub
            `);
            program.setFile('source/Person.bs', `
                class Person
                end class
            `);
            program.validate();
            (0, chai_config_spec_1.expect)(program.getCodeActions(file.srcPath, 
            // new Per|son()
            util_1.util.createRange(2, 34, 2, 34)).map(x => x.title).sort()).to.eql([
                `import "pkg:/source/Person.bs"`
            ]);
        });
        it('suggests class imports', () => {
            //import the file in two scopes
            program.setFile('components/comp1.xml', (0, testHelpers_spec_1.trim) `
                <?xml version="1.0" encoding="utf-8" ?>
                <component name="ChildScene">
                    <script uri="comp1.bs" />
                </component>
            `);
            //import the function here
            const file = program.setFile('components/comp1.bs', `
                sub init()
                    kitty = new Animals.Cat()
                end sub
            `);
            program.setFile('source/Animals.bs', `
                namespace Animals
                    class Cat
                    end class
                end namespace
            `);
            program.validate();
            (0, chai_config_spec_1.expect)(program.getCodeActions(file.srcPath, 
            // new Anim|als.Cat()
            util_1.util.createRange(2, 36, 2, 36)).map(x => x.title).sort()).to.eql([
                `import "pkg:/source/Animals.bs"`
            ]);
        });
        it('suggests all files for a root namespace name', () => {
            program.setFile('source/first.bs', `
                namespace alpha
                    function firstAction()
                    end function
                end namespace
            `);
            program.setFile('source/second.bs', `
                namespace alpha.beta
                    function secondAction()
                    end function
                end namespace
            `);
            program.setFile('components/MainScene.xml', (0, testHelpers_spec_1.trim) `<component name="MainScene"></component>`);
            const file = program.setFile('components/MainScene.bs', `
                sub init()
                    print alpha.secondAction()
                end sub
            `);
            // print al|pha.secondAction()
            testGetCodeActions(file, util_1.util.createRange(2, 28, 2, 28), [
                `import "pkg:/source/first.bs"`,
                `import "pkg:/source/second.bs"`
            ]);
        });
        it('suggests files for second part of missing namespace', () => {
            program.setFile('source/first.bs', `
                namespace alpha
                    function firstAction()
                    end function
                end namespace
            `);
            program.setFile('source/second.bs', `
                namespace alpha.beta
                    function secondAction()
                    end function
                end namespace
            `);
            program.setFile('components/MainScene.xml', (0, testHelpers_spec_1.trim) `<component name="MainScene"></component>`);
            const file = program.setFile('components/MainScene.bs', `
                import "pkg:/source/first.bs"
                sub init()
                    print alpha.beta.secondAction()
                end sub
            `);
            // print alpha.be|ta.secondAction()
            testGetCodeActions(file, util_1.util.createRange(3, 34, 3, 34), [`import "pkg:/source/second.bs"`]);
        });
    });
    it('suggests imports at very start and very end of diagnostic', () => {
        program.setFile('source/first.bs', `
            namespace alpha
                function firstAction()
                end function
            end namespace
        `);
        program.setFile('components/MainScene.xml', (0, testHelpers_spec_1.trim) `<component name="MainScene"></component>`);
        const file = program.setFile('components/MainScene.bs', `
            sub init()
                print alpha.firstAction()
            end sub
        `);
        // print |alpha.firstAction()
        testGetCodeActions(file, util_1.util.createRange(2, 22, 2, 22), [`import "pkg:/source/first.bs"`]);
        // print alpha|.firstAction()
        testGetCodeActions(file, util_1.util.createRange(2, 27, 2, 27), [`import "pkg:/source/first.bs"`]);
    });
});
//# sourceMappingURL=CodeActionsProcessor.spec.js.map