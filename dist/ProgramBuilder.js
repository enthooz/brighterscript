"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgramBuilder = void 0;
const debounce = require("debounce-promise");
const path = require("path");
const roku_deploy_1 = require("roku-deploy");
const Program_1 = require("./Program");
const util_1 = require("./util");
const Watcher_1 = require("./Watcher");
const vscode_languageserver_1 = require("vscode-languageserver");
const Logger_1 = require("./Logger");
const PluginInterface_1 = require("./PluginInterface");
const diagnosticUtils = require("./diagnosticUtils");
const fsExtra = require("fs-extra");
const requireRelative = require("require-relative");
const Throttler_1 = require("./Throttler");
const vscode_uri_1 = require("vscode-uri");
/**
 * A runner class that handles
 */
class ProgramBuilder {
    constructor() {
        /**
         * Determines whether the console should be cleared after a run (true for cli, false for languageserver)
         */
        this.allowConsoleClearing = true;
        this.isRunning = false;
        this.logger = new Logger_1.Logger();
        this.plugins = new PluginInterface_1.default([], { logger: this.logger });
        this.fileResolvers = [];
        /**
         * A list of diagnostics that are always added to the `getDiagnostics()` call.
         */
        this.staticDiagnostics = [];
        /**
         * A method that is used to cancel a previous run task.
         * Does nothing if previous run has completed or was already canceled
         */
        this.cancelLastRun = () => {
            return Promise.resolve();
        };
        this.transpileThrottler = new Throttler_1.Throttler(0);
        //add the default file resolver (used to load source file contents).
        this.addFileResolver((filePath) => {
            return fsExtra.readFile(filePath).then((value) => {
                return value.toString();
            });
        });
    }
    addFileResolver(fileResolver) {
        this.fileResolvers.push(fileResolver);
    }
    /**
     * Get the contents of the specified file as a string.
     * This walks backwards through the file resolvers until we get a value.
     * This allow the language server to provide file contents directly from memory.
     */
    async getFileContents(srcPath) {
        srcPath = (0, util_1.standardizePath) `${srcPath}`;
        let reversedResolvers = [...this.fileResolvers].reverse();
        for (let fileResolver of reversedResolvers) {
            let result = await fileResolver(srcPath);
            if (typeof result === 'string') {
                return result;
            }
        }
        throw new Error(`Could not load file "${srcPath}"`);
    }
    addDiagnostic(srcPath, diagnostic) {
        let file = this.program.getFile(srcPath);
        if (!file) {
            file = {
                pkgPath: this.program.getPkgPath(srcPath),
                pathAbsolute: srcPath,
                srcPath: srcPath,
                getDiagnostics: () => {
                    return [diagnostic];
                }
            };
        }
        diagnostic.file = file;
        this.staticDiagnostics.push(diagnostic);
    }
    getDiagnostics() {
        var _a, _b;
        return [
            ...this.staticDiagnostics,
            ...((_b = (_a = this.program) === null || _a === void 0 ? void 0 : _a.getDiagnostics()) !== null && _b !== void 0 ? _b : [])
        ];
    }
    async run(options) {
        this.logger.logLevel = options.logLevel;
        if (this.isRunning) {
            throw new Error('Server is already running');
        }
        this.isRunning = true;
        try {
            this.options = util_1.util.normalizeAndResolveConfig(options);
            if (this.options.project) {
                this.logger.log(`Using config file: "${this.options.project}"`);
            }
            else {
                this.logger.log(`No bsconfig.json file found, using default options`);
            }
            this.loadRequires();
            this.loadPlugins();
        }
        catch (e) {
            if ((e === null || e === void 0 ? void 0 : e.file) && e.message && e.code) {
                let err = e;
                this.staticDiagnostics.push(err);
            }
            else {
                //if this is not a diagnostic, something else is wrong...
                throw e;
            }
            this.printDiagnostics();
            //we added diagnostics, so hopefully that draws attention to the underlying issues.
            //For now, just use a default options object so we have a functioning program
            this.options = util_1.util.normalizeConfig({});
        }
        this.logger.logLevel = this.options.logLevel;
        this.program = this.createProgram();
        //parse every file in the entire project
        await this.loadAllFilesAST();
        if (this.options.watch) {
            this.logger.log('Starting compilation in watch mode...');
            await this.runOnce();
            this.enableWatchMode();
        }
        else {
            await this.runOnce();
        }
    }
    createProgram() {
        const program = new Program_1.Program(this.options, this.logger, this.plugins);
        this.plugins.emit('afterProgramCreate', program);
        return program;
    }
    loadPlugins() {
        var _a, _b, _c, _d;
        const cwd = (_a = this.options.cwd) !== null && _a !== void 0 ? _a : process.cwd();
        const plugins = util_1.util.loadPlugins(cwd, (_b = this.options.plugins) !== null && _b !== void 0 ? _b : [], (pathOrModule, err) => this.logger.error(`Error when loading plugin '${pathOrModule}':`, err));
        this.logger.log(`Loading ${(_d = (_c = this.options.plugins) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0} plugins for cwd "${cwd}"`);
        for (let plugin of plugins) {
            this.plugins.add(plugin);
        }
        this.plugins.emit('beforeProgramCreate', this);
    }
    /**
     * `require()` every options.require path
     */
    loadRequires() {
        var _a;
        for (const dep of (_a = this.options.require) !== null && _a !== void 0 ? _a : []) {
            requireRelative(dep, this.options.cwd);
        }
    }
    clearConsole() {
        if (this.allowConsoleClearing) {
            util_1.util.clearConsole();
        }
    }
    enableWatchMode() {
        this.watcher = new Watcher_1.Watcher(this.options);
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
        }
        //keep the process alive indefinitely by setting an interval that runs once every 12 days
        this.watchInterval = setInterval(() => { }, 1073741824);
        //clear the console
        this.clearConsole();
        let fileObjects = roku_deploy_1.rokuDeploy.normalizeFilesArray(this.options.files ? this.options.files : []);
        //add each set of files to the file watcher
        for (let fileObject of fileObjects) {
            let src = typeof fileObject === 'string' ? fileObject : fileObject.src;
            this.watcher.watch(src);
        }
        this.logger.log('Watching for file changes...');
        let debouncedRunOnce = debounce(async () => {
            this.logger.log('File change detected. Starting incremental compilation...');
            await this.runOnce();
            this.logger.log(`Watching for file changes.`);
        }, 50);
        //on any file watcher event
        this.watcher.on('all', async (event, thePath) => {
            thePath = (0, util_1.standardizePath) `${path.resolve(this.rootDir, thePath)}`;
            if (event === 'add' || event === 'change') {
                const fileObj = {
                    src: thePath,
                    dest: roku_deploy_1.rokuDeploy.getDestPath(thePath, this.program.options.files, 
                    //some shells will toTowerCase the drive letter, so do it to rootDir for consistency
                    util_1.util.driveLetterToLower(this.rootDir))
                };
                this.program.setFile(fileObj, await this.getFileContents(fileObj.src));
            }
            else if (event === 'unlink') {
                this.program.removeFile(thePath);
            }
            //wait for change events to settle, and then execute `run`
            await debouncedRunOnce();
        });
    }
    /**
     * The rootDir for this program.
     */
    get rootDir() {
        return this.program.options.rootDir;
    }
    /**
     * Run the entire process exactly one time.
     */
    runOnce() {
        //clear the console
        this.clearConsole();
        let cancellationToken = { isCanceled: false };
        //wait for the previous run to complete
        let runPromise = this.cancelLastRun().then(() => {
            //start the new run
            return this._runOnce(cancellationToken);
        });
        //a function used to cancel this run
        this.cancelLastRun = () => {
            cancellationToken.isCanceled = true;
            return runPromise;
        };
        return runPromise;
    }
    printDiagnostics(diagnostics) {
        var _a, _b, _c, _d, _e;
        if (((_a = this.options) === null || _a === void 0 ? void 0 : _a.showDiagnosticsInConsole) === false) {
            return;
        }
        if (!diagnostics) {
            diagnostics = this.getDiagnostics();
        }
        //group the diagnostics by file
        let diagnosticsByFile = {};
        for (let diagnostic of diagnostics) {
            if (!diagnosticsByFile[diagnostic.file.srcPath]) {
                diagnosticsByFile[diagnostic.file.srcPath] = [];
            }
            diagnosticsByFile[diagnostic.file.srcPath].push(diagnostic);
        }
        //get printing options
        const options = diagnosticUtils.getPrintDiagnosticOptions(this.options);
        const { cwd, emitFullPaths } = options;
        let srcPaths = Object.keys(diagnosticsByFile).sort();
        for (let srcPath of srcPaths) {
            let diagnosticsForFile = diagnosticsByFile[srcPath];
            //sort the diagnostics in line and column order
            let sortedDiagnostics = diagnosticsForFile.sort((a, b) => {
                return (a.range.start.line - b.range.start.line ||
                    a.range.start.character - b.range.start.character);
            });
            let filePath = srcPath;
            if (!emitFullPaths) {
                filePath = path.relative(cwd, filePath);
            }
            //load the file text
            const file = (_b = this.program) === null || _b === void 0 ? void 0 : _b.getFile(srcPath);
            //get the file's in-memory contents if available
            const lines = (_d = (_c = file === null || file === void 0 ? void 0 : file.fileContents) === null || _c === void 0 ? void 0 : _c.split(/\r?\n/g)) !== null && _d !== void 0 ? _d : [];
            for (let diagnostic of sortedDiagnostics) {
                //default the severity to error if undefined
                let severity = typeof diagnostic.severity === 'number' ? diagnostic.severity : vscode_languageserver_1.DiagnosticSeverity.Error;
                let relatedInformation = ((_e = diagnostic.relatedInformation) !== null && _e !== void 0 ? _e : []).map(x => {
                    let relatedInfoFilePath = vscode_uri_1.URI.parse(x.location.uri).fsPath;
                    if (!emitFullPaths) {
                        relatedInfoFilePath = path.relative(cwd, relatedInfoFilePath);
                    }
                    return {
                        filePath: relatedInfoFilePath,
                        range: x.location.range,
                        message: x.message
                    };
                });
                //format output
                diagnosticUtils.printDiagnostic(options, severity, filePath, lines, diagnostic, relatedInformation);
            }
        }
    }
    /**
     * Run the process once, allowing cancelability.
     * NOTE: This should only be called by `runOnce`.
     */
    async _runOnce(cancellationToken) {
        let wereDiagnosticsPrinted = false;
        try {
            //maybe cancel?
            if (cancellationToken.isCanceled === true) {
                return -1;
            }
            //validate program
            this.validateProject();
            //maybe cancel?
            if (cancellationToken.isCanceled === true) {
                return -1;
            }
            const diagnostics = this.getDiagnostics();
            this.printDiagnostics(diagnostics);
            wereDiagnosticsPrinted = true;
            let errorCount = diagnostics.filter(x => x.severity === vscode_languageserver_1.DiagnosticSeverity.Error).length;
            if (errorCount > 0) {
                this.logger.log(`Found ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`);
                return errorCount;
            }
            //create the deployment package (and transpile as well)
            await this.createPackageIfEnabled();
            //maybe cancel?
            if (cancellationToken.isCanceled === true) {
                return -1;
            }
            //deploy the package
            await this.deployPackageIfEnabled();
            return 0;
        }
        catch (e) {
            if (wereDiagnosticsPrinted === false) {
                this.printDiagnostics();
            }
            throw e;
        }
    }
    async createPackageIfEnabled() {
        if (this.options.copyToStaging || this.options.createPackage || this.options.deploy) {
            //transpile the project
            await this.transpile();
            //create the zip file if configured to do so
            if (this.options.createPackage !== false || this.options.deploy) {
                await this.logger.time(Logger_1.LogLevel.log, [`Creating package at ${this.options.outFile}`], async () => {
                    await roku_deploy_1.rokuDeploy.zipPackage(Object.assign(Object.assign({}, this.options), { logLevel: this.options.logLevel, outDir: util_1.util.getOutDir(this.options), outFile: path.basename(this.options.outFile) }));
                });
            }
        }
    }
    /**
     * Transpiles the entire program into the staging folder
     */
    async transpile() {
        await this.transpileThrottler.run(async () => {
            let options = util_1.util.cwdWork(this.options.cwd, () => {
                return roku_deploy_1.rokuDeploy.getOptions(Object.assign(Object.assign({}, this.options), { logLevel: this.options.logLevel, outDir: util_1.util.getOutDir(this.options), outFile: path.basename(this.options.outFile) }));
            });
            //get every file referenced by the files array
            let fileMap = await roku_deploy_1.rokuDeploy.getFilePaths(options.files, options.rootDir);
            //remove files currently loaded in the program, we will transpile those instead (even if just for source maps)
            let filteredFileMap = [];
            for (let fileEntry of fileMap) {
                if (this.program.hasFile(fileEntry.src) === false) {
                    filteredFileMap.push(fileEntry);
                }
            }
            this.plugins.emit('beforePrepublish', this, filteredFileMap);
            await this.logger.time(Logger_1.LogLevel.log, ['Copying to staging directory'], async () => {
                //prepublish all non-program-loaded files to staging
                await roku_deploy_1.rokuDeploy.prepublishToStaging(Object.assign(Object.assign({}, options), { files: filteredFileMap }));
            });
            this.plugins.emit('afterPrepublish', this, filteredFileMap);
            this.plugins.emit('beforePublish', this, fileMap);
            await this.logger.time(Logger_1.LogLevel.log, ['Transpiling'], async () => {
                //transpile any brighterscript files
                await this.program.transpile(fileMap, options.stagingDir);
            });
            this.plugins.emit('afterPublish', this, fileMap);
        });
    }
    async deployPackageIfEnabled() {
        //deploy the project if configured to do so
        if (this.options.deploy) {
            await this.logger.time(Logger_1.LogLevel.log, ['Deploying package to', this.options.host], async () => {
                await roku_deploy_1.rokuDeploy.publish(Object.assign(Object.assign({}, this.options), { logLevel: this.options.logLevel, outDir: util_1.util.getOutDir(this.options), outFile: path.basename(this.options.outFile) }));
            });
        }
    }
    /**
     * Parse and load the AST for every file in the project
     */
    async loadAllFilesAST() {
        await this.logger.time(Logger_1.LogLevel.log, ['Parsing files'], async () => {
            let errorCount = 0;
            let files = await this.logger.time(Logger_1.LogLevel.debug, ['getFilePaths'], async () => {
                return util_1.util.getFilePaths(this.options);
            });
            this.logger.trace('ProgramBuilder.loadAllFilesAST() files:', files);
            const typedefFiles = [];
            const nonTypedefFiles = [];
            for (const file of files) {
                const srcLower = file.src.toLowerCase();
                if (srcLower.endsWith('.d.bs')) {
                    typedefFiles.push(file);
                }
                else {
                    nonTypedefFiles.push(file);
                }
            }
            //preload every type definition file first, which eliminates duplicate file loading
            await Promise.all(typedefFiles.map(async (fileObj) => {
                try {
                    this.program.setFile(fileObj, await this.getFileContents(fileObj.src));
                }
                catch (e) {
                    //log the error, but don't fail this process because the file might be fixable later
                    this.logger.log(e);
                }
            }));
            const acceptableExtensions = ['.bs', '.brs', '.xml'];
            //parse every file other than the type definitions
            await Promise.all(nonTypedefFiles.map(async (fileObj) => {
                try {
                    let fileExtension = path.extname(fileObj.src).toLowerCase();
                    //only process certain file types
                    if (acceptableExtensions.includes(fileExtension)) {
                        this.program.setFile(fileObj, await this.getFileContents(fileObj.src));
                    }
                }
                catch (e) {
                    //log the error, but don't fail this process because the file might be fixable later
                    this.logger.log(e);
                }
            }));
            return errorCount;
        });
    }
    /**
     * Remove all files from the program that are in the specified folder path
     * @param srcPath the path to the
     */
    removeFilesInFolder(srcPath) {
        for (let filePath in this.program.files) {
            //if the file path starts with the parent path and the file path does not exactly match the folder path
            if (filePath.startsWith(srcPath) && filePath !== srcPath) {
                this.program.removeFile(filePath);
            }
        }
    }
    /**
     * Scan every file and resolve all variable references.
     * If no errors were encountered, return true. Otherwise return false.
     */
    validateProject() {
        this.program.validate();
    }
    dispose() {
        var _a, _b;
        if (this.watcher) {
            this.watcher.dispose();
        }
        if (this.program) {
            (_b = (_a = this.program).dispose) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
        }
    }
}
exports.ProgramBuilder = ProgramBuilder;
//# sourceMappingURL=ProgramBuilder.js.map