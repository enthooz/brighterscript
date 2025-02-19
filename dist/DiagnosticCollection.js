"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticCollection = void 0;
const util_1 = require("./util");
class DiagnosticCollection {
    constructor() {
        this.previousDiagnosticsByFile = {};
    }
    getPatch(projects) {
        const diagnosticsByFile = this.getDiagnosticsByFileFromProjects(projects);
        const patch = Object.assign(Object.assign(Object.assign({}, this.getRemovedPatch(diagnosticsByFile)), this.getModifiedPatch(diagnosticsByFile)), this.getAddedPatch(diagnosticsByFile));
        //save the new list of diagnostics
        this.previousDiagnosticsByFile = diagnosticsByFile;
        return patch;
    }
    getDiagnosticsByFileFromProjects(projects) {
        var _a, _b;
        const result = {};
        //get all diagnostics for all projects
        let diagnostics = Array.prototype.concat.apply([], projects.map((x) => x.builder.getDiagnostics()));
        const keys = {};
        //build the full current set of diagnostics by file
        for (let diagnostic of diagnostics) {
            const srcPath = (_a = diagnostic.file.srcPath) !== null && _a !== void 0 ? _a : diagnostic.file.srcPath;
            //ensure the file entry exists
            if (!result[srcPath]) {
                result[srcPath] = [];
            }
            const diagnosticMap = result[srcPath];
            //fall back to a default range if missing
            const range = (_b = diagnostic === null || diagnostic === void 0 ? void 0 : diagnostic.range) !== null && _b !== void 0 ? _b : util_1.util.createRange(0, 0, 0, 0);
            diagnostic.key =
                srcPath.toLowerCase() + '-' +
                    diagnostic.code + '-' +
                    range.start.line + '-' +
                    range.start.character + '-' +
                    range.end.line + '-' +
                    range.end.character +
                    diagnostic.message;
            //don't include duplicates
            if (!keys[diagnostic.key]) {
                keys[diagnostic.key] = true;
                diagnosticMap.push(diagnostic);
            }
        }
        return result;
    }
    /**
     * Get a patch for all the files that have been removed since last time
     */
    getRemovedPatch(currentDiagnosticsByFile) {
        const result = {};
        for (const filePath in this.previousDiagnosticsByFile) {
            if (!currentDiagnosticsByFile[filePath]) {
                result[filePath] = [];
            }
        }
        return result;
    }
    /**
     * Get all files whose diagnostics have changed since last time
     */
    getModifiedPatch(currentDiagnosticsByFile) {
        const result = {};
        for (const filePath in currentDiagnosticsByFile) {
            //for this file, if there were diagnostics last time AND there are diagnostics this time, and the lists are different
            if (this.previousDiagnosticsByFile[filePath] && !this.diagnosticListsAreIdentical(this.previousDiagnosticsByFile[filePath], currentDiagnosticsByFile[filePath])) {
                result[filePath] = currentDiagnosticsByFile[filePath];
            }
        }
        return result;
    }
    /**
     * Determine if two diagnostic lists are identical
     */
    diagnosticListsAreIdentical(list1, list2) {
        //skip all checks if the lists are not the same size
        if (list1.length !== list2.length) {
            return false;
        }
        for (let i = 0; i < list1.length; i++) {
            if (list1[i].key !== list2[i].key) {
                return false;
            }
        }
        //if we made it here, the lists are identical
        return true;
    }
    /**
     * Get diagnostics for all new files not seen since last time
     */
    getAddedPatch(currentDiagnosticsByFile) {
        const result = {};
        for (const filePath in currentDiagnosticsByFile) {
            if (!this.previousDiagnosticsByFile[filePath]) {
                result[filePath] = currentDiagnosticsByFile[filePath];
            }
        }
        return result;
    }
}
exports.DiagnosticCollection = DiagnosticCollection;
//# sourceMappingURL=DiagnosticCollection.js.map