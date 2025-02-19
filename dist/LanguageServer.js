"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationName = exports.CustomCommands = exports.LanguageServer = void 0;
require("array-flat-polyfill");
const fastGlob = require("fast-glob");
const path = require("path");
const roku_deploy_1 = require("roku-deploy");
const node_1 = require("vscode-languageserver/node");
const vscode_uri_1 = require("vscode-uri");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const deferred_1 = require("./deferred");
const DiagnosticMessages_1 = require("./DiagnosticMessages");
const ProgramBuilder_1 = require("./ProgramBuilder");
const util_1 = require("./util");
const Logger_1 = require("./Logger");
const Throttler_1 = require("./Throttler");
const KeyedThrottler_1 = require("./KeyedThrottler");
const DiagnosticCollection_1 = require("./DiagnosticCollection");
const reflection_1 = require("./astUtils/reflection");
const SemanticTokenUtils_1 = require("./SemanticTokenUtils");
const BusyStatusTracker_1 = require("./BusyStatusTracker");
class LanguageServer {
    constructor() {
        this.connection = undefined;
        this.projects = [];
        /**
         * The number of milliseconds that should be used for language server typing debouncing
         */
        this.debounceTimeout = 150;
        /**
         * These projects are created on the fly whenever a file is opened that is not included
         * in any of the workspace-based projects.
         * Basically these are single-file projects to at least get parsing for standalone files.
         * Also, they should only be created when the file is opened, and destroyed when the file is closed.
         */
        this.standaloneFileProjects = {};
        this.hasConfigurationCapability = false;
        /**
         * Indicates whether the client supports workspace folders
         */
        this.clientHasWorkspaceFolderCapability = false;
        /**
         * Create a simple text document manager.
         * The text document manager supports full document sync only
         */
        this.documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
        this.keyedThrottler = new KeyedThrottler_1.KeyedThrottler(this.debounceTimeout);
        this.validateThrottler = new Throttler_1.Throttler(0);
        this.sendDiagnosticsThrottler = new Throttler_1.Throttler(0);
        this.boundValidateAll = this.validateAll.bind(this);
        this.busyStatusTracker = new BusyStatusTracker_1.BusyStatusTracker();
        this.busyStatusIndex = -1;
        /**
         * A unique project counter to help distinguish log entries in lsp mode
         */
        this.projectCounter = 0;
        this.diagnosticCollection = new DiagnosticCollection_1.DiagnosticCollection();
    }
    createConnection() {
        return (0, node_1.createConnection)(node_1.ProposedFeatures.all);
    }
    validateAllThrottled() {
        return this.validateThrottler.run(this.boundValidateAll);
    }
    //run the server
    run() {
        // Create a connection for the server. The connection uses Node's IPC as a transport.
        // Also include all preview / proposed LSP features.
        this.connection = this.createConnection();
        // Send the current status of the busyStatusTracker anytime it changes
        this.busyStatusTracker.on('change', (status) => {
            this.sendBusyStatus(status);
        });
        //listen to all of the output log events and pipe them into the debug channel in the extension
        this.loggerSubscription = Logger_1.Logger.subscribe((text) => {
            this.connection.tracer.log(text);
        });
        this.connection.onInitialize(this.onInitialize.bind(this));
        this.connection.onInitialized(this.onInitialized.bind(this)); //eslint-disable-line
        this.connection.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this)); //eslint-disable-line
        this.connection.onDidChangeWatchedFiles(this.onDidChangeWatchedFiles.bind(this)); //eslint-disable-line
        // The content of a text document has changed. This event is emitted
        // when the text document is first opened, when its content has changed,
        // or when document is closed without saving (original contents are sent as a change)
        //
        this.documents.onDidChangeContent(this.validateTextDocument.bind(this));
        //whenever a document gets closed
        this.documents.onDidClose(this.onDocumentClose.bind(this));
        // This handler provides the initial list of the completion items.
        this.connection.onCompletion(this.onCompletion.bind(this));
        // This handler resolves additional information for the item selected in
        // the completion list.
        this.connection.onCompletionResolve(this.onCompletionResolve.bind(this));
        this.connection.onHover(this.onHover.bind(this));
        this.connection.onExecuteCommand(this.onExecuteCommand.bind(this));
        this.connection.onDefinition(this.onDefinition.bind(this));
        this.connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));
        this.connection.onWorkspaceSymbol(this.onWorkspaceSymbol.bind(this));
        this.connection.onSignatureHelp(this.onSignatureHelp.bind(this));
        this.connection.onReferences(this.onReferences.bind(this));
        this.connection.onCodeAction(this.onCodeAction.bind(this));
        //TODO switch to a more specific connection function call once they actually add it
        this.connection.onRequest(node_1.SemanticTokensRequest.method, this.onFullSemanticTokens.bind(this));
        /*
        this.connection.onDidOpenTextDocument((params) => {
             // A text document got opened in VSCode.
             // params.uri uniquely identifies the document. For documents stored on disk this is a file URI.
             // params.text the initial full content of the document.
            this.connection.console.log(`${params.textDocument.uri} opened.`);
        });
        this.connection.onDidChangeTextDocument((params) => {
             // The content of a text document did change in VSCode.
             // params.uri uniquely identifies the document.
             // params.contentChanges describe the content changes to the document.
            this.connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
        });
        this.connection.onDidCloseTextDocument((params) => {
             // A text document got closed in VSCode.
             // params.uri uniquely identifies the document.
            this.connection.console.log(`${params.textDocument.uri} closed.`);
        });
        */
        // listen for open, change and close text document events
        this.documents.listen(this.connection);
        // Listen on the connection
        this.connection.listen();
    }
    sendBusyStatus(status) {
        this.busyStatusIndex = ++this.busyStatusIndex <= 0 ? 0 : this.busyStatusIndex;
        this.connection.sendNotification(NotificationName.busyStatus, {
            status: status,
            timestamp: Date.now(),
            index: this.busyStatusIndex,
            activeRuns: [...this.busyStatusTracker.activeRuns]
        });
    }
    /**
     * Called when the client starts initialization
     */
    onInitialize(params) {
        let clientCapabilities = params.capabilities;
        // Does the client support the `workspace/configuration` request?
        // If not, we will fall back using global settings
        this.hasConfigurationCapability = !!(clientCapabilities.workspace && !!clientCapabilities.workspace.configuration);
        this.clientHasWorkspaceFolderCapability = !!(clientCapabilities.workspace && !!clientCapabilities.workspace.workspaceFolders);
        //return the capabilities of the server
        return {
            capabilities: {
                textDocumentSync: node_1.TextDocumentSyncKind.Full,
                // Tell the client that the server supports code completion
                completionProvider: {
                    resolveProvider: true,
                    //anytime the user types a period, auto-show the completion results
                    triggerCharacters: ['.'],
                    allCommitCharacters: ['.', '@']
                },
                documentSymbolProvider: true,
                workspaceSymbolProvider: true,
                semanticTokensProvider: {
                    legend: SemanticTokenUtils_1.semanticTokensLegend,
                    full: true
                },
                referencesProvider: true,
                codeActionProvider: {
                    codeActionKinds: [node_1.CodeActionKind.Refactor]
                },
                signatureHelpProvider: {
                    triggerCharacters: ['(', ',']
                },
                definitionProvider: true,
                hoverProvider: true,
                executeCommandProvider: {
                    commands: [
                        CustomCommands.TranspileFile
                    ]
                }
            }
        };
    }
    /**
     * Ask the client for the list of `files.exclude` patterns. Useful when determining if we should process a file
     */
    async getWorkspaceExcludeGlobs(workspaceFolder) {
        var _a;
        let config = {
            exclude: {}
        };
        //if supported, ask vscode for the `files.exclude` configuration
        if (this.hasConfigurationCapability) {
            //get any `files.exclude` globs to use to filter
            config = await this.connection.workspace.getConfiguration({
                scopeUri: workspaceFolder,
                section: 'files'
            });
        }
        return Object
            .keys((_a = config === null || config === void 0 ? void 0 : config.exclude) !== null && _a !== void 0 ? _a : {})
            .filter(x => { var _a; return (_a = config === null || config === void 0 ? void 0 : config.exclude) === null || _a === void 0 ? void 0 : _a[x]; })
            //vscode files.exclude patterns support ignoring folders without needing to add `**/*`. So for our purposes, we need to
            //append **/* to everything without a file extension or magic at the end
            .map(pattern => [
            //send the pattern as-is (this handles weird cases and exact file matches)
            pattern,
            //treat the pattern as a directory (no harm in doing this because if it's a file, the pattern will just never match anything)
            `${pattern}/**/*`
        ])
            .flat(1)
            .concat([
            //always ignore projects from node_modules
            '**/node_modules/**/*'
        ]);
    }
    /**
     * Scan the workspace for all `bsconfig.json` files. If at least one is found, then only folders who have bsconfig.json are returned.
     * If none are found, then the workspaceFolder itself is treated as a project
     */
    async getProjectPaths(workspaceFolder) {
        const excludes = (await this.getWorkspaceExcludeGlobs(workspaceFolder)).map(x => (0, util_1.standardizePath) `!${x}`);
        const files = await roku_deploy_1.rokuDeploy.getFilePaths([
            '**/bsconfig.json',
            //exclude all files found in `files.exclude`
            ...excludes
        ], workspaceFolder);
        //if we found at least one bsconfig.json, then ALL projects must have a bsconfig.json.
        if (files.length > 0) {
            return files.map(file => (0, util_1.standardizePath) `${path.dirname(file.src)}`);
        }
        //look for roku project folders
        const rokuLikeDirs = (await Promise.all(
        //find all folders containing a `manifest` file
        (await roku_deploy_1.rokuDeploy.getFilePaths([
            '**/manifest',
            ...excludes
            //is there at least one .bs|.brs file under the `/source` folder?
        ], workspaceFolder)).map(async (manifestEntry) => {
            const manifestDir = path.dirname(manifestEntry.src);
            const files = await roku_deploy_1.rokuDeploy.getFilePaths([
                'source/**/*.{brs,bs}',
                ...excludes
            ], manifestDir);
            if (files.length > 0) {
                return manifestDir;
            }
        })
        //throw out nulls
        )).filter(x => !!x);
        if (rokuLikeDirs.length > 0) {
            return rokuLikeDirs;
        }
        //treat the workspace folder as a brightscript project itself
        return [workspaceFolder];
    }
    /**
     * Find all folders with bsconfig.json files in them, and treat each as a project.
     * Treat workspaces that don't have a bsconfig.json as a project.
     * Handle situations where bsconfig.json files were added or removed (to elevate/lower workspaceFolder projects accordingly)
     * Leave existing projects alone if they are not affected by these changes
     */
    async syncProjects() {
        const workspacePaths = await this.getWorkspacePaths();
        let projectPaths = (await Promise.all(workspacePaths.map(async (workspacePath) => {
            const projectPaths = await this.getProjectPaths(workspacePath);
            return projectPaths.map(projectPath => ({
                projectPath: projectPath,
                workspacePath: workspacePath
            }));
        }))).flat(1);
        //delete projects not represented in the list
        for (const project of this.getProjects()) {
            if (!projectPaths.find(x => x.projectPath === project.projectPath)) {
                this.removeProject(project);
            }
        }
        //exclude paths to projects we already have
        projectPaths = projectPaths.filter(x => {
            //only keep this project path if there's not a project with that path
            return !this.projects.find(project => project.projectPath === x.projectPath);
        });
        //dedupe by project path
        projectPaths = [
            ...projectPaths.reduce((acc, x) => acc.set(x.projectPath, x), new Map()).values()
        ];
        //create missing projects
        await Promise.all(projectPaths.map(x => this.createProject(x.projectPath, x.workspacePath)));
        //flush diagnostics
        await this.sendDiagnostics();
    }
    /**
     * Get all workspace paths from the client
     */
    async getWorkspacePaths() {
        var _a;
        let workspaceFolders = (_a = await this.connection.workspace.getWorkspaceFolders()) !== null && _a !== void 0 ? _a : [];
        return workspaceFolders.map((x) => {
            return util_1.util.uriToPath(x.uri);
        });
    }
    /**
     * Called when the client has finished initializing
     */
    async onInitialized() {
        let projectCreatedDeferred = new deferred_1.Deferred();
        this.initialProjectsCreated = projectCreatedDeferred.promise;
        try {
            if (this.hasConfigurationCapability) {
                // Register for all configuration changes.
                await this.connection.client.register(node_1.DidChangeConfigurationNotification.type, undefined);
            }
            await this.syncProjects();
            if (this.clientHasWorkspaceFolderCapability) {
                this.connection.workspace.onDidChangeWorkspaceFolders(async (evt) => {
                    await this.syncProjects();
                });
            }
            await this.waitAllProjectFirstRuns(false);
            projectCreatedDeferred.resolve();
        }
        catch (e) {
            this.sendCriticalFailure(`Critical failure during BrighterScript language server startup.
                Please file a github issue and include the contents of the 'BrighterScript Language Server' output channel.

                Error message: ${e.message}`);
            throw e;
        }
    }
    /**
     * Send a critical failure notification to the client, which should show a notification of some kind
     */
    sendCriticalFailure(message) {
        this.connection.sendNotification('critical-failure', message);
    }
    /**
     * Wait for all programs' first run to complete
     */
    async waitAllProjectFirstRuns(waitForFirstProject = true) {
        if (waitForFirstProject) {
            await this.initialProjectsCreated;
        }
        for (let project of this.getProjects()) {
            try {
                await project.firstRunPromise;
            }
            catch (e) {
                status = 'critical-error';
                //the first run failed...that won't change unless we reload the workspace, so replace with resolved promise
                //so we don't show this error again
                project.firstRunPromise = Promise.resolve();
                this.sendCriticalFailure(`BrighterScript language server failed to start: \n${e.message}`);
            }
        }
    }
    /**
     * Event handler for when the program wants to load file contents.
     * anytime the program wants to load a file, check with our in-memory document cache first
     */
    documentFileResolver(srcPath) {
        let pathUri = vscode_uri_1.URI.file(srcPath).toString();
        let document = this.documents.get(pathUri);
        if (document) {
            return document.getText();
        }
    }
    async getConfigFilePath(workspacePath) {
        let scopeUri;
        if (workspacePath.startsWith('file:')) {
            scopeUri = vscode_uri_1.URI.parse(workspacePath).toString();
        }
        else {
            scopeUri = vscode_uri_1.URI.file(workspacePath).toString();
        }
        let config = {
            configFile: undefined
        };
        //if the client supports configuration, look for config group called "brightscript"
        if (this.hasConfigurationCapability) {
            config = await this.connection.workspace.getConfiguration({
                scopeUri: scopeUri,
                section: 'brightscript'
            });
        }
        let configFilePath;
        //if there's a setting, we need to find the file or show error if it can't be found
        if (config === null || config === void 0 ? void 0 : config.configFile) {
            configFilePath = path.resolve(workspacePath, config.configFile);
            if (await util_1.util.pathExists(configFilePath)) {
                return configFilePath;
            }
            else {
                this.sendCriticalFailure(`Cannot find config file specified in user / workspace settings at '${configFilePath}'`);
            }
        }
        //default to config file path found in the root of the workspace
        configFilePath = path.resolve(workspacePath, 'bsconfig.json');
        if (await util_1.util.pathExists(configFilePath)) {
            return configFilePath;
        }
        //look for the deprecated `brsconfig.json` file
        configFilePath = path.resolve(workspacePath, 'brsconfig.json');
        if (await util_1.util.pathExists(configFilePath)) {
            return configFilePath;
        }
        //no config file could be found
        return undefined;
    }
    /**
     * @param projectPath path to the project
     * @param workspacePath path to the workspace in which all project should reside or are referenced by
     * @param projectNumber an optional project number to assign to the project. Used when reloading projects that should keep the same number
     */
    async createProject(projectPath, workspacePath = projectPath, projectNumber) {
        workspacePath !== null && workspacePath !== void 0 ? workspacePath : (workspacePath = projectPath);
        let project = this.projects.find((x) => x.projectPath === projectPath);
        //skip this project if we already have it
        if (project) {
            return;
        }
        let builder = new ProgramBuilder_1.ProgramBuilder();
        projectNumber !== null && projectNumber !== void 0 ? projectNumber : (projectNumber = this.projectCounter++);
        builder.logger.prefix = `[prj${projectNumber}]`;
        builder.logger.log(`Created project #${projectNumber} for: "${projectPath}"`);
        //flush diagnostics every time the program finishes validating
        builder.plugins.add({
            name: 'bsc-language-server',
            afterProgramValidate: () => {
                void this.sendDiagnostics();
            }
        });
        //prevent clearing the console on run...this isn't the CLI so we want to keep a full log of everything
        builder.allowConsoleClearing = false;
        //look for files in our in-memory cache before going to the file system
        builder.addFileResolver(this.documentFileResolver.bind(this));
        let configFilePath = await this.getConfigFilePath(projectPath);
        let cwd = projectPath;
        //if the config file exists, use it and its folder as cwd
        if (configFilePath && await util_1.util.pathExists(configFilePath)) {
            cwd = path.dirname(configFilePath);
        }
        else {
            //config file doesn't exist...let `brighterscript` resolve the default way
            configFilePath = undefined;
        }
        const firstRunDeferred = new deferred_1.Deferred();
        let newProject = {
            projectNumber: projectNumber,
            builder: builder,
            firstRunPromise: firstRunDeferred.promise,
            projectPath: projectPath,
            workspacePath: workspacePath,
            isFirstRunComplete: false,
            isFirstRunSuccessful: false,
            configFilePath: configFilePath,
            isStandaloneFileProject: false
        };
        this.projects.push(newProject);
        try {
            await builder.run({
                cwd: cwd,
                project: configFilePath,
                watch: false,
                createPackage: false,
                deploy: false,
                copyToStaging: false,
                showDiagnosticsInConsole: false
            });
            newProject.isFirstRunComplete = true;
            newProject.isFirstRunSuccessful = true;
            firstRunDeferred.resolve();
        }
        catch (e) {
            builder.logger.error(e);
            firstRunDeferred.reject(e);
            newProject.isFirstRunComplete = true;
            newProject.isFirstRunSuccessful = false;
        }
        //if we found a deprecated brsconfig.json, add a diagnostic warning the user
        if (configFilePath && path.basename(configFilePath) === 'brsconfig.json') {
            builder.addDiagnostic(configFilePath, Object.assign(Object.assign({}, DiagnosticMessages_1.DiagnosticMessages.brsConfigJsonIsDeprecated()), { range: util_1.util.createRange(0, 0, 0, 0) }));
            return this.sendDiagnostics();
        }
    }
    async createStandaloneFileProject(srcPath) {
        //skip this workspace if we already have it
        if (this.standaloneFileProjects[srcPath]) {
            return this.standaloneFileProjects[srcPath];
        }
        let builder = new ProgramBuilder_1.ProgramBuilder();
        //prevent clearing the console on run...this isn't the CLI so we want to keep a full log of everything
        builder.allowConsoleClearing = false;
        //look for files in our in-memory cache before going to the file system
        builder.addFileResolver(this.documentFileResolver.bind(this));
        //get the path to the directory where this file resides
        let cwd = path.dirname(srcPath);
        //get the closest config file and use most of the settings from that
        let configFilePath = await util_1.util.findClosestConfigFile(srcPath);
        let project = {};
        if (configFilePath) {
            project = util_1.util.normalizeAndResolveConfig({ project: configFilePath });
        }
        //override the rootDir and files array
        project.rootDir = cwd;
        project.files = [{
                src: srcPath,
                dest: path.basename(srcPath)
            }];
        let firstRunPromise = builder.run(Object.assign(Object.assign({}, project), { cwd: cwd, project: configFilePath, watch: false, createPackage: false, deploy: false, copyToStaging: false, diagnosticFilters: [
                //hide the "file not referenced by any other file" error..that's expected in a standalone file.
                1013
            ] })).catch((err) => {
            console.error(err);
        });
        let newProject = {
            projectNumber: this.projectCounter++,
            builder: builder,
            firstRunPromise: firstRunPromise,
            projectPath: srcPath,
            workspacePath: srcPath,
            isFirstRunComplete: false,
            isFirstRunSuccessful: false,
            configFilePath: configFilePath,
            isStandaloneFileProject: true
        };
        this.standaloneFileProjects[srcPath] = newProject;
        await firstRunPromise.then(() => {
            newProject.isFirstRunComplete = true;
            newProject.isFirstRunSuccessful = true;
        }).catch(() => {
            newProject.isFirstRunComplete = true;
            newProject.isFirstRunSuccessful = false;
        });
        return newProject;
    }
    getProjects() {
        let projects = this.projects.slice();
        for (let key in this.standaloneFileProjects) {
            projects.push(this.standaloneFileProjects[key]);
        }
        return projects;
    }
    /**
     * Provide a list of completion items based on the current cursor position
     */
    async onCompletion(params) {
        //ensure programs are initialized
        await this.waitAllProjectFirstRuns();
        let filePath = util_1.util.uriToPath(params.textDocument.uri);
        //wait until the file has settled
        await this.keyedThrottler.onIdleOnce(filePath, true);
        let completions = this
            .getProjects()
            .flatMap(workspace => workspace.builder.program.getCompletions(filePath, params.position));
        for (let completion of completions) {
            completion.commitCharacters = ['.'];
        }
        return completions;
    }
    /**
     * Provide a full completion item from the selection
     */
    onCompletionResolve(item) {
        if (item.data === 1) {
            item.detail = 'TypeScript details';
            item.documentation = 'TypeScript documentation';
        }
        else if (item.data === 2) {
            item.detail = 'JavaScript details';
            item.documentation = 'JavaScript documentation';
        }
        return item;
    }
    async onCodeAction(params) {
        //ensure programs are initialized
        await this.waitAllProjectFirstRuns();
        let srcPath = util_1.util.uriToPath(params.textDocument.uri);
        //wait until the file has settled
        await this.keyedThrottler.onIdleOnce(srcPath, true);
        const codeActions = this
            .getProjects()
            //skip programs that don't have this file
            .filter(x => { var _a, _b; return (_b = (_a = x.builder) === null || _a === void 0 ? void 0 : _a.program) === null || _b === void 0 ? void 0 : _b.hasFile(srcPath); })
            .flatMap(workspace => workspace.builder.program.getCodeActions(srcPath, params.range));
        //clone the diagnostics for each code action, since certain diagnostics can have circular reference properties that kill the language server if serialized
        for (const codeAction of codeActions) {
            if (codeAction.diagnostics) {
                codeAction.diagnostics = codeAction.diagnostics.map(x => util_1.util.toDiagnostic(x, params.textDocument.uri));
            }
        }
        return codeActions;
    }
    /**
     * Remove a project from the language server
     */
    removeProject(project) {
        var _a;
        const idx = this.projects.indexOf(project);
        if (idx > -1) {
            this.projects.splice(idx, 1);
        }
        (_a = project === null || project === void 0 ? void 0 : project.builder) === null || _a === void 0 ? void 0 : _a.dispose();
    }
    /**
     * Reload each of the specified workspaces
     */
    async reloadProjects(projects) {
        await Promise.all(projects.map(async (project) => {
            //ensure the workspace has finished starting up
            try {
                await project.firstRunPromise;
            }
            catch (e) { }
            //handle standard workspace
            if (project.isStandaloneFileProject === false) {
                this.removeProject(project);
                //create a new workspace/brs program
                await this.createProject(project.projectPath, project.workspacePath, project.projectNumber);
                //handle temp workspace
            }
            else {
                project.builder.dispose();
                delete this.standaloneFileProjects[project.projectPath];
                await this.createStandaloneFileProject(project.projectPath);
            }
        }));
        if (projects.length > 0) {
            //wait for all of the programs to finish starting up
            await this.waitAllProjectFirstRuns();
            // valdiate all workspaces
            this.validateAllThrottled(); //eslint-disable-line
        }
    }
    getRootDir(workspace) {
        var _a, _b, _c;
        let options = (_b = (_a = workspace === null || workspace === void 0 ? void 0 : workspace.builder) === null || _a === void 0 ? void 0 : _a.program) === null || _b === void 0 ? void 0 : _b.options;
        return (_c = options === null || options === void 0 ? void 0 : options.rootDir) !== null && _c !== void 0 ? _c : options === null || options === void 0 ? void 0 : options.cwd;
    }
    /**
     * Sometimes users will alter their bsconfig files array, and will include standalone files.
     * If this is the case, those standalone workspaces should be removed because the file was
     * included in an actual program now.
     *
     * Sometimes files that used to be included are now excluded, so those open files need to be re-processed as standalone
     */
    async synchronizeStandaloneProjects() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        //remove standalone workspaces that are now included in projects
        for (let standaloneFilePath in this.standaloneFileProjects) {
            let standaloneProject = this.standaloneFileProjects[standaloneFilePath];
            for (let project of this.projects) {
                await standaloneProject.firstRunPromise;
                let dest = roku_deploy_1.rokuDeploy.getDestPath(standaloneFilePath, (_d = (_c = (_b = (_a = project === null || project === void 0 ? void 0 : project.builder) === null || _a === void 0 ? void 0 : _a.program) === null || _b === void 0 ? void 0 : _b.options) === null || _c === void 0 ? void 0 : _c.files) !== null && _d !== void 0 ? _d : [], this.getRootDir(project));
                //destroy this standalone workspace because the file has now been included in an actual workspace,
                //or if the workspace wants the file
                if (((_f = (_e = project === null || project === void 0 ? void 0 : project.builder) === null || _e === void 0 ? void 0 : _e.program) === null || _f === void 0 ? void 0 : _f.hasFile(standaloneFilePath)) || dest) {
                    standaloneProject.builder.dispose();
                    delete this.standaloneFileProjects[standaloneFilePath];
                }
            }
        }
        //create standalone projects for open files that no longer have a project
        let textDocuments = this.documents.all();
        outer: for (let textDocument of textDocuments) {
            let filePath = vscode_uri_1.URI.parse(textDocument.uri).fsPath;
            for (let project of this.getProjects()) {
                let dest = roku_deploy_1.rokuDeploy.getDestPath(filePath, (_k = (_j = (_h = (_g = project === null || project === void 0 ? void 0 : project.builder) === null || _g === void 0 ? void 0 : _g.program) === null || _h === void 0 ? void 0 : _h.options) === null || _j === void 0 ? void 0 : _j.files) !== null && _k !== void 0 ? _k : [], this.getRootDir(project));
                //if this project has the file, or it wants the file, do NOT make a standaloneProject for this file
                if (((_m = (_l = project === null || project === void 0 ? void 0 : project.builder) === null || _l === void 0 ? void 0 : _l.program) === null || _m === void 0 ? void 0 : _m.hasFile(filePath)) || dest) {
                    continue outer;
                }
            }
            //if we got here, no workspace has this file, so make a standalone file workspace
            let project = await this.createStandaloneFileProject(filePath);
            await project.firstRunPromise;
        }
    }
    async onDidChangeConfiguration() {
        if (this.hasConfigurationCapability) {
            //if the user changes any config value, just mass-reload all projects
            await this.reloadProjects(this.getProjects());
            // Reset all cached document settings
        }
        else {
            // this.globalSettings = <ExampleSettings>(
            //     (change.settings.languageServerExample || this.defaultSettings)
            // );
        }
    }
    /**
     * Called when watched files changed (add/change/delete).
     * The CLIENT is in charge of what files to watch, so all client
     * implementations should ensure that all valid project
     * file types are watched (.brs,.bs,.xml,manifest, and any json/text/image files)
     */
    async onDidChangeWatchedFiles(params) {
        //ensure programs are initialized
        await this.waitAllProjectFirstRuns();
        let projects = this.getProjects();
        //convert all file paths to absolute paths
        let changes = params.changes.map(x => {
            return {
                type: x.type,
                srcPath: (0, util_1.standardizePath) `${vscode_uri_1.URI.parse(x.uri).fsPath}`
            };
        });
        let keys = changes.map(x => x.srcPath);
        //filter the list of changes to only the ones that made it through the debounce unscathed
        changes = changes.filter(x => keys.includes(x.srcPath));
        //if we have changes to work with
        if (changes.length > 0) {
            //if any bsconfig files were added or deleted, re-sync all projects instead of the more specific approach below
            if (changes.find(x => (x.type === node_1.FileChangeType.Created || x.type === node_1.FileChangeType.Deleted) && path.basename(x.srcPath).toLowerCase() === 'bsconfig.json')) {
                return this.syncProjects();
            }
            //reload any workspace whose bsconfig.json file has changed
            {
                let projectsToReload = [];
                //get the file paths as a string array
                let filePaths = changes.map((x) => x.srcPath);
                for (let project of projects) {
                    if (project.configFilePath && filePaths.includes(project.configFilePath)) {
                        projectsToReload.push(project);
                    }
                }
                if (projectsToReload.length > 0) {
                    //vsc can generate a ton of these changes, for vsc system files, so we need to bail if there's no work to do on any of our actual project files
                    //reload any projects that need to be reloaded
                    await this.reloadProjects(projectsToReload);
                }
                //reassign `projects` to the non-reloaded projects
                projects = projects.filter(x => !projectsToReload.includes(x));
            }
            //convert created folders into a list of files of their contents
            const directoryChanges = changes
                //get only creation items
                .filter(change => change.type === node_1.FileChangeType.Created)
                //keep only the directories
                .filter(change => util_1.util.isDirectorySync(change.srcPath));
            //remove the created directories from the changes array (we will add back each of their files next)
            changes = changes.filter(x => !directoryChanges.includes(x));
            //look up every file in each of the newly added directories
            const newFileChanges = directoryChanges
                //take just the path
                .map(x => x.srcPath)
                //exclude the roku deploy staging folder
                .filter(dirPath => !dirPath.includes('.roku-deploy-staging'))
                //get the files for each folder recursively
                .flatMap(dirPath => {
                //look up all files
                let files = fastGlob.sync('**/*', {
                    absolute: true,
                    cwd: roku_deploy_1.util.toForwardSlashes(dirPath)
                });
                return files.map(x => {
                    return {
                        type: node_1.FileChangeType.Created,
                        srcPath: (0, util_1.standardizePath) `${x}`
                    };
                });
            });
            //add the new file changes to the changes array.
            changes.push(...newFileChanges);
            //give every workspace the chance to handle file changes
            await Promise.all(projects.map((project) => this.handleFileChanges(project, changes)));
        }
    }
    /**
     * This only operates on files that match the specified files globs, so it is safe to throw
     * any file changes you receive with no unexpected side-effects
     */
    async handleFileChanges(project, changes) {
        //this loop assumes paths are both file paths and folder paths, which eliminates the need to detect.
        //All functions below can handle being given a file path AND a folder path, and will only operate on the one they are looking for
        let consumeCount = 0;
        await Promise.all(changes.map(async (change) => {
            await this.keyedThrottler.run(change.srcPath, async () => {
                consumeCount += await this.handleFileChange(project, change) ? 1 : 0;
            });
        }));
        if (consumeCount > 0) {
            await this.validateAllThrottled();
        }
    }
    /**
     * This only operates on files that match the specified files globs, so it is safe to throw
     * any file changes you receive with no unexpected side-effects
     */
    async handleFileChange(project, change) {
        const { program, options, rootDir } = project.builder;
        //deleted
        if (change.type === node_1.FileChangeType.Deleted) {
            //try to act on this path as a directory
            project.builder.removeFilesInFolder(change.srcPath);
            //if this is a file loaded in the program, remove it
            if (program.hasFile(change.srcPath)) {
                program.removeFile(change.srcPath);
                return true;
            }
            else {
                return false;
            }
            //created
        }
        else if (change.type === node_1.FileChangeType.Created) {
            // thanks to `onDidChangeWatchedFiles`, we can safely assume that all "Created" changes are file paths, (not directories)
            //get the dest path for this file.
            let destPath = roku_deploy_1.rokuDeploy.getDestPath(change.srcPath, options.files, rootDir);
            //if we got a dest path, then the program wants this file
            if (destPath) {
                program.setFile({
                    src: change.srcPath,
                    dest: roku_deploy_1.rokuDeploy.getDestPath(change.srcPath, options.files, rootDir)
                }, await project.builder.getFileContents(change.srcPath));
                return true;
            }
            else {
                //no dest path means the program doesn't want this file
                return false;
            }
            //changed
        }
        else if (program.hasFile(change.srcPath)) {
            //sometimes "changed" events are emitted on files that were actually deleted,
            //so determine file existance and act accordingly
            if (await util_1.util.pathExists(change.srcPath)) {
                program.setFile({
                    src: change.srcPath,
                    dest: roku_deploy_1.rokuDeploy.getDestPath(change.srcPath, options.files, rootDir)
                }, await project.builder.getFileContents(change.srcPath));
            }
            else {
                program.removeFile(change.srcPath);
            }
            return true;
        }
    }
    async onHover(params) {
        var _a;
        //ensure programs are initialized
        await this.waitAllProjectFirstRuns();
        const srcPath = util_1.util.uriToPath(params.textDocument.uri);
        let projects = this.getProjects();
        let hovers = projects
            //get hovers from all projects
            .map((x) => x.builder.program.getHover(srcPath, params.position))
            //flatten to a single list
            .flat();
        const contents = [
            ...(hovers !== null && hovers !== void 0 ? hovers : [])
                //pull all hover contents out into a flag array of strings
                .map(x => {
                return Array.isArray(x === null || x === void 0 ? void 0 : x.contents) ? x === null || x === void 0 ? void 0 : x.contents : [x === null || x === void 0 ? void 0 : x.contents];
            }).flat()
                //remove nulls
                .filter(x => !!x)
                //dedupe hovers across all projects
                .reduce((set, content) => set.add(content), new Set()).values()
        ];
        if (contents.length > 0) {
            let hover = {
                //use the range from the first hover
                range: (_a = hovers[0]) === null || _a === void 0 ? void 0 : _a.range,
                //the contents of all hovers
                contents: contents
            };
            return hover;
        }
    }
    async onDocumentClose(event) {
        const { document } = event;
        let filePath = vscode_uri_1.URI.parse(document.uri).fsPath;
        let standaloneFileProject = this.standaloneFileProjects[filePath];
        //if this was a temp file, close it
        if (standaloneFileProject) {
            await standaloneFileProject.firstRunPromise;
            standaloneFileProject.builder.dispose();
            delete this.standaloneFileProjects[filePath];
            await this.sendDiagnostics();
        }
    }
    async validateTextDocument(event) {
        const { document } = event;
        //ensure programs are initialized
        await this.waitAllProjectFirstRuns();
        let filePath = vscode_uri_1.URI.parse(document.uri).fsPath;
        try {
            //throttle file processing. first call is run immediately, and then the last call is processed.
            await this.keyedThrottler.run(filePath, () => {
                var _a;
                let documentText = document.getText();
                for (const project of this.getProjects()) {
                    //only add or replace existing files. All of the files in the project should
                    //have already been loaded by other means
                    if (project.builder.program.hasFile(filePath)) {
                        let rootDir = (_a = project.builder.program.options.rootDir) !== null && _a !== void 0 ? _a : project.builder.program.options.cwd;
                        let dest = roku_deploy_1.rokuDeploy.getDestPath(filePath, project.builder.program.options.files, rootDir);
                        project.builder.program.setFile({
                            src: filePath,
                            dest: dest
                        }, documentText);
                    }
                }
            });
            // validate all projects
            await this.validateAllThrottled();
        }
        catch (e) {
            this.sendCriticalFailure(`Critical error parsing/validating ${filePath}: ${e.message}`);
        }
    }
    async validateAll() {
        var _a;
        try {
            //synchronize parsing for open files that were included/excluded from projects
            await this.synchronizeStandaloneProjects();
            let projects = this.getProjects();
            //validate all programs
            await Promise.all(projects.map((project) => {
                project.builder.program.validate();
                return project;
            }));
        }
        catch (e) {
            this.connection.console.error(e);
            this.sendCriticalFailure(`Critical error validating project: ${e.message}${(_a = e.stack) !== null && _a !== void 0 ? _a : ''}`);
        }
    }
    async onWorkspaceSymbol(params) {
        await this.waitAllProjectFirstRuns();
        const results = util_1.util.flatMap(await Promise.all(this.getProjects().map(project => {
            return project.builder.program.getWorkspaceSymbols();
        })), c => c);
        // Remove duplicates
        const allSymbols = Object.values(results.reduce((map, symbol) => {
            const key = symbol.location.uri + symbol.name;
            map[key] = symbol;
            return map;
        }, {}));
        return allSymbols;
    }
    async onDocumentSymbol(params) {
        await this.waitAllProjectFirstRuns();
        await this.keyedThrottler.onIdleOnce(util_1.util.uriToPath(params.textDocument.uri), true);
        const srcPath = util_1.util.uriToPath(params.textDocument.uri);
        for (const project of this.getProjects()) {
            const file = project.builder.program.getFile(srcPath);
            if ((0, reflection_1.isBrsFile)(file)) {
                return file.getDocumentSymbols();
            }
        }
    }
    async onDefinition(params) {
        await this.waitAllProjectFirstRuns();
        const srcPath = util_1.util.uriToPath(params.textDocument.uri);
        const results = util_1.util.flatMap(await Promise.all(this.getProjects().map(project => {
            return project.builder.program.getDefinition(srcPath, params.position);
        })), c => c);
        return results;
    }
    async onSignatureHelp(params) {
        var _a, _b, _c;
        await this.waitAllProjectFirstRuns();
        const filepath = util_1.util.uriToPath(params.textDocument.uri);
        await this.keyedThrottler.onIdleOnce(filepath, true);
        try {
            const signatures = util_1.util.flatMap(await Promise.all(this.getProjects().map(project => project.builder.program.getSignatureHelp(filepath, params.position))), c => c);
            const activeSignature = signatures.length > 0 ? 0 : null;
            const activeParameter = activeSignature >= 0 ? (_a = signatures[activeSignature]) === null || _a === void 0 ? void 0 : _a.index : null;
            let results = {
                signatures: signatures.map((s) => s.signature),
                activeSignature: activeSignature,
                activeParameter: activeParameter
            };
            return results;
        }
        catch (e) {
            this.connection.console.error(`error in onSignatureHelp: ${(_c = (_b = e.stack) !== null && _b !== void 0 ? _b : e.message) !== null && _c !== void 0 ? _c : e}`);
            return {
                signatures: [],
                activeSignature: 0,
                activeParameter: 0
            };
        }
    }
    async onReferences(params) {
        await this.waitAllProjectFirstRuns();
        const position = params.position;
        const srcPath = util_1.util.uriToPath(params.textDocument.uri);
        const results = util_1.util.flatMap(await Promise.all(this.getProjects().map(project => {
            return project.builder.program.getReferences(srcPath, position);
        })), c => c);
        return results.filter((r) => r);
    }
    onValidateSettled() {
        return Promise.all([
            //wait for the validator to start running (or timeout if it never did)
            this.validateThrottler.onRunOnce(100),
            //wait for the validator to stop running (or resolve immediately if it's already idle)
            this.validateThrottler.onIdleOnce(true)
        ]);
    }
    async onFullSemanticTokens(params) {
        await this.waitAllProjectFirstRuns();
        //wait for the file to settle (in case there are multiple file changes in quick succession)
        await this.keyedThrottler.onIdleOnce(util_1.util.uriToPath(params.textDocument.uri), true);
        //wait for the validation cycle to settle
        await this.onValidateSettled();
        const srcPath = util_1.util.uriToPath(params.textDocument.uri);
        for (const project of this.projects) {
            //find the first program that has this file, since it would be incredibly inefficient to generate semantic tokens for the same file multiple times.
            if (project.builder.program.hasFile(srcPath)) {
                let semanticTokens = project.builder.program.getSemanticTokens(srcPath);
                return {
                    data: (0, SemanticTokenUtils_1.encodeSemanticTokens)(semanticTokens)
                };
            }
        }
    }
    async sendDiagnostics() {
        await this.sendDiagnosticsThrottler.run(async () => {
            //wait for all programs to finish running. This ensures the `Program` exists.
            await Promise.all(this.projects.map(x => x.firstRunPromise));
            //Get only the changes to diagnostics since the last time we sent them to the client
            const patch = this.diagnosticCollection.getPatch(this.projects);
            for (let filePath in patch) {
                const uri = vscode_uri_1.URI.file(filePath).toString();
                const diagnostics = patch[filePath].map(d => util_1.util.toDiagnostic(d, uri));
                this.connection.sendDiagnostics({
                    uri: uri,
                    diagnostics: diagnostics
                });
            }
        });
    }
    async onExecuteCommand(params) {
        await this.waitAllProjectFirstRuns();
        if (params.command === CustomCommands.TranspileFile) {
            const result = await this.transpileFile(params.arguments[0]);
            //back-compat: include `pathAbsolute` property so older vscode versions still work
            result.pathAbsolute = result.srcPath;
            return result;
        }
    }
    async transpileFile(srcPath) {
        //wait all program first runs
        await this.waitAllProjectFirstRuns();
        //find the first project that has this file
        for (let project of this.getProjects()) {
            if (project.builder.program.hasFile(srcPath)) {
                return project.builder.program.getTranspiledFileContents(srcPath);
            }
        }
    }
    dispose() {
        var _a;
        (_a = this.loggerSubscription) === null || _a === void 0 ? void 0 : _a.call(this);
        this.validateThrottler.dispose();
    }
}
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onInitialize", null);
__decorate([
    TrackBusyStatus
], LanguageServer.prototype, "getProjectPaths", null);
__decorate([
    TrackBusyStatus
], LanguageServer.prototype, "syncProjects", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "onInitialized", null);
__decorate([
    TrackBusyStatus
], LanguageServer.prototype, "createProject", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "onCompletion", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onCompletionResolve", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "onCodeAction", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onDidChangeConfiguration", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "onDidChangeWatchedFiles", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onHover", null);
__decorate([
    AddStackToErrorMessage
], LanguageServer.prototype, "onDocumentClose", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "validateTextDocument", null);
__decorate([
    TrackBusyStatus
], LanguageServer.prototype, "validateAll", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "onWorkspaceSymbol", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "onDocumentSymbol", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "onDefinition", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "onSignatureHelp", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "onReferences", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "onFullSemanticTokens", null);
__decorate([
    AddStackToErrorMessage,
    TrackBusyStatus
], LanguageServer.prototype, "onExecuteCommand", null);
exports.LanguageServer = LanguageServer;
var CustomCommands;
(function (CustomCommands) {
    CustomCommands["TranspileFile"] = "TranspileFile";
})(CustomCommands = exports.CustomCommands || (exports.CustomCommands = {}));
var NotificationName;
(function (NotificationName) {
    NotificationName["busyStatus"] = "busyStatus";
})(NotificationName = exports.NotificationName || (exports.NotificationName = {}));
/**
 * Wraps a method. If there's an error (either sync or via a promise),
 * this appends the error's stack trace at the end of the error message so that the connection will
 */
function AddStackToErrorMessage(target, propertyKey, descriptor) {
    let originalMethod = descriptor.value;
    //wrapping the original method
    descriptor.value = function value(...args) {
        try {
            let result = originalMethod.apply(this, args);
            //if the result looks like a promise, log if there's a rejection
            if (result === null || result === void 0 ? void 0 : result.then) {
                return Promise.resolve(result).catch((e) => {
                    if (e === null || e === void 0 ? void 0 : e.stack) {
                        e.message = e.stack;
                    }
                    return Promise.reject(e);
                });
            }
            else {
                return result;
            }
        }
        catch (e) {
            if (e === null || e === void 0 ? void 0 : e.stack) {
                e.message = e.stack;
            }
            throw e;
        }
    };
}
/**
 * An annotation used to wrap the method in a busyStatus tracking call
 */
function TrackBusyStatus(target, propertyKey, descriptor) {
    let originalMethod = descriptor.value;
    //wrapping the original method
    descriptor.value = function value(...args) {
        return this.busyStatusTracker.run(() => {
            return originalMethod.apply(this, args);
        }, originalMethod.name);
    };
}
//# sourceMappingURL=LanguageServer.js.map