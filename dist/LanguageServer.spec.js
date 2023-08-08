"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileProtocolPath = void 0;
const chai_config_spec_1 = require("./chai-config.spec");
const fsExtra = require("fs-extra");
const path = require("path");
const vscode_languageserver_1 = require("vscode-languageserver");
const deferred_1 = require("./deferred");
const LanguageServer_1 = require("./LanguageServer");
const sinon_1 = require("sinon");
const util_1 = require("./util");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const assert = require("assert");
const testHelpers_spec_1 = require("./testHelpers.spec");
const reflection_1 = require("./astUtils/reflection");
const visitors_1 = require("./astUtils/visitors");
const testHelpers_spec_2 = require("./testHelpers.spec");
const vscode_uri_1 = require("vscode-uri");
const BusyStatusTracker_1 = require("./BusyStatusTracker");
const sinon = (0, sinon_1.createSandbox)();
const workspacePath = testHelpers_spec_2.rootDir;
describe('LanguageServer', () => {
    let server;
    let program;
    let workspaceFolders = [];
    let vfs = {};
    let physicalFilePaths = [];
    let connection = {
        onInitialize: () => null,
        onInitialized: () => null,
        onDidChangeConfiguration: () => null,
        onDidChangeWatchedFiles: () => null,
        onCompletion: () => null,
        onCompletionResolve: () => null,
        onDocumentSymbol: () => null,
        onWorkspaceSymbol: () => null,
        onDefinition: () => null,
        onSignatureHelp: () => null,
        onReferences: () => null,
        onHover: () => null,
        listen: () => null,
        sendNotification: () => null,
        sendDiagnostics: () => null,
        onExecuteCommand: () => null,
        onCodeAction: () => null,
        onDidOpenTextDocument: () => null,
        onDidChangeTextDocument: () => null,
        onDidCloseTextDocument: () => null,
        onWillSaveTextDocument: () => null,
        onWillSaveTextDocumentWaitUntil: () => null,
        onDidSaveTextDocument: () => null,
        onRequest: () => null,
        workspace: {
            getWorkspaceFolders: () => {
                return workspaceFolders.map(x => ({
                    uri: getFileProtocolPath(x),
                    name: path.basename(x)
                }));
            },
            getConfiguration: () => {
                return {};
            }
        },
        tracer: {
            log: () => { }
        }
    };
    beforeEach(() => {
        sinon.restore();
        server = new LanguageServer_1.LanguageServer();
        server['busyStatusTracker'] = new BusyStatusTracker_1.BusyStatusTracker();
        workspaceFolders = [workspacePath];
        vfs = {};
        physicalFilePaths = [];
        //hijack the file resolver so we can inject in-memory files for our tests
        let originalResolver = server['documentFileResolver'];
        server['documentFileResolver'] = (srcPath) => {
            if (vfs[srcPath]) {
                return vfs[srcPath];
            }
            else {
                return originalResolver.call(server, srcPath);
            }
        };
        //mock the connection stuff
        server.createConnection = () => {
            return connection;
        };
        server['hasConfigurationCapability'] = true;
    });
    afterEach(async () => {
        fsExtra.emptyDirSync(testHelpers_spec_2.tempDir);
        try {
            await Promise.all(physicalFilePaths.map(srcPath => fsExtra.unlinkSync(srcPath)));
        }
        catch (e) {
        }
        server.dispose();
    });
    function addXmlFile(name, additionalXmlContents = '') {
        const filePath = `components/${name}.xml`;
        const contents = `<?xml version="1.0" encoding="utf-8"?>
        <component name="${name}" extends="Group">
            ${additionalXmlContents}
            <script type="text/brightscript" uri="${name}.brs" />
        </component>`;
        program.setFile(filePath, contents);
    }
    function addScriptFile(name, contents, extension = 'brs') {
        const filePath = (0, util_1.standardizePath) `components/${name}.${extension}`;
        const file = program.setFile(filePath, contents);
        if (file) {
            const document = vscode_languageserver_textdocument_1.TextDocument.create(util_1.util.pathToUri(file.srcPath), 'brightscript', 1, contents);
            server['documents']['_documents'][document.uri] = document;
            return document;
        }
    }
    function writeToFs(srcPath, contents) {
        physicalFilePaths.push(srcPath);
        fsExtra.ensureDirSync(path.dirname(srcPath));
        fsExtra.writeFileSync(srcPath, contents);
    }
    describe('createStandaloneFileProject', () => {
        it('never returns undefined', async () => {
            let filePath = `${testHelpers_spec_2.rootDir}/main.brs`;
            writeToFs(filePath, `sub main(): return: end sub`);
            let firstProject = await server['createStandaloneFileProject'](filePath);
            let secondProject = await server['createStandaloneFileProject'](filePath);
            (0, chai_config_spec_1.expect)(firstProject).to.equal(secondProject);
        });
        it('filters out certain diagnostics', async () => {
            let filePath = `${testHelpers_spec_2.rootDir}/main.brs`;
            writeToFs(filePath, `sub main(): return: end sub`);
            let firstProject = await server['createStandaloneFileProject'](filePath);
            (0, testHelpers_spec_1.expectZeroDiagnostics)(firstProject.builder.program);
        });
    });
    describe('sendDiagnostics', () => {
        it('waits for program to finish loading before sending diagnostics', async () => {
            server.onInitialize({
                capabilities: {
                    workspace: {
                        workspaceFolders: true
                    }
                }
            });
            (0, chai_config_spec_1.expect)(server['clientHasWorkspaceFolderCapability']).to.be.true;
            server.run();
            let deferred = new deferred_1.Deferred();
            let project = {
                builder: {
                    getDiagnostics: () => []
                },
                firstRunPromise: deferred.promise
            };
            //make a new not-completed project
            server.projects.push(project);
            //this call should wait for the builder to finish
            let p = server['sendDiagnostics']();
            await util_1.util.sleep(50);
            //simulate the program being created
            project.builder.program = {
                files: {}
            };
            deferred.resolve();
            await p;
            //test passed because no exceptions were thrown
        });
        it('dedupes diagnostics found at same location from multiple projects', async () => {
            var _a, _b;
            server.projects.push({
                firstRunPromise: Promise.resolve(),
                builder: {
                    getDiagnostics: () => {
                        return [{
                                file: {
                                    srcPath: (0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/main.brs`
                                },
                                code: 1000,
                                range: vscode_languageserver_1.Range.create(1, 2, 3, 4)
                            }];
                    }
                }
            }, {
                firstRunPromise: Promise.resolve(),
                builder: {
                    getDiagnostics: () => {
                        return [{
                                file: {
                                    srcPath: (0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/main.brs`
                                },
                                code: 1000,
                                range: vscode_languageserver_1.Range.create(1, 2, 3, 4)
                            }];
                    }
                }
            });
            server['connection'] = connection;
            let stub = sinon.stub(server['connection'], 'sendDiagnostics');
            await server['sendDiagnostics']();
            (0, chai_config_spec_1.expect)((_b = (_a = stub.getCall(0).args) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.diagnostics).to.be.lengthOf(1);
        });
        it('sends diagnostics that were triggered by the program instead of vscode', async () => {
            server['connection'] = server['createConnection']();
            await server['createProject'](workspacePath);
            let stub;
            const promise = new Promise((resolve) => {
                stub = sinon.stub(connection, 'sendDiagnostics').callsFake(resolve);
            });
            const { program } = server.projects[0].builder;
            program.setFile('source/lib.bs', `
                sub lib()
                    functionDoesNotExist()
                end sub
            `);
            program.validate();
            await promise;
            (0, chai_config_spec_1.expect)(stub.called).to.be.true;
        });
    });
    describe('createProject', () => {
        it('prevents creating package on first run', async () => {
            server['connection'] = server['createConnection']();
            await server['createProject'](workspacePath);
            (0, chai_config_spec_1.expect)(server['projects'][0].builder.program.options.copyToStaging).to.be.false;
        });
    });
    describe('onDidChangeWatchedFiles', () => {
        let mainPath = (0, util_1.standardizePath) `${workspacePath}/source/main.brs`;
        it('picks up new files', async () => {
            server.run();
            server.onInitialize({
                capabilities: {}
            });
            writeToFs(mainPath, `sub main(): return: end sub`);
            await server['onInitialized']();
            (0, chai_config_spec_1.expect)(server.projects[0].builder.program.hasFile(mainPath)).to.be.true;
            //move a file into the directory...the program should detect it
            let libPath = (0, util_1.standardizePath) `${workspacePath}/source/lib.brs`;
            writeToFs(libPath, 'sub lib(): return : end sub');
            server.projects[0].configFilePath = `${workspacePath}/bsconfig.json`;
            await server['onDidChangeWatchedFiles']({
                changes: [{
                        uri: getFileProtocolPath(libPath),
                        type: 1 //created
                    },
                    {
                        uri: getFileProtocolPath((0, util_1.standardizePath) `${workspacePath}/source`),
                        type: 2 //changed
                    }
                    // ,{
                    //     uri: 'file:///c%3A/projects/PlumMediaCenter/Roku/appconfig.brs',
                    //     type: 3 //deleted
                    // }
                ]
            });
            (0, chai_config_spec_1.expect)(server.projects[0].builder.program.hasFile(libPath)).to.be.true;
        });
    });
    describe('handleFileChanges', () => {
        it('only adds files that match the files array', async () => {
            var _a;
            let setFileStub = sinon.stub().returns(Promise.resolve());
            const project = {
                builder: {
                    options: {
                        files: [
                            'source/**/*'
                        ]
                    },
                    getFileContents: sinon.stub().callsFake(() => Promise.resolve('')),
                    rootDir: testHelpers_spec_2.rootDir,
                    program: {
                        setFile: setFileStub
                    }
                }
            };
            let mainPath = (0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/main.brs`;
            // setVfsFile(mainPath, 'sub main()\nend sub');
            await server.handleFileChanges(project, [{
                    type: vscode_languageserver_1.FileChangeType.Created,
                    srcPath: mainPath
                }]);
            (0, chai_config_spec_1.expect)((_a = setFileStub.getCalls()[0]) === null || _a === void 0 ? void 0 : _a.args[0]).to.eql({
                src: mainPath,
                dest: (0, util_1.standardizePath) `source/main.brs`
            });
            let libPath = (0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/components/lib.brs`;
            (0, chai_config_spec_1.expect)(setFileStub.callCount).to.equal(1);
            await server.handleFileChanges(project, [{
                    type: vscode_languageserver_1.FileChangeType.Created,
                    srcPath: libPath
                }]);
            //the function should have ignored the lib file, so no additional files were added
            (0, chai_config_spec_1.expect)(setFileStub.callCount).to.equal(1);
        });
    });
    describe('syncProjects', () => {
        it('loads workspace as project', async () => {
            server.run();
            (0, chai_config_spec_1.expect)(server.projects).to.be.lengthOf(0);
            fsExtra.ensureDirSync(workspacePath);
            await server['syncProjects']();
            //no child bsconfig.json files, use the workspacePath
            (0, chai_config_spec_1.expect)(server.projects.map(x => x.projectPath)).to.eql([
                workspacePath
            ]);
            fsExtra.outputJsonSync((0, util_1.standardizePath) `${workspacePath}/project1/bsconfig.json`, {});
            fsExtra.outputJsonSync((0, util_1.standardizePath) `${workspacePath}/project2/bsconfig.json`, {});
            await server['syncProjects']();
            //2 child bsconfig.json files. Use those folders as projects, and don't use workspacePath
            (0, chai_config_spec_1.expect)(server.projects.map(x => x.projectPath).sort()).to.eql([
                (0, util_1.standardizePath) `${workspacePath}/project1`,
                (0, util_1.standardizePath) `${workspacePath}/project2`
            ]);
            fsExtra.removeSync((0, util_1.standardizePath) `${workspacePath}/project2/bsconfig.json`);
            await server['syncProjects']();
            //1 child bsconfig.json file. Still don't use workspacePath
            (0, chai_config_spec_1.expect)(server.projects.map(x => x.projectPath)).to.eql([
                (0, util_1.standardizePath) `${workspacePath}/project1`
            ]);
            fsExtra.removeSync((0, util_1.standardizePath) `${workspacePath}/project1/bsconfig.json`);
            await server['syncProjects']();
            //back to no child bsconfig.json files. use workspacePath again
            (0, chai_config_spec_1.expect)(server.projects.map(x => x.projectPath)).to.eql([
                workspacePath
            ]);
        });
        it('ignores bsconfig.json files from vscode ignored paths', async () => {
            server.run();
            sinon.stub(server['connection'].workspace, 'getConfiguration').returns(Promise.resolve({
                exclude: {
                    '**/vendor': true
                }
            }));
            fsExtra.outputJsonSync((0, util_1.standardizePath) `${workspacePath}/vendor/someProject/bsconfig.json`, {});
            //it always ignores node_modules
            fsExtra.outputJsonSync((0, util_1.standardizePath) `${workspacePath}/node_modules/someProject/bsconfig.json`, {});
            await server['syncProjects']();
            //no child bsconfig.json files, use the workspacePath
            (0, chai_config_spec_1.expect)(server.projects.map(x => x.projectPath)).to.eql([
                workspacePath
            ]);
        });
        it('does not produce duplicate projects when subdir and parent dir are opened as workspace folders', async () => {
            fsExtra.outputJsonSync((0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/root/bsconfig.json`, {});
            fsExtra.outputJsonSync((0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/root/subdir/bsconfig.json`, {});
            workspaceFolders = [
                (0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/root`,
                (0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/root/subdir`
            ];
            server.run();
            await server['syncProjects']();
            (0, chai_config_spec_1.expect)(server.projects.map(x => x.projectPath).sort()).to.eql([
                (0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/root`,
                (0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/root/subdir`
            ]);
        });
        it('finds nested roku-like dirs', async () => {
            fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/project1/manifest`, '');
            fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/project1/source/main.brs`, '');
            fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/sub/dir/project2/manifest`, '');
            fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/sub/dir/project2/source/main.bs`, '');
            //does not match folder with manifest without a sibling ./source folder
            fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/project3/manifest`, '');
            workspaceFolders = [
                (0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/`
            ];
            server.run();
            await server['syncProjects']();
            (0, chai_config_spec_1.expect)(server.projects.map(x => x.projectPath).sort()).to.eql([
                (0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/project1`,
                (0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/sub/dir/project2`
            ]);
        });
    });
    describe('onDidChangeWatchedFiles', () => {
        it('converts folder paths into an array of file paths', async () => {
            server.run();
            fsExtra.outputJsonSync((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/bsconfig.json`, {});
            fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/main.brs`, '');
            fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/lib.brs`, '');
            await server['syncProjects']();
            const stub2 = sinon.stub(server.projects[0].builder.program, 'setFile');
            await server['onDidChangeWatchedFiles']({
                changes: [{
                        type: vscode_languageserver_1.FileChangeType.Created,
                        uri: getFileProtocolPath((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source`)
                    }]
            });
            (0, chai_config_spec_1.expect)(stub2.getCalls().map(x => x.args[0].src).sort()).to.eql([
                (0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/lib.brs`,
                (0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/main.brs`
            ]);
        });
        it('does not trigger revalidates when changes are in files which are not tracked', async () => {
            server.run();
            const externalDir = (0, util_1.standardizePath) `${testHelpers_spec_2.tempDir}/not_app_dir`;
            fsExtra.outputJsonSync((0, util_1.standardizePath) `${externalDir}/bsconfig.json`, {});
            fsExtra.outputFileSync((0, util_1.standardizePath) `${externalDir}/source/main.brs`, '');
            fsExtra.outputFileSync((0, util_1.standardizePath) `${externalDir}/source/lib.brs`, '');
            await server['syncProjects']();
            const stub2 = sinon.stub(server.projects[0].builder.program, 'setFile');
            await server['onDidChangeWatchedFiles']({
                changes: [{
                        type: vscode_languageserver_1.FileChangeType.Created,
                        uri: getFileProtocolPath(externalDir)
                    }]
            });
            (0, chai_config_spec_1.expect)(stub2.getCalls()).to.be.empty;
        });
    });
    describe('onSignatureHelp', () => {
        let callDocument;
        const functionFileBaseName = 'buildAwesome';
        const funcDefinitionLine = 'function buildAwesome(confirm = true as Boolean)';
        beforeEach(async () => {
            server['connection'] = server['createConnection']();
            await server['createProject'](workspacePath);
            program = server.projects[0].builder.program;
            const name = `CallComponent`;
            callDocument = addScriptFile(name, `
                sub init()
                    shouldBuildAwesome = true
                    if shouldBuildAwesome then
                        buildAwesome()
                    else
                        m.buildAwesome()
                    end if
                end sub
            `);
            addXmlFile(name, `<script type="text/brightscript" uri="${functionFileBaseName}.bs" />`);
        });
        it('should return the expected signature info when documentation is included', async () => {
            const funcDescriptionComment = '@description Builds awesome for you';
            const funcReturnComment = '@return {Integer} The key to everything';
            addScriptFile(functionFileBaseName, `
                ' /**
                ' * ${funcDescriptionComment}
                ' * ${funcReturnComment}
                ' */
                ${funcDefinitionLine}
                    return 42
                end function
            `, 'bs');
            const result = await server['onSignatureHelp']({
                textDocument: {
                    uri: callDocument.uri
                },
                position: util_1.util.createPosition(4, 37)
            });
            (0, chai_config_spec_1.expect)(result.signatures).to.not.be.empty;
            const signature = result.signatures[0];
            (0, chai_config_spec_1.expect)(signature.label).to.equal(funcDefinitionLine);
            (0, chai_config_spec_1.expect)(signature.documentation).to.include(funcDescriptionComment);
            (0, chai_config_spec_1.expect)(signature.documentation).to.include(funcReturnComment);
        });
        it('should work if used on a property value', async () => {
            addScriptFile(functionFileBaseName, `
                ${funcDefinitionLine}
                    return 42
                end function
            `, 'bs');
            const result = await server['onSignatureHelp']({
                textDocument: {
                    uri: callDocument.uri
                },
                position: util_1.util.createPosition(6, 39)
            });
            (0, chai_config_spec_1.expect)(result.signatures).to.not.be.empty;
            const signature = result.signatures[0];
            (0, chai_config_spec_1.expect)(signature.label).to.equal(funcDefinitionLine);
        });
        it('should give the correct signature for a class method', async () => {
            const classMethodDefinitionLine = 'function buildAwesome(classVersion = true as Boolean)';
            addScriptFile(functionFileBaseName, `
                class ${functionFileBaseName}
                    ${classMethodDefinitionLine}
                        return 42
                    end function
                end class
            `, 'bs');
            const result = await server['onSignatureHelp']({
                textDocument: {
                    uri: callDocument.uri
                },
                position: util_1.util.createPosition(6, 39)
            });
            (0, chai_config_spec_1.expect)(result.signatures).to.not.be.empty;
            const signature = result.signatures[0];
            (0, chai_config_spec_1.expect)(signature.label).to.equal(classMethodDefinitionLine);
        });
    });
    describe('onReferences', () => {
        let functionDocument;
        let referenceFileUris = [];
        beforeEach(async () => {
            server['connection'] = server['createConnection']();
            await server['createProject'](workspacePath);
            program = server.projects[0].builder.program;
            const functionFileBaseName = 'buildAwesome';
            functionDocument = addScriptFile(functionFileBaseName, `
                function buildAwesome()
                    return 42
                end function
            `);
            for (let i = 0; i < 5; i++) {
                let name = `CallComponent${i}`;
                const document = addScriptFile(name, `
                    sub init()
                        shouldBuildAwesome = true
                        if shouldBuildAwesome then
                            buildAwesome()
                        end if
                    end sub
                `);
                addXmlFile(name, `<script type="text/brightscript" uri="${functionFileBaseName}.brs" />`);
                referenceFileUris.push(document.uri);
            }
        });
        it('should return the expected results if we entered on an identifier token', async () => {
            const references = await server['onReferences']({
                textDocument: {
                    uri: functionDocument.uri
                },
                position: util_1.util.createPosition(1, 32)
            });
            (0, chai_config_spec_1.expect)(references.length).to.equal(referenceFileUris.length);
            for (const reference of references) {
                (0, chai_config_spec_1.expect)(referenceFileUris).to.contain(reference.uri);
            }
        });
        it('should return an empty response if we entered on a token that should not return any results', async () => {
            let references = await server['onReferences']({
                textDocument: {
                    uri: functionDocument.uri
                },
                position: util_1.util.createPosition(1, 20) // function token
            });
            (0, chai_config_spec_1.expect)(references).to.be.empty;
            references = await server['onReferences']({
                textDocument: {
                    uri: functionDocument.uri
                },
                position: util_1.util['createPosition'](1, 20) // return token
            });
            (0, chai_config_spec_1.expect)(references).to.be.empty;
        });
    });
    describe('onDefinition', () => {
        let functionDocument;
        let referenceDocument;
        beforeEach(async () => {
            server['connection'] = server['createConnection']();
            await server['createProject'](workspacePath);
            program = server.projects[0].builder.program;
            const functionFileBaseName = 'buildAwesome';
            functionDocument = addScriptFile(functionFileBaseName, `
                function pi()
                    return 3.141592653589793
                end function

                function buildAwesome()
                    return 42
                end function
            `);
            const name = `CallComponent`;
            referenceDocument = addScriptFile(name, `
                sub init()
                    shouldBuildAwesome = true
                    if shouldBuildAwesome then
                        buildAwesome()
                    else
                        m.top.observeFieldScope("loadFinished", "buildAwesome")
                    end if
                end sub
            `);
            addXmlFile(name, `<script type="text/brightscript" uri="${functionFileBaseName}.brs" />`);
        });
        it('should return the expected location if we entered on an identifier token', async () => {
            const locations = await server['onDefinition']({
                textDocument: {
                    uri: referenceDocument.uri
                },
                position: util_1.util.createPosition(4, 33)
            });
            (0, chai_config_spec_1.expect)(locations.length).to.equal(1);
            const location = locations[0];
            (0, chai_config_spec_1.expect)(location.uri).to.equal(functionDocument.uri);
            (0, chai_config_spec_1.expect)(location.range.start.line).to.equal(5);
            (0, chai_config_spec_1.expect)(location.range.start.character).to.equal(16);
        });
        it('should return the expected location if we entered on a StringLiteral token', async () => {
            const locations = await server['onDefinition']({
                textDocument: {
                    uri: referenceDocument.uri
                },
                position: util_1.util.createPosition(6, 77)
            });
            (0, chai_config_spec_1.expect)(locations.length).to.equal(1);
            const location = locations[0];
            (0, chai_config_spec_1.expect)(location.uri).to.equal(functionDocument.uri);
            (0, chai_config_spec_1.expect)(location.range.start.line).to.equal(5);
            (0, chai_config_spec_1.expect)(location.range.start.character).to.equal(16);
        });
        it('should return nothing if neither StringLiteral or identifier token entry point', async () => {
            const locations = await server['onDefinition']({
                textDocument: {
                    uri: referenceDocument.uri
                },
                position: util_1.util.createPosition(1, 18)
            });
            (0, chai_config_spec_1.expect)(locations).to.be.empty;
        });
        it('should work on local variables as well', async () => {
            const locations = await server['onDefinition']({
                textDocument: {
                    uri: referenceDocument.uri
                },
                position: util_1.util.createPosition(3, 36)
            });
            (0, chai_config_spec_1.expect)(locations.length).to.equal(1);
            const location = locations[0];
            (0, chai_config_spec_1.expect)(location.uri).to.equal(referenceDocument.uri);
            (0, chai_config_spec_1.expect)(location.range.start.line).to.equal(2);
            (0, chai_config_spec_1.expect)(location.range.start.character).to.equal(20);
            (0, chai_config_spec_1.expect)(location.range.end.line).to.equal(2);
            (0, chai_config_spec_1.expect)(location.range.end.character).to.equal(38);
        });
        it('should work for bs class functions as well', async () => {
            const functionFileBaseName = 'Build';
            functionDocument = addScriptFile(functionFileBaseName, `
                class ${functionFileBaseName}
                    function awesome()
                        return 42
                    end function
                end class
            `, 'bs');
            const name = `CallComponent`;
            referenceDocument = addScriptFile(name, `
                sub init()
                    build = new Build()
                    build.awesome()
                end sub
            `);
            addXmlFile(name, `<script type="text/brightscript" uri="${functionFileBaseName}.bs" />`);
            const locations = await server['onDefinition']({
                textDocument: {
                    uri: referenceDocument.uri
                },
                position: util_1.util.createPosition(3, 30)
            });
            (0, chai_config_spec_1.expect)(locations.length).to.equal(1);
            const location = locations[0];
            (0, chai_config_spec_1.expect)(location.uri).to.equal(functionDocument.uri);
            (0, chai_config_spec_1.expect)(location.range.start.line).to.equal(2);
            (0, chai_config_spec_1.expect)(location.range.start.character).to.equal(20);
            (0, chai_config_spec_1.expect)(location.range.end.line).to.equal(4);
            (0, chai_config_spec_1.expect)(location.range.end.character).to.equal(32);
        });
    });
    describe('onDocumentSymbol', () => {
        beforeEach(async () => {
            server['connection'] = server['createConnection']();
            await server['createProject'](workspacePath);
            program = server.projects[0].builder.program;
        });
        it('should return the expected symbols even if pulled from cache', async () => {
            const document = addScriptFile('buildAwesome', `
                function pi()
                    return 3.141592653589793
                end function

                function buildAwesome()
                    return 42
                end function
            `);
            // We run the check twice as the first time is with it not cached and second time is with it cached
            for (let i = 0; i < 2; i++) {
                const symbols = await server.onDocumentSymbol({
                    textDocument: document
                });
                (0, chai_config_spec_1.expect)(symbols.length).to.equal(2);
                (0, chai_config_spec_1.expect)(symbols[0].name).to.equal('pi');
                (0, chai_config_spec_1.expect)(symbols[1].name).to.equal('buildAwesome');
            }
        });
        it('should work for brightscript classes as well', async () => {
            const document = addScriptFile('MyFirstClass', `
                class MyFirstClass
                    function pi()
                        return 3.141592653589793
                    end function

                    function buildAwesome()
                        return 42
                    end function
                end class
            `, 'bs');
            // We run the check twice as the first time is with it not cached and second time is with it cached
            for (let i = 0; i < 2; i++) {
                const symbols = await server['onDocumentSymbol']({
                    textDocument: document
                });
                (0, chai_config_spec_1.expect)(symbols.length).to.equal(1);
                const classSymbol = symbols[0];
                (0, chai_config_spec_1.expect)(classSymbol.name).to.equal('MyFirstClass');
                const classChildrenSymbols = classSymbol.children;
                (0, chai_config_spec_1.expect)(classChildrenSymbols.length).to.equal(2);
                (0, chai_config_spec_1.expect)(classChildrenSymbols[0].name).to.equal('pi');
                (0, chai_config_spec_1.expect)(classChildrenSymbols[1].name).to.equal('buildAwesome');
            }
        });
        it('should work for brightscript namespaces as well', async () => {
            const document = addScriptFile('MyFirstNamespace', `
                namespace MyFirstNamespace
                    function pi()
                        return 3.141592653589793
                    end function

                    function buildAwesome()
                        return 42
                    end function
                end namespace
            `, 'bs');
            program.validate();
            // We run the check twice as the first time is with it not cached and second time is with it cached
            for (let i = 0; i < 2; i++) {
                const symbols = await server['onDocumentSymbol']({
                    textDocument: document
                });
                (0, chai_config_spec_1.expect)(symbols.length).to.equal(1);
                const namespaceSymbol = symbols[0];
                (0, chai_config_spec_1.expect)(namespaceSymbol.name).to.equal('MyFirstNamespace');
                const classChildrenSymbols = namespaceSymbol.children;
                (0, chai_config_spec_1.expect)(classChildrenSymbols.length).to.equal(2);
                (0, chai_config_spec_1.expect)(classChildrenSymbols[0].name).to.equal('MyFirstNamespace.pi');
                (0, chai_config_spec_1.expect)(classChildrenSymbols[1].name).to.equal('MyFirstNamespace.buildAwesome');
            }
        });
    });
    describe('onWorkspaceSymbol', () => {
        beforeEach(async () => {
            server['connection'] = server['createConnection']();
            await server['createProject'](workspacePath);
            program = server.projects[0].builder.program;
        });
        it('should return the expected symbols even if pulled from cache', async () => {
            const className = 'MyFirstClass';
            const namespaceName = 'MyFirstNamespace';
            addScriptFile('buildAwesome', `
                function pi()
                    return 3.141592653589793
                end function

                function buildAwesome()
                    return 42
                end function
            `);
            addScriptFile(className, `
                class ${className}
                    function ${className}pi()
                        return 3.141592653589793
                    end function

                    function ${className}buildAwesome()
                        return 42
                    end function
                end class
            `, 'bs');
            addScriptFile(namespaceName, `
                namespace ${namespaceName}
                    function pi()
                        return 3.141592653589793
                    end function

                    function buildAwesome()
                        return 42
                    end function
                end namespace
            `, 'bs');
            // We run the check twice as the first time is with it not cached and second time is with it cached
            for (let i = 0; i < 2; i++) {
                const symbols = await server['onWorkspaceSymbol']({});
                (0, chai_config_spec_1.expect)(symbols.length).to.equal(8);
                for (const symbol of symbols) {
                    switch (symbol.name) {
                        case 'pi':
                            break;
                        case 'buildAwesome':
                            break;
                        case `${className}`:
                            break;
                        case `${className}pi`:
                            (0, chai_config_spec_1.expect)(symbol.containerName).to.equal(className);
                            break;
                        case `${className}buildAwesome`:
                            (0, chai_config_spec_1.expect)(symbol.containerName).to.equal(className);
                            break;
                        case `${namespaceName}`:
                            break;
                        case `${namespaceName}.pi`:
                            (0, chai_config_spec_1.expect)(symbol.containerName).to.equal(namespaceName);
                            break;
                        case `${namespaceName}.buildAwesome`:
                            (0, chai_config_spec_1.expect)(symbol.containerName).to.equal(namespaceName);
                            break;
                        default:
                            assert.fail(`'${symbol.name}' was not expected in list of symbols`);
                    }
                }
            }
        });
        it('should work for nested class as well', async () => {
            const nestedNamespace = 'containerNamespace';
            const nestedClassName = 'nestedClass';
            addScriptFile('nested', `
                namespace ${nestedNamespace}
                    class ${nestedClassName}
                        function pi()
                            return 3.141592653589793
                        end function

                        function buildAwesome()
                            return 42
                        end function
                    end class
                end namespace
            `, 'bs');
            program.validate();
            // We run the check twice as the first time is with it not cached and second time is with it cached
            for (let i = 0; i < 2; i++) {
                const symbols = await server['onWorkspaceSymbol']({});
                (0, chai_config_spec_1.expect)(symbols.length).to.equal(4);
                (0, chai_config_spec_1.expect)(symbols[0].name).to.equal(`pi`);
                (0, chai_config_spec_1.expect)(symbols[0].containerName).to.equal(`${nestedNamespace}.${nestedClassName}`);
                (0, chai_config_spec_1.expect)(symbols[1].name).to.equal(`buildAwesome`);
                (0, chai_config_spec_1.expect)(symbols[1].containerName).to.equal(`${nestedNamespace}.${nestedClassName}`);
                (0, chai_config_spec_1.expect)(symbols[2].name).to.equal(`${nestedNamespace}.${nestedClassName}`);
                (0, chai_config_spec_1.expect)(symbols[2].containerName).to.equal(nestedNamespace);
                (0, chai_config_spec_1.expect)(symbols[3].name).to.equal(nestedNamespace);
            }
        });
    });
    describe('getConfigFilePath', () => {
        it('honors the hasConfigurationCapability setting', async () => {
            server.run();
            sinon.stub(server['connection'].workspace, 'getConfiguration').returns(Promise.reject(new Error('Client does not support "workspace/configuration"')));
            server['hasConfigurationCapability'] = false;
            fsExtra.outputFileSync(`${workspacePath}/bsconfig.json`, '{}');
            (0, chai_config_spec_1.expect)(await server['getConfigFilePath'](workspacePath)).to.eql((0, util_1.standardizePath) `${workspacePath}/bsconfig.json`);
        });
        it('executes the connection.workspace.getConfiguration call when enabled to do so', async () => {
            server.run();
            const bsconfigPath = `${testHelpers_spec_2.tempDir}/bsconfig.test.json`;
            //add a dummy bsconfig to reference for the test
            fsExtra.outputFileSync(bsconfigPath, ``);
            sinon.stub(server['connection'].workspace, 'getConfiguration').returns(Promise.resolve({ configFile: bsconfigPath }));
            server['hasConfigurationCapability'] = true;
            fsExtra.outputFileSync(`${workspacePath}/bsconfig.json`, '{}');
            (0, chai_config_spec_1.expect)((0, util_1.standardizePath) `${await server['getConfigFilePath'](workspacePath)}`).to.eql((0, util_1.standardizePath) `${bsconfigPath}`);
        });
    });
    describe('getWorkspaceExcludeGlobs', () => {
        it('honors the hasConfigurationCapability setting', async () => {
            server.run();
            sinon.stub(server['connection'].workspace, 'getConfiguration').returns(Promise.reject(new Error('Client does not support "workspace/configuration"')));
            server['hasConfigurationCapability'] = false;
            (0, chai_config_spec_1.expect)(await server['getWorkspaceExcludeGlobs'](workspaceFolders[0])).to.eql([
                '**/node_modules/**/*'
            ]);
        });
    });
    describe('CustomCommands', () => {
        describe('TranspileFile', () => {
            it('returns pathAbsolute to support backwards compatibility', async () => {
                fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/main.bs`, `
                    sub main()
                        print \`hello world\`
                    end sub
                `);
                fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/bsconfig.json`, '');
                server.run();
                await server['syncProjects']();
                const result = await server.onExecuteCommand({
                    command: LanguageServer_1.CustomCommands.TranspileFile,
                    arguments: [(0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/main.bs`]
                });
                (0, chai_config_spec_1.expect)((0, testHelpers_spec_1.trim)(result === null || result === void 0 ? void 0 : result.code)).to.eql((0, testHelpers_spec_1.trim) `
                    sub main()
                        print "hello world"
                    end sub
                `);
                (0, chai_config_spec_1.expect)(result['pathAbsolute']).to.eql(result.srcPath);
            });
            it('calls beforeProgramTranspile and afterProgramTranspile plugin events', async () => {
                fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/main.bs`, `
                    sub main()
                        print \`hello world\`
                    end sub
                `);
                fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/bsconfig.json`, '');
                server.run();
                await server['syncProjects']();
                const afterSpy = sinon.spy();
                //make a plugin that changes string text
                server.projects[0].builder.program.plugins.add({
                    name: 'test-plugin',
                    beforeProgramTranspile: (program, entries, editor) => {
                        const file = program.getFile('source/main.bs');
                        if ((0, reflection_1.isBrsFile)(file)) {
                            file.ast.walk((0, visitors_1.createVisitor)({
                                LiteralExpression: (expression) => {
                                    if ((0, reflection_1.isLiteralString)(expression)) {
                                        editor.setProperty(expression.token, 'text', 'hello moon');
                                    }
                                }
                            }), {
                                walkMode: visitors_1.WalkMode.visitAllRecursive
                            });
                        }
                    },
                    afterProgramTranspile: afterSpy
                });
                const result = await server.onExecuteCommand({
                    command: LanguageServer_1.CustomCommands.TranspileFile,
                    arguments: [(0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/main.bs`]
                });
                (0, chai_config_spec_1.expect)((0, testHelpers_spec_1.trim)(result === null || result === void 0 ? void 0 : result.code)).to.eql((0, testHelpers_spec_1.trim) `
                    sub main()
                        print "hello moon"
                    end sub
                `);
                (0, chai_config_spec_1.expect)(afterSpy.called).to.be.true;
            });
        });
    });
    it('semantic tokens request waits until after validation has finished', async () => {
        fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/main.bs`, `
            sub main()
                print \`hello world\`
            end sub
        `);
        let spaceCount = 0;
        const getContents = () => {
            return `
                namespace sgnode
                    sub speak(message)
                        print message
                    end sub

                    sub sayHello()
                        sgnode.speak("Hello")${' '.repeat(spaceCount++)}
                    end sub
                end namespace
            `;
        };
        const uri = vscode_uri_1.URI.file((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/sgnode.bs`).toString();
        fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/sgnode.bs`, getContents());
        server.run();
        await server['syncProjects']();
        (0, testHelpers_spec_1.expectZeroDiagnostics)(server.projects[0].builder.program);
        fsExtra.outputFileSync((0, util_1.standardizePath) `${testHelpers_spec_2.rootDir}/source/sgnode.bs`, getContents());
        const changeWatchedFilesPromise = server['onDidChangeWatchedFiles']({
            changes: [{
                    type: vscode_languageserver_1.FileChangeType.Changed,
                    uri: uri
                }]
        });
        const document = {
            getText: () => getContents(),
            uri: uri
        };
        const semanticTokensPromise = server['onFullSemanticTokens']({
            textDocument: document
        });
        await Promise.all([
            changeWatchedFilesPromise,
            semanticTokensPromise
        ]);
        (0, testHelpers_spec_1.expectZeroDiagnostics)(server.projects[0].builder.program);
    });
});
function getFileProtocolPath(fullPath) {
    let result;
    if (fullPath.startsWith('/') || fullPath.startsWith('\\')) {
        result = `file://${fullPath}`;
    }
    else {
        result = `file:///${fullPath}`;
    }
    return result;
}
exports.getFileProtocolPath = getFileProtocolPath;
//# sourceMappingURL=LanguageServer.spec.js.map