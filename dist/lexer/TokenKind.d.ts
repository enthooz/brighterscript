export declare enum TokenKind {
    LeftParen = "LeftParen",
    RightParen = "RightParen",
    LeftSquareBracket = "LeftSquareBracket",
    RightSquareBracket = "RightSquareBracket",
    LeftCurlyBrace = "LeftCurlyBrace",
    RightCurlyBrace = "RightCurlyBrace",
    Caret = "Caret",
    Minus = "Minus",
    Plus = "Plus",
    Star = "Star",
    Forwardslash = "Forwardslash",
    Mod = "Mod",
    Backslash = "Backslash",
    PlusPlus = "PlusPlus",
    MinusMinus = "MinusMinus",
    LeftShift = "LeftShift",
    RightShift = "RightShift",
    MinusEqual = "MinusEqual",
    PlusEqual = "PlusEqual",
    StarEqual = "StarEqual",
    ForwardslashEqual = "ForwardslashEqual",
    BackslashEqual = "BackslashEqual",
    LeftShiftEqual = "LeftShiftEqual",
    RightShiftEqual = "RightShiftEqual",
    Less = "Less",
    LessEqual = "LessEqual",
    Greater = "Greater",
    GreaterEqual = "GreaterEqual",
    Equal = "Equal",
    LessGreater = "LessGreater",
    Identifier = "Identifier",
    StringLiteral = "StringLiteral",
    TemplateStringQuasi = "TemplateStringQuasi",
    TemplateStringExpressionBegin = "TemplateStringExpressionBegin",
    TemplateStringExpressionEnd = "TemplateStringExpressionEnd",
    IntegerLiteral = "IntegerLiteral",
    FloatLiteral = "FloatLiteral",
    DoubleLiteral = "DoubleLiteral",
    LongIntegerLiteral = "LongIntegerLiteral",
    EscapedCharCodeLiteral = "EscapedCharCodeLiteral",
    RegexLiteral = "RegexLiteral",
    Void = "Void",
    Boolean = "Boolean",
    Integer = "Integer",
    LongInteger = "LongInteger",
    Float = "Float",
    Double = "Double",
    String = "String",
    Object = "Object",
    Interface = "Interface",
    Invalid = "Invalid",
    Dynamic = "Dynamic",
    Dot = "Dot",
    Comma = "Comma",
    Colon = "Colon",
    Semicolon = "Semicolon",
    At = "At",
    Callfunc = "Callfunc",
    Question = "Question",
    QuestionQuestion = "QuestionQuestion",
    BackTick = "BackTick",
    QuestionDot = "QuestionDot",
    QuestionLeftSquare = "QuestionLeftSquare",
    QuestionLeftParen = "QuestionLeftParen",
    QuestionAt = "QuestionAt",
    HashIf = "HashIf",
    HashElseIf = "HashElseIf",
    HashElse = "HashElse",
    HashEndIf = "HashEndIf",
    HashConst = "HashConst",
    HashError = "HashError",
    HashErrorMessage = "HashErrorMessage",
    And = "And",
    Box = "Box",
    CreateObject = "CreateObject",
    Dim = "Dim",
    Each = "Each",
    Else = "Else",
    Then = "Then",
    End = "End",
    EndFunction = "EndFunction",
    EndFor = "EndFor",
    EndIf = "EndIf",
    EndSub = "EndSub",
    EndWhile = "EndWhile",
    Eval = "Eval",
    Exit = "Exit",
    ExitFor = "ExitFor",
    ExitWhile = "ExitWhile",
    False = "False",
    For = "For",
    ForEach = "ForEach",
    Function = "Function",
    GetGlobalAA = "GetGlobalAA",
    GetLastRunCompileError = "GetLastRunCompileError",
    GetLastRunRunTimeError = "GetLastRunRunTimeError",
    Goto = "Goto",
    If = "If",
    Let = "Let",
    Next = "Next",
    Not = "Not",
    ObjFun = "ObjFun",
    Or = "Or",
    Pos = "Pos",
    Print = "Print",
    Rem = "Rem",
    Return = "Return",
    Step = "Step",
    Stop = "Stop",
    Sub = "Sub",
    Tab = "Tab",
    To = "To",
    True = "True",
    Type = "Type",
    While = "While",
    Try = "Try",
    Catch = "Catch",
    EndTry = "EndTry",
    Throw = "Throw",
    Library = "Library",
    Dollar = "$",
    Class = "Class",
    EndClass = "EndClass",
    Namespace = "Namespace",
    EndNamespace = "EndNamespace",
    Enum = "Enum",
    EndEnum = "EndEnum",
    Public = "Public",
    Protected = "Protected",
    Private = "Private",
    As = "As",
    New = "New",
    Override = "Override",
    Import = "Import",
    EndInterface = "EndInterface",
    Const = "Const",
    Continue = "Continue",
    LineNumLiteral = "LineNumLiteral",
    SourceFilePathLiteral = "SourceFilePathLiteral",
    SourceLineNumLiteral = "SourceLineNumLiteral",
    FunctionNameLiteral = "FunctionNameLiteral",
    SourceFunctionNameLiteral = "SourceFunctionNameLiteral",
    SourceLocationLiteral = "SourceLocationLiteral",
    PkgPathLiteral = "PkgPathLiteral",
    PkgLocationLiteral = "PkgLocationLiteral",
    Comment = "Comment",
    Whitespace = "Whitespace",
    Newline = "Newline",
    Eof = "Eof"
}
/**
 * The set of all reserved words in the reference BrightScript runtime. These can't be used for any
 * other purpose within a BrightScript file.
 * @see https://sdkdocs.roku.com/display/sdkdoc/Reserved+Words
 */
export declare const ReservedWords: Set<string>;
/**
 * The set of keywords in the reference BrightScript runtime. Any of these that *are not* reserved
 * words can be used within a BrightScript file for other purposes, e.g. `tab`.
 *
 * Unfortunately there's no canonical source for this!
 */
export declare const Keywords: Record<string, TokenKind>;
/** Set of all keywords that end blocks. */
export declare type BlockTerminator = TokenKind.Else | TokenKind.EndFor | TokenKind.Next | TokenKind.EndIf | TokenKind.EndWhile | TokenKind.EndSub | TokenKind.EndFunction | TokenKind.EndNamespace | TokenKind.EndInterface | TokenKind.Catch | TokenKind.EndTry;
/** The set of operators valid for use in assignment statements. */
export declare const AssignmentOperators: TokenKind[];
export declare const CompoundAssignmentOperators: TokenKind[];
/** List of TokenKinds that are permitted as property names. */
export declare const AllowedProperties: TokenKind[];
/** List of TokenKind that are allowed as local var identifiers. */
export declare const AllowedLocalIdentifiers: TokenKind[];
export declare const BrighterScriptSourceLiterals: TokenKind[];
/**
 * List of string versions of TokenKind and various globals that are NOT allowed as local var identifiers.
 * Used to throw more helpful "you can't use a reserved word as an identifier" errors.
 */
export declare const DisallowedLocalIdentifiers: TokenKind[];
export declare const DisallowedLocalIdentifiersText: Set<string>;
/**
 * List of string versions of TokenKind and various globals that are NOT allowed as scope function names.
 * Used to throw more helpful "you can't use a reserved word as a function name" errors.
 */
export declare const DisallowedFunctionIdentifiers: TokenKind[];
export declare const DisallowedFunctionIdentifiersText: Set<string>;
/** List of TokenKind that are used as declared types on parameters/functions in Brightscript*/
export declare const DeclarableTypes: TokenKind[];
/**
 * The tokens that might preceed a regex literal
 */
export declare const PreceedingRegexTypes: Set<TokenKind>;
