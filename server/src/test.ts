import { Position, TextDocument, Range } from "vscode-languageserver";
import { Lazy } from "./utils/lazy";
import { Expression, File } from "./allTypes";
import * as _ from 'lodash';

export class Test {
  constructor(
    readonly range: Range,
    readonly file: File,
    readonly stringExprs: Lazy<Expression[]>
  ) {
    this.stringExprs = stringExprs;
  }

  readonly titleRange: Lazy<Range | null> = new Lazy(() => {
    const titleExpr =
      _(this.stringExprs.get)
        .dropWhile(expr2 => isBefore(expr2.range.start, this.range.start))
        .head();

    if (titleExpr === undefined) {
      console.error(`Title not found for test in file '${this.file}' at: ${this.range}`);
      return null;
    }

    return titleExpr.range;
  });

  readonly title: (t: TextDocument) => string | null =
    _.memoize((t: TextDocument) => {

      const lines = t.getText().split("\n");
      const titleRange = this.titleRange.get

      if (titleRange == null)
        return null;

      /**
       * TODO:
       * handle strings spanning multiple lines
       * handle multiline \ \ strings
       * handle strings that are vars, e.g. describe someStringVar
       * handle strings with vars in between, e.g. "a" ++ b ++ "c"
       * 
       */
      const matchingLines = lines.slice(titleRange.start.line - 1, titleRange.end.line)
    
      if (matchingLines.length !== 1) {
        return "N/A";
      }
      else {
        return matchingLines[0].substring(titleRange.start.character, titleRange.end.character -2);
      }
    })
}

function isBefore(x: Position, y: Position): Boolean {
  if (x.line != y.line)
    return x.line < y.line;
  return x.character < x.character;
}
