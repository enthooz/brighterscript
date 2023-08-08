"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripConsoleColors = exports.mapToObject = exports.objectToMap = exports.expectThrows = exports.expectCompletionsExcludes = exports.expectCompletionsIncludes = exports.getTestGetTypedef = exports.getTestTranspile = exports.expectInstanceOf = exports.expectCodeActions = exports.trimMap = exports.expectHasDiagnostics = exports.expectZeroDiagnostics = exports.expectDiagnosticsIncludes = exports.expectDiagnostics = exports.trim = exports.stagingDir = exports.rootDir = exports.tempDir = void 0;
const assert = require("assert");
const chalk_1 = require("chalk");
const sinon_1 = require("sinon");
const chai_config_spec_1 = require("./chai-config.spec");
const CodeActionUtil_1 = require("./CodeActionUtil");
const util_1 = require("./util");
const diagnosticUtils_1 = require("./diagnosticUtils");
const thenby_1 = require("thenby");
const undent_1 = require("undent");
exports.tempDir = (0, util_1.standardizePath) `${__dirname}/../.tmp`;
exports.rootDir = (0, util_1.standardizePath) `${exports.tempDir}/rootDir`;
exports.stagingDir = (0, util_1.standardizePath) `${exports.tempDir}/stagingDir`;
exports.trim = undent_1.default;
function getDiagnostics(arg) {
    if (Array.isArray(arg)) {
        return arg;
    }
    else if (arg.getDiagnostics) {
        return arg.getDiagnostics();
    }
    else if (arg.diagnostics) {
        return arg.diagnostics;
    }
    else {
        throw new Error('Cannot derive a list of diagnostics from ' + JSON.stringify(arg));
    }
}
function sortDiagnostics(diagnostics) {
    return diagnostics.sort((0, thenby_1.firstBy)('code')
        .thenBy('message')
        .thenBy((a, b) => { var _a, _b, _c, _d, _e, _f; return ((_c = (_b = (_a = a.range) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.line) !== null && _c !== void 0 ? _c : 0) - ((_f = (_e = (_d = b.range) === null || _d === void 0 ? void 0 : _d.start) === null || _e === void 0 ? void 0 : _e.line) !== null && _f !== void 0 ? _f : 0); })
        .thenBy((a, b) => { var _a, _b, _c, _d, _e, _f; return ((_c = (_b = (_a = a.range) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.character) !== null && _c !== void 0 ? _c : 0) - ((_f = (_e = (_d = b.range) === null || _d === void 0 ? void 0 : _d.start) === null || _e === void 0 ? void 0 : _e.character) !== null && _f !== void 0 ? _f : 0); })
        .thenBy((a, b) => { var _a, _b, _c, _d, _e, _f; return ((_c = (_b = (_a = a.range) === null || _a === void 0 ? void 0 : _a.end) === null || _b === void 0 ? void 0 : _b.line) !== null && _c !== void 0 ? _c : 0) - ((_f = (_e = (_d = b.range) === null || _d === void 0 ? void 0 : _d.end) === null || _e === void 0 ? void 0 : _e.line) !== null && _f !== void 0 ? _f : 0); })
        .thenBy((a, b) => { var _a, _b, _c, _d, _e, _f; return ((_c = (_b = (_a = a.range) === null || _a === void 0 ? void 0 : _a.end) === null || _b === void 0 ? void 0 : _b.character) !== null && _c !== void 0 ? _c : 0) - ((_f = (_e = (_d = b.range) === null || _d === void 0 ? void 0 : _d.end) === null || _e === void 0 ? void 0 : _e.character) !== null && _f !== void 0 ? _f : 0); }));
}
function cloneObject(original, template, defaultKeys) {
    const clone = {};
    let keys = Object.keys(template !== null && template !== void 0 ? template : {});
    //if there were no keys provided, use some sane defaults
    keys = keys.length > 0 ? keys : defaultKeys;
    //copy only compare the specified keys from actualDiagnostic
    for (const key of keys) {
        clone[key] = original[key];
    }
    return clone;
}
/**
 *  Helper function to clone a Diagnostic so it will give partial data that has the same properties as the expected
 */
function cloneDiagnostic(actualDiagnosticInput, expectedDiagnostic) {
    const actualDiagnostic = cloneObject(actualDiagnosticInput, expectedDiagnostic, ['message', 'code', 'range', 'severity', 'relatedInformation']);
    //deep clone relatedInformation if available
    if (actualDiagnostic.relatedInformation) {
        for (let j = 0; j < actualDiagnostic.relatedInformation.length; j++) {
            actualDiagnostic.relatedInformation[j] = cloneObject(actualDiagnostic.relatedInformation[j], expectedDiagnostic === null || expectedDiagnostic === void 0 ? void 0 : expectedDiagnostic.relatedInformation[j], ['location', 'message']);
        }
    }
    //deep clone file info if available
    if (actualDiagnostic.file) {
        actualDiagnostic.file = cloneObject(actualDiagnostic.file, expectedDiagnostic === null || expectedDiagnostic === void 0 ? void 0 : expectedDiagnostic.file, ['srcPath', 'pkgPath']);
    }
    return actualDiagnostic;
}
/**
 * Ensure the DiagnosticCollection exactly contains the data from expected list.
 * @param arg - any object that contains diagnostics (such as `Program`, `Scope`, or even an array of diagnostics)
 * @param expected an array of expected diagnostics. if it's a string, assume that's a diagnostic error message
 */
function expectDiagnostics(arg, expected) {
    const actualDiagnostics = sortDiagnostics(getDiagnostics(arg));
    const expectedDiagnostics = sortDiagnostics(expected.map(x => {
        let result = x;
        if (typeof x === 'string') {
            result = { message: x };
        }
        else if (typeof x === 'number') {
            result = { code: x };
        }
        return result;
    }));
    const actual = [];
    for (let i = 0; i < actualDiagnostics.length; i++) {
        const expectedDiagnostic = expectedDiagnostics[i];
        const actualDiagnostic = cloneDiagnostic(actualDiagnostics[i], expectedDiagnostic);
        actual.push(actualDiagnostic);
    }
    (0, chai_config_spec_1.expect)(actual).to.eql(expectedDiagnostics);
}
exports.expectDiagnostics = expectDiagnostics;
/**
 * Ensure the DiagnosticCollection includes data from expected list (note - order does not matter).
 * @param arg - any object that contains diagnostics (such as `Program`, `Scope`, or even an array of diagnostics)
 * @param expected an array of expected diagnostics. if it's a string, assume that's a diagnostic error message
 */
function expectDiagnosticsIncludes(arg, expected) {
    const actualDiagnostics = getDiagnostics(arg);
    const expectedDiagnostics = expected.map(x => {
        let result = x;
        if (typeof x === 'string') {
            result = { message: x };
        }
        else if (typeof x === 'number') {
            result = { code: x };
        }
        return result;
    });
    let expectedFound = 0;
    for (const expectedDiagnostic of expectedDiagnostics) {
        const foundDiag = actualDiagnostics.find((actualDiag) => {
            const actualDiagnosticClone = cloneDiagnostic(actualDiag, expectedDiagnostic);
            return JSON.stringify(actualDiagnosticClone) === JSON.stringify(expectedDiagnostic);
        });
        if (foundDiag) {
            expectedFound++;
        }
    }
    (0, chai_config_spec_1.expect)(expectedFound).to.eql(expectedDiagnostics.length);
}
exports.expectDiagnosticsIncludes = expectDiagnosticsIncludes;
/**
 * Test that the given object has zero diagnostics. If diagnostics are found, they are printed to the console in a pretty fashion.
 */
function expectZeroDiagnostics(arg) {
    var _a, _b, _c, _d, _e;
    const diagnostics = getDiagnostics(arg);
    if (diagnostics.length > 0) {
        let message = `Expected 0 diagnostics, but instead found ${diagnostics.length}:`;
        for (const diagnostic of diagnostics) {
            //escape any newlines
            diagnostic.message = diagnostic.message.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
            message += `\n        • bs${diagnostic.code} "${diagnostic.message}" at ${(_b = (_a = diagnostic.file) === null || _a === void 0 ? void 0 : _a.srcPath) !== null && _b !== void 0 ? _b : ''}#(${diagnostic.range.start.line}:${diagnostic.range.start.character})-(${diagnostic.range.end.line}:${diagnostic.range.end.character})`;
            //print the line containing the error (if we can find it)srcPath
            const line = (_e = (_d = (_c = diagnostic.file) === null || _c === void 0 ? void 0 : _c.fileContents) === null || _d === void 0 ? void 0 : _d.split(/\r?\n/g)) === null || _e === void 0 ? void 0 : _e[diagnostic.range.start.line];
            if (line) {
                message += '\n' + (0, diagnosticUtils_1.getDiagnosticLine)(diagnostic, line, chalk_1.default.red);
            }
        }
        assert.fail(message);
    }
}
exports.expectZeroDiagnostics = expectZeroDiagnostics;
/**
 * Test if the arg has any diagnostics. This just checks the count, nothing more.
 * @param diagnosticsCollection a collection of diagnostics
 * @param length if specified, checks the diagnostic count is exactly that amount. If omitted, the collection is just verified as non-empty
 */
function expectHasDiagnostics(diagnosticsCollection, length = null) {
    const diagnostics = getDiagnostics(diagnosticsCollection);
    if (length) {
        (0, chai_config_spec_1.expect)(diagnostics).lengthOf(length);
    }
    else {
        (0, chai_config_spec_1.expect)(diagnostics).not.empty;
    }
}
exports.expectHasDiagnostics = expectHasDiagnostics;
/**
 * Remove sourcemap information at the end of the source
 */
function trimMap(source) {
    return source.replace(/('|<!--)\/\/# sourceMappingURL=.*$/m, '').trimEnd();
}
exports.trimMap = trimMap;
function expectCodeActions(test, expected) {
    const sinon = (0, sinon_1.createSandbox)();
    const stub = sinon.stub(CodeActionUtil_1.codeActionUtil, 'createCodeAction');
    try {
        test();
    }
    finally {
        sinon.restore();
    }
    const args = stub.getCalls().map(x => x.args[0]);
    //delete any `diagnostics` arrays to help with testing performance (since it's circular...causes all sorts of issues)
    for (let arg of args) {
        delete arg.diagnostics;
    }
    (0, chai_config_spec_1.expect)(args).to.eql(expected);
}
exports.expectCodeActions = expectCodeActions;
function expectInstanceOf(items, constructors) {
    var _a;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const constructor = constructors[i];
        if (!(item instanceof constructor)) {
            throw new Error(`Expected index ${i} to be instanceof ${constructor.name} but instead found ${(_a = item.constructor) === null || _a === void 0 ? void 0 : _a.name}`);
        }
    }
}
exports.expectInstanceOf = expectInstanceOf;
function getTestTranspile(scopeGetter) {
    return getTestFileAction((file) => {
        return file.program['_getTranspiledFileContents'](file);
    }, scopeGetter);
}
exports.getTestTranspile = getTestTranspile;
function getTestGetTypedef(scopeGetter) {
    return getTestFileAction((file) => {
        return {
            code: file.getTypedef(),
            map: undefined
        };
    }, scopeGetter);
}
exports.getTestGetTypedef = getTestGetTypedef;
function getTestFileAction(action, scopeGetter) {
    return function testFileAction(source, expected, formatType = 'trim', pkgPath = 'source/main.bs', failOnDiagnostic = true) {
        let [program, rootDir] = scopeGetter();
        expected = expected ? expected : source;
        let file = program.setFile({ src: (0, util_1.standardizePath) `${rootDir}/${pkgPath}`, dest: pkgPath }, source);
        program.validate();
        if (failOnDiagnostic !== false) {
            expectZeroDiagnostics(program);
        }
        let codeWithMap = action(file);
        let sources = [trimMap(codeWithMap.code), expected];
        for (let i = 0; i < sources.length; i++) {
            if (formatType === 'trim') {
                sources[i] = (0, exports.trim)(sources[i]);
            }
        }
        (0, chai_config_spec_1.expect)(sources[0]).to.equal(sources[1]);
        return {
            file: file,
            source: source,
            expected: expected,
            actual: codeWithMap.code,
            map: codeWithMap.map
        };
    };
}
/**
 * Create a new object based on the keys from another object
 */
function pick(example, subject) {
    if (!subject) {
        return subject;
    }
    const result = {};
    for (const key of Object.keys(example)) {
        result[key] = subject === null || subject === void 0 ? void 0 : subject[key];
    }
    return result;
}
/**
 * Test a set of completions includes the provided items
 */
function expectCompletionsIncludes(completions, expectedItems) {
    for (const expectedItem of expectedItems) {
        if (typeof expectedItem === 'string') {
            (0, chai_config_spec_1.expect)(completions.map(x => x.label)).includes(expectedItem);
        }
        else {
            //match all existing properties of the expectedItem
            let actualItem = pick(expectedItem, completions.find(x => x.label === expectedItem.label));
            (0, chai_config_spec_1.expect)(actualItem).to.eql(expectedItem);
        }
    }
}
exports.expectCompletionsIncludes = expectCompletionsIncludes;
/**
 * Expect that the completions list does not include the provided items
 */
function expectCompletionsExcludes(completions, expectedItems) {
    for (const expectedItem of expectedItems) {
        if (typeof expectedItem === 'string') {
            (0, chai_config_spec_1.expect)(completions.map(x => x.label)).not.includes(expectedItem);
        }
        else {
            //match all existing properties of the expectedItem
            let actualItem = pick(expectedItem, completions.find(x => x.label === expectedItem.label));
            (0, chai_config_spec_1.expect)(actualItem).to.not.eql(expectedItem);
        }
    }
}
exports.expectCompletionsExcludes = expectCompletionsExcludes;
function expectThrows(callback, expectedMessage = undefined, failedTestMessage = 'Expected to throw but did not') {
    let wasExceptionThrown = false;
    try {
        callback();
    }
    catch (e) {
        wasExceptionThrown = true;
        if (expectedMessage) {
            (0, chai_config_spec_1.expect)(e.message).to.eql(expectedMessage);
        }
    }
    if (wasExceptionThrown === false) {
        throw new Error(failedTestMessage);
    }
}
exports.expectThrows = expectThrows;
function objectToMap(obj) {
    const result = new Map();
    for (let key in obj) {
        result.set(key, obj[key]);
    }
    return result;
}
exports.objectToMap = objectToMap;
function mapToObject(map) {
    const result = {};
    for (let [key, value] of map) {
        result[key] = value;
    }
    return result;
}
exports.mapToObject = mapToObject;
function stripConsoleColors(inputString) {
    // Regular expression to match ANSI escape codes for colors
    // eslint-disable-next-line no-control-regex
    const colorPattern = /\u001b\[(?:\d*;){0,5}\d*m/g;
    // Remove all occurrences of ANSI escape codes
    return inputString.replace(colorPattern, '');
}
exports.stripConsoleColors = stripConsoleColors;
//# sourceMappingURL=testHelpers.spec.js.map