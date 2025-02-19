"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreceedingRegexTypes = exports.DeclarableTypes = exports.DisallowedFunctionIdentifiersText = exports.DisallowedFunctionIdentifiers = exports.DisallowedLocalIdentifiersText = exports.DisallowedLocalIdentifiers = exports.BrighterScriptSourceLiterals = exports.AllowedLocalIdentifiers = exports.AllowedProperties = exports.CompoundAssignmentOperators = exports.AssignmentOperators = exports.Keywords = exports.ReservedWords = exports.TokenKind = void 0;
var TokenKind;
(function (TokenKind) {
    // parens (and friends)
    TokenKind["LeftParen"] = "LeftParen";
    TokenKind["RightParen"] = "RightParen";
    TokenKind["LeftSquareBracket"] = "LeftSquareBracket";
    TokenKind["RightSquareBracket"] = "RightSquareBracket";
    TokenKind["LeftCurlyBrace"] = "LeftCurlyBrace";
    TokenKind["RightCurlyBrace"] = "RightCurlyBrace";
    // operators
    TokenKind["Caret"] = "Caret";
    TokenKind["Minus"] = "Minus";
    TokenKind["Plus"] = "Plus";
    TokenKind["Star"] = "Star";
    TokenKind["Forwardslash"] = "Forwardslash";
    TokenKind["Mod"] = "Mod";
    TokenKind["Backslash"] = "Backslash";
    // postfix operators
    TokenKind["PlusPlus"] = "PlusPlus";
    TokenKind["MinusMinus"] = "MinusMinus";
    // bitshift
    TokenKind["LeftShift"] = "LeftShift";
    TokenKind["RightShift"] = "RightShift";
    // assignment operators
    TokenKind["MinusEqual"] = "MinusEqual";
    TokenKind["PlusEqual"] = "PlusEqual";
    TokenKind["StarEqual"] = "StarEqual";
    TokenKind["ForwardslashEqual"] = "ForwardslashEqual";
    TokenKind["BackslashEqual"] = "BackslashEqual";
    TokenKind["LeftShiftEqual"] = "LeftShiftEqual";
    TokenKind["RightShiftEqual"] = "RightShiftEqual";
    // comparators
    TokenKind["Less"] = "Less";
    TokenKind["LessEqual"] = "LessEqual";
    TokenKind["Greater"] = "Greater";
    TokenKind["GreaterEqual"] = "GreaterEqual";
    TokenKind["Equal"] = "Equal";
    TokenKind["LessGreater"] = "LessGreater";
    // literals
    TokenKind["Identifier"] = "Identifier";
    TokenKind["StringLiteral"] = "StringLiteral";
    TokenKind["TemplateStringQuasi"] = "TemplateStringQuasi";
    TokenKind["TemplateStringExpressionBegin"] = "TemplateStringExpressionBegin";
    TokenKind["TemplateStringExpressionEnd"] = "TemplateStringExpressionEnd";
    TokenKind["IntegerLiteral"] = "IntegerLiteral";
    TokenKind["FloatLiteral"] = "FloatLiteral";
    TokenKind["DoubleLiteral"] = "DoubleLiteral";
    TokenKind["LongIntegerLiteral"] = "LongIntegerLiteral";
    TokenKind["EscapedCharCodeLiteral"] = "EscapedCharCodeLiteral";
    TokenKind["RegexLiteral"] = "RegexLiteral";
    //types
    TokenKind["Void"] = "Void";
    TokenKind["Boolean"] = "Boolean";
    TokenKind["Integer"] = "Integer";
    TokenKind["LongInteger"] = "LongInteger";
    TokenKind["Float"] = "Float";
    TokenKind["Double"] = "Double";
    TokenKind["String"] = "String";
    TokenKind["Object"] = "Object";
    TokenKind["Interface"] = "Interface";
    TokenKind["Invalid"] = "Invalid";
    TokenKind["Dynamic"] = "Dynamic";
    // other symbols
    TokenKind["Dot"] = "Dot";
    TokenKind["Comma"] = "Comma";
    TokenKind["Colon"] = "Colon";
    TokenKind["Semicolon"] = "Semicolon";
    TokenKind["At"] = "At";
    TokenKind["Callfunc"] = "Callfunc";
    TokenKind["Question"] = "Question";
    TokenKind["QuestionQuestion"] = "QuestionQuestion";
    TokenKind["BackTick"] = "BackTick";
    TokenKind["QuestionDot"] = "QuestionDot";
    TokenKind["QuestionLeftSquare"] = "QuestionLeftSquare";
    TokenKind["QuestionLeftParen"] = "QuestionLeftParen";
    TokenKind["QuestionAt"] = "QuestionAt";
    // conditional compilation
    TokenKind["HashIf"] = "HashIf";
    TokenKind["HashElseIf"] = "HashElseIf";
    TokenKind["HashElse"] = "HashElse";
    TokenKind["HashEndIf"] = "HashEndIf";
    TokenKind["HashConst"] = "HashConst";
    TokenKind["HashError"] = "HashError";
    TokenKind["HashErrorMessage"] = "HashErrorMessage";
    // keywords
    // canonical source: https://sdkdocs.roku.com/display/sdkdoc/Reserved+Words
    TokenKind["And"] = "And";
    TokenKind["Box"] = "Box";
    TokenKind["CreateObject"] = "CreateObject";
    TokenKind["Dim"] = "Dim";
    TokenKind["Each"] = "Each";
    TokenKind["Else"] = "Else";
    TokenKind["Then"] = "Then";
    TokenKind["End"] = "End";
    TokenKind["EndFunction"] = "EndFunction";
    TokenKind["EndFor"] = "EndFor";
    TokenKind["EndIf"] = "EndIf";
    TokenKind["EndSub"] = "EndSub";
    TokenKind["EndWhile"] = "EndWhile";
    TokenKind["Eval"] = "Eval";
    TokenKind["Exit"] = "Exit";
    TokenKind["ExitFor"] = "ExitFor";
    TokenKind["ExitWhile"] = "ExitWhile";
    TokenKind["False"] = "False";
    TokenKind["For"] = "For";
    TokenKind["ForEach"] = "ForEach";
    TokenKind["Function"] = "Function";
    TokenKind["GetGlobalAA"] = "GetGlobalAA";
    TokenKind["GetLastRunCompileError"] = "GetLastRunCompileError";
    TokenKind["GetLastRunRunTimeError"] = "GetLastRunRunTimeError";
    TokenKind["Goto"] = "Goto";
    TokenKind["If"] = "If";
    TokenKind["Let"] = "Let";
    TokenKind["Next"] = "Next";
    TokenKind["Not"] = "Not";
    TokenKind["ObjFun"] = "ObjFun";
    TokenKind["Or"] = "Or";
    TokenKind["Pos"] = "Pos";
    TokenKind["Print"] = "Print";
    TokenKind["Rem"] = "Rem";
    TokenKind["Return"] = "Return";
    TokenKind["Step"] = "Step";
    TokenKind["Stop"] = "Stop";
    TokenKind["Sub"] = "Sub";
    TokenKind["Tab"] = "Tab";
    TokenKind["To"] = "To";
    TokenKind["True"] = "True";
    TokenKind["Type"] = "Type";
    TokenKind["While"] = "While";
    TokenKind["Try"] = "Try";
    TokenKind["Catch"] = "Catch";
    TokenKind["EndTry"] = "EndTry";
    TokenKind["Throw"] = "Throw";
    //misc
    TokenKind["Library"] = "Library";
    TokenKind["Dollar"] = "$";
    //brighterscript keywords
    TokenKind["Class"] = "Class";
    TokenKind["EndClass"] = "EndClass";
    TokenKind["Namespace"] = "Namespace";
    TokenKind["EndNamespace"] = "EndNamespace";
    TokenKind["Enum"] = "Enum";
    TokenKind["EndEnum"] = "EndEnum";
    TokenKind["Public"] = "Public";
    TokenKind["Protected"] = "Protected";
    TokenKind["Private"] = "Private";
    TokenKind["As"] = "As";
    TokenKind["New"] = "New";
    TokenKind["Override"] = "Override";
    TokenKind["Import"] = "Import";
    TokenKind["EndInterface"] = "EndInterface";
    TokenKind["Const"] = "Const";
    TokenKind["Continue"] = "Continue";
    //brighterscript source literals
    TokenKind["LineNumLiteral"] = "LineNumLiteral";
    TokenKind["SourceFilePathLiteral"] = "SourceFilePathLiteral";
    TokenKind["SourceLineNumLiteral"] = "SourceLineNumLiteral";
    TokenKind["FunctionNameLiteral"] = "FunctionNameLiteral";
    TokenKind["SourceFunctionNameLiteral"] = "SourceFunctionNameLiteral";
    TokenKind["SourceLocationLiteral"] = "SourceLocationLiteral";
    TokenKind["PkgPathLiteral"] = "PkgPathLiteral";
    TokenKind["PkgLocationLiteral"] = "PkgLocationLiteral";
    //comments
    TokenKind["Comment"] = "Comment";
    // structural
    TokenKind["Whitespace"] = "Whitespace";
    TokenKind["Newline"] = "Newline";
    TokenKind["Eof"] = "Eof";
})(TokenKind = exports.TokenKind || (exports.TokenKind = {}));
/**
 * The set of all reserved words in the reference BrightScript runtime. These can't be used for any
 * other purpose within a BrightScript file.
 * @see https://sdkdocs.roku.com/display/sdkdoc/Reserved+Words
 */
exports.ReservedWords = new Set([
    'and',
    'box',
    'createobject',
    'dim',
    'each',
    'else',
    'endsub',
    'endwhile',
    'eval',
    'exit',
    'exitwhile',
    'false',
    'for',
    'function',
    'getglobalaa',
    'getlastruncompileerror',
    'getlastrunruntimeerror',
    'goto',
    'if',
    'invalid',
    'let',
    'next',
    'not',
    'objfun',
    'or',
    'pos',
    'print',
    'rem',
    'return',
    'run',
    'step',
    'stop',
    'sub',
    'tab',
    'then',
    'throw',
    'to',
    'true',
    'type',
    'while'
]);
/**
 * The set of keywords in the reference BrightScript runtime. Any of these that *are not* reserved
 * words can be used within a BrightScript file for other purposes, e.g. `tab`.
 *
 * Unfortunately there's no canonical source for this!
 */
exports.Keywords = {
    as: TokenKind.As,
    and: TokenKind.And,
    continue: TokenKind.Continue,
    dim: TokenKind.Dim,
    end: TokenKind.End,
    then: TokenKind.Then,
    else: TokenKind.Else,
    void: TokenKind.Void,
    boolean: TokenKind.Boolean,
    integer: TokenKind.Integer,
    longinteger: TokenKind.LongInteger,
    float: TokenKind.Float,
    double: TokenKind.Double,
    string: TokenKind.String,
    object: TokenKind.Object,
    interface: TokenKind.Interface,
    dynamic: TokenKind.Dynamic,
    endfor: TokenKind.EndFor,
    'end for': TokenKind.EndFor,
    endfunction: TokenKind.EndFunction,
    'end function': TokenKind.EndFunction,
    endif: TokenKind.EndIf,
    'end if': TokenKind.EndIf,
    endsub: TokenKind.EndSub,
    'end sub': TokenKind.EndSub,
    endwhile: TokenKind.EndWhile,
    'end while': TokenKind.EndWhile,
    exit: TokenKind.Exit,
    'exit for': TokenKind.ExitFor,
    exitwhile: TokenKind.ExitWhile,
    'exit while': TokenKind.ExitWhile,
    false: TokenKind.False,
    for: TokenKind.For,
    'for each': TokenKind.ForEach,
    function: TokenKind.Function,
    goto: TokenKind.Goto,
    if: TokenKind.If,
    invalid: TokenKind.Invalid,
    let: TokenKind.Let,
    mod: TokenKind.Mod,
    next: TokenKind.Next,
    not: TokenKind.Not,
    or: TokenKind.Or,
    print: TokenKind.Print,
    rem: TokenKind.Rem,
    return: TokenKind.Return,
    step: TokenKind.Step,
    stop: TokenKind.Stop,
    sub: TokenKind.Sub,
    to: TokenKind.To,
    true: TokenKind.True,
    while: TokenKind.While,
    library: TokenKind.Library,
    class: TokenKind.Class,
    endclass: TokenKind.EndClass,
    'end class': TokenKind.EndClass,
    enum: TokenKind.Enum,
    endenum: TokenKind.EndEnum,
    'end enum': TokenKind.EndEnum,
    public: TokenKind.Public,
    protected: TokenKind.Protected,
    private: TokenKind.Private,
    new: TokenKind.New,
    override: TokenKind.Override,
    namespace: TokenKind.Namespace,
    endnamespace: TokenKind.EndNamespace,
    'end namespace': TokenKind.EndNamespace,
    import: TokenKind.Import,
    'line_num': TokenKind.LineNumLiteral,
    'source_file_path': TokenKind.SourceFilePathLiteral,
    'source_line_num': TokenKind.SourceLineNumLiteral,
    'function_name': TokenKind.FunctionNameLiteral,
    'source_function_name': TokenKind.SourceFunctionNameLiteral,
    'source_location': TokenKind.SourceLocationLiteral,
    'pkg_path': TokenKind.PkgPathLiteral,
    'pkg_location': TokenKind.PkgLocationLiteral,
    try: TokenKind.Try,
    catch: TokenKind.Catch,
    endtry: TokenKind.EndTry,
    'end try': TokenKind.EndTry,
    throw: TokenKind.Throw,
    'end interface': TokenKind.EndInterface,
    endinterface: TokenKind.EndInterface,
    const: TokenKind.Const
};
//hide the constructor prototype method because it causes issues
exports.Keywords.constructor = undefined;
/** The set of operators valid for use in assignment statements. */
exports.AssignmentOperators = [
    TokenKind.Equal,
    TokenKind.MinusEqual,
    TokenKind.PlusEqual,
    TokenKind.StarEqual,
    TokenKind.ForwardslashEqual,
    TokenKind.BackslashEqual,
    TokenKind.LeftShiftEqual,
    TokenKind.RightShiftEqual
];
exports.CompoundAssignmentOperators = [
    TokenKind.MinusEqual,
    TokenKind.PlusEqual,
    TokenKind.StarEqual,
    TokenKind.ForwardslashEqual,
    TokenKind.BackslashEqual,
    TokenKind.LeftShiftEqual,
    TokenKind.RightShiftEqual
];
/** List of TokenKinds that are permitted as property names. */
exports.AllowedProperties = [
    TokenKind.As,
    TokenKind.And,
    TokenKind.Box,
    TokenKind.CreateObject,
    TokenKind.Dim,
    TokenKind.Then,
    TokenKind.Else,
    TokenKind.End,
    TokenKind.EndFunction,
    TokenKind.EndFor,
    TokenKind.EndIf,
    TokenKind.EndSub,
    TokenKind.EndWhile,
    TokenKind.Eval,
    TokenKind.Exit,
    TokenKind.ExitFor,
    TokenKind.ExitWhile,
    TokenKind.False,
    TokenKind.For,
    TokenKind.ForEach,
    TokenKind.Function,
    TokenKind.GetGlobalAA,
    TokenKind.GetLastRunCompileError,
    TokenKind.GetLastRunRunTimeError,
    TokenKind.Goto,
    TokenKind.If,
    TokenKind.Invalid,
    TokenKind.Let,
    TokenKind.Mod,
    TokenKind.Next,
    TokenKind.Not,
    TokenKind.ObjFun,
    TokenKind.Or,
    TokenKind.Pos,
    TokenKind.Print,
    TokenKind.Rem,
    TokenKind.Return,
    TokenKind.Step,
    TokenKind.Stop,
    TokenKind.Sub,
    TokenKind.Tab,
    TokenKind.To,
    TokenKind.True,
    TokenKind.Type,
    TokenKind.While,
    TokenKind.Library,
    TokenKind.Void,
    TokenKind.Boolean,
    TokenKind.Integer,
    TokenKind.LongInteger,
    TokenKind.Float,
    TokenKind.Double,
    TokenKind.String,
    TokenKind.Object,
    TokenKind.Interface,
    TokenKind.Dynamic,
    TokenKind.Void,
    TokenKind.As,
    TokenKind.Public,
    TokenKind.Protected,
    TokenKind.Private,
    TokenKind.Class,
    TokenKind.New,
    TokenKind.Override,
    TokenKind.Namespace,
    TokenKind.EndNamespace,
    TokenKind.Import,
    TokenKind.LineNumLiteral,
    TokenKind.SourceFilePathLiteral,
    TokenKind.SourceLineNumLiteral,
    TokenKind.FunctionNameLiteral,
    TokenKind.SourceFunctionNameLiteral,
    TokenKind.SourceLocationLiteral,
    TokenKind.PkgPathLiteral,
    TokenKind.PkgLocationLiteral,
    TokenKind.Try,
    TokenKind.Catch,
    TokenKind.EndTry,
    TokenKind.Throw,
    TokenKind.EndInterface,
    TokenKind.Const,
    TokenKind.Continue
];
/** List of TokenKind that are allowed as local var identifiers. */
exports.AllowedLocalIdentifiers = [
    TokenKind.EndFor,
    TokenKind.ExitFor,
    TokenKind.ForEach,
    TokenKind.Void,
    TokenKind.Boolean,
    TokenKind.Integer,
    TokenKind.LongInteger,
    TokenKind.Float,
    TokenKind.Double,
    TokenKind.String,
    TokenKind.Object,
    TokenKind.Interface,
    TokenKind.Dynamic,
    TokenKind.Void,
    TokenKind.As,
    TokenKind.Library,
    TokenKind.Public,
    TokenKind.Protected,
    TokenKind.Private,
    TokenKind.Class,
    TokenKind.New,
    TokenKind.Override,
    TokenKind.Namespace,
    TokenKind.EndNamespace,
    TokenKind.Import,
    TokenKind.Try,
    TokenKind.Catch,
    TokenKind.EndTry,
    TokenKind.Const,
    TokenKind.Continue
];
exports.BrighterScriptSourceLiterals = [
    TokenKind.SourceFilePathLiteral,
    TokenKind.SourceLineNumLiteral,
    TokenKind.FunctionNameLiteral,
    TokenKind.SourceFunctionNameLiteral,
    TokenKind.SourceLocationLiteral,
    TokenKind.PkgPathLiteral,
    TokenKind.PkgLocationLiteral
];
/**
 * List of string versions of TokenKind and various globals that are NOT allowed as local var identifiers.
 * Used to throw more helpful "you can't use a reserved word as an identifier" errors.
 */
exports.DisallowedLocalIdentifiers = [
    TokenKind.And,
    TokenKind.Box,
    TokenKind.CreateObject,
    TokenKind.Dim,
    TokenKind.Each,
    TokenKind.Else,
    TokenKind.End,
    TokenKind.EndFunction,
    TokenKind.EndIf,
    TokenKind.EndSub,
    TokenKind.EndWhile,
    TokenKind.Eval,
    TokenKind.Exit,
    TokenKind.ExitWhile,
    TokenKind.False,
    TokenKind.For,
    TokenKind.Function,
    TokenKind.GetGlobalAA,
    TokenKind.GetLastRunCompileError,
    TokenKind.GetLastRunRunTimeError,
    TokenKind.Goto,
    TokenKind.If,
    TokenKind.Invalid,
    TokenKind.Let,
    TokenKind.Next,
    TokenKind.Not,
    TokenKind.ObjFun,
    TokenKind.Or,
    TokenKind.Pos,
    TokenKind.Print,
    //technically you aren't allowed to make a local var for Rem, but it's a comment so that'll never actually cause a compile error
    TokenKind.Rem,
    TokenKind.Return,
    TokenKind.Step,
    TokenKind.Sub,
    TokenKind.Tab,
    TokenKind.Then,
    TokenKind.To,
    TokenKind.True,
    TokenKind.Type,
    TokenKind.While,
    TokenKind.LineNumLiteral,
    TokenKind.SourceFilePathLiteral,
    TokenKind.SourceLineNumLiteral,
    TokenKind.FunctionNameLiteral,
    TokenKind.SourceFunctionNameLiteral,
    TokenKind.SourceLocationLiteral,
    TokenKind.PkgPathLiteral,
    TokenKind.PkgLocationLiteral,
    TokenKind.Throw
];
exports.DisallowedLocalIdentifiersText = new Set([
    'run',
    ...exports.DisallowedLocalIdentifiers.map(x => x.toLowerCase())
]);
/**
 * List of string versions of TokenKind and various globals that are NOT allowed as scope function names.
 * Used to throw more helpful "you can't use a reserved word as a function name" errors.
 */
exports.DisallowedFunctionIdentifiers = [
    TokenKind.And,
    TokenKind.CreateObject,
    TokenKind.Dim,
    TokenKind.Each,
    TokenKind.Else,
    TokenKind.End,
    TokenKind.EndFunction,
    TokenKind.EndIf,
    TokenKind.EndSub,
    TokenKind.EndWhile,
    TokenKind.Exit,
    TokenKind.ExitWhile,
    TokenKind.False,
    TokenKind.For,
    TokenKind.Function,
    TokenKind.Goto,
    TokenKind.If,
    TokenKind.Invalid,
    TokenKind.Let,
    TokenKind.Next,
    TokenKind.Not,
    TokenKind.ObjFun,
    TokenKind.Or,
    TokenKind.Print,
    TokenKind.Rem,
    TokenKind.Return,
    TokenKind.Step,
    TokenKind.Sub,
    TokenKind.Tab,
    TokenKind.Then,
    TokenKind.To,
    TokenKind.True,
    TokenKind.Type,
    TokenKind.While,
    TokenKind.Throw
];
exports.DisallowedFunctionIdentifiersText = new Set([
    'run',
    ...exports.DisallowedFunctionIdentifiers.map(x => x.toLowerCase())
]);
/** List of TokenKind that are used as declared types on parameters/functions in Brightscript*/
exports.DeclarableTypes = [
    TokenKind.Boolean,
    TokenKind.Integer,
    TokenKind.LongInteger,
    TokenKind.Float,
    TokenKind.Double,
    TokenKind.String,
    TokenKind.Object,
    TokenKind.Interface,
    TokenKind.Dynamic,
    TokenKind.Void,
    TokenKind.Function
];
/**
 * The tokens that might preceed a regex literal
 */
exports.PreceedingRegexTypes = new Set([
    TokenKind.Print,
    TokenKind.Question,
    TokenKind.QuestionQuestion,
    TokenKind.LeftSquareBracket,
    TokenKind.LeftParen,
    TokenKind.LeftCurlyBrace,
    TokenKind.Caret,
    TokenKind.Minus,
    TokenKind.Plus,
    TokenKind.Star,
    TokenKind.Forwardslash,
    TokenKind.Mod,
    TokenKind.Backslash,
    TokenKind.LeftShift,
    TokenKind.RightShift,
    TokenKind.MinusEqual,
    TokenKind.PlusEqual,
    TokenKind.StarEqual,
    TokenKind.ForwardslashEqual,
    TokenKind.BackslashEqual,
    TokenKind.LeftShiftEqual,
    TokenKind.RightShiftEqual,
    TokenKind.Less,
    TokenKind.LessEqual,
    TokenKind.Greater,
    TokenKind.GreaterEqual,
    TokenKind.Equal,
    TokenKind.LessGreater,
    TokenKind.And,
    TokenKind.Or,
    TokenKind.If,
    TokenKind.Not,
    TokenKind.To,
    TokenKind.Newline,
    TokenKind.Throw,
    TokenKind.Throw,
    TokenKind.Colon,
    TokenKind.Semicolon
]);
//# sourceMappingURL=TokenKind.js.map