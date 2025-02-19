"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Program_1 = require("../../../Program");
const util_1 = require("../../../util");
const testHelpers_spec_1 = require("../../../testHelpers.spec");
const DiagnosticMessages_1 = require("../../../DiagnosticMessages");
describe('RegexLiteralExpression', () => {
    let rootDir = (0, util_1.standardizePath) `${process.cwd()}/rootDir`;
    let program;
    let testTranspile = (0, testHelpers_spec_1.getTestTranspile)(() => [program, rootDir]);
    beforeEach(() => {
        program = new Program_1.Program({ rootDir: rootDir });
    });
    afterEach(() => {
        program.dispose();
    });
    describe('transpile', () => {
        it('captures flags', () => {
            testTranspile(`
                sub main()
                    print /hello/gi
                end sub
            `, `
                sub main()
                    print CreateObject("roRegex", "hello", "gi")
                end sub
            `);
        });
        it('handles when no flags', () => {
            testTranspile(`
                sub main()
                    print /hello/
                end sub
            `, `
                sub main()
                    print CreateObject("roRegex", "hello", "")
                end sub
            `);
        });
        it('handles weird escapes', () => {
            testTranspile(`
                sub main()
                    print /\\r\\n\\//
                end sub
            `, `
                sub main()
                    print CreateObject("roRegex", "\\r\\n\\/", "")
                end sub
            `);
        });
        it('escapes quotemark', () => {
            testTranspile(`
                sub main()
                    print /"/
                end sub
            `, `
                sub main()
                    print CreateObject("roRegex", "" + chr(34) + "", "")
                end sub
            `);
        });
        it('warns when in non-brighterscript mode', () => {
            program.setFile('source/main.brs', `
                sub main()
                    print /"/
                end sub
            `);
            (0, testHelpers_spec_1.expectDiagnostics)(program, [
                DiagnosticMessages_1.DiagnosticMessages.bsFeatureNotSupportedInBrsFiles('regular expression literal')
            ]);
        });
        it('handles edge cases', () => {
            testTranspile(`
                sub main()
                    print /1/
                    ? /1/
                    thing = false ?? /1/
                    v = /1/.Match("1")[0].ToInt()
                    v = [
                        0
                    ]
                    v[/0/.Match("0")[0].ToInt()] = true
                    type(/1/.Match("1")[0].ToInt())
                    v = 1 ^ /1/.Match("1")[0].ToInt()
                    v = 1 - /1/.Match("1")[0].ToInt()
                    v = 1 + /1/.Match("1")[0].ToInt()
                    v = 1 * /1/.Match("1")[0].ToInt()
                    v = 1 / /1/.Match("1")[0].ToInt()
                    v = 1 mod /1/.Match("1")[0].ToInt()
                    v = 1 \\ /1/.Match("1")[0].ToInt()
                    v = 1 >> /1/.Match("1")[0].ToInt()
                    v = 1 << /1/.Match("1")[0].ToInt()
                    v -= /1/.Match("1")[0].ToInt()
                    v += /1/.Match("1")[0].ToInt()
                    v *= /1/.Match("1")[0].ToInt()
                    v \\= /1/.Match("1")[0].ToInt()
                    v /= /1/.Match("1")[0].ToInt()
                    v <<= /1/.Match("1")[0].ToInt()
                    v >>= /1/.Match("1")[0].ToInt()
                    v = 1 < /1/.Match("1")[0].ToInt()
                    v = 1 <= /1/.Match("1")[0].ToInt()
                    v = 1 > /1/.Match("1")[0].ToInt()
                    v = 1 >= /1/.Match("1")[0].ToInt()
                    v = 1 = /1/.Match("1")[0].ToInt()
                    v = 1 <> /1/.Match("1")[0].ToInt()
                    v = 1 and /1/.Match("1")[0].ToInt()
                    v = 1 or /1/.Match("1")[0].ToInt()
                    if /1/.Match("1")[0].ToInt() > 0 then
                    end if
                    v = not /1/.Match("1")[0].ToInt() > 0
                    for i = 0 to /1/.Match("1")[0].ToInt()
                        print "for!"
                    end for
                    v = /1/
                    v = { name: /1/.Match("1")[0].ToInt() }
                    print 1; /1/.Match("1")[0].ToInt()
                    throw /1/.Match("1")[0]
                end sub
            `, `
                sub main()
                    print CreateObject("roRegex", "1", "")
                    ? CreateObject("roRegex", "1", "")
                    thing = bslib_coalesce(false, CreateObject("roRegex", "1", ""))
                    v = CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = [
                        0
                    ]
                    v[CreateObject("roRegex", "0", "").Match("0")[0].ToInt()] = true
                    type(CreateObject("roRegex", "1", "").Match("1")[0].ToInt())
                    v = 1 ^ CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 - CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 + CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 * CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 / CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 mod CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 \\ CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 >> CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 << CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v -= CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v += CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v *= CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v \\= CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v /= CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v <<= CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v >>= CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 < CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 <= CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 > CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 >= CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 = CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 <> CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 and CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    v = 1 or CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    if CreateObject("roRegex", "1", "").Match("1")[0].ToInt() > 0 then
                    end if
                    v = not CreateObject("roRegex", "1", "").Match("1")[0].ToInt() > 0
                    for i = 0 to CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                        print "for!"
                    end for
                    v = CreateObject("roRegex", "1", "")
                    v = {
                        name: CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    }
                    print 1; CreateObject("roRegex", "1", "").Match("1")[0].ToInt()
                    throw CreateObject("roRegex", "1", "").Match("1")[0]
                end sub
            `);
        });
    });
});
//# sourceMappingURL=RegexLiteralExpression.spec.js.map