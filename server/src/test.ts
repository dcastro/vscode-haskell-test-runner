import { Position, TextDocument, Range } from "vscode-languageserver";
import { Lazy } from "./utils/lazy";
import { Expression, File } from "./commands/allTypes";
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

      /**
       * TODO:
       * handle strings spanning multiple lines
       * handle multiline \ \ strings
       * handle strings that are vars, e.g. describe someStringVar
       * handle strings with vars in between, e.g. "a" ++ b ++ "c"
       * 
       */

      const titleRange = this.titleRange.get

      if (titleRange == null)
        return null;
      
      return getText(t, titleRange);
    })
}

function isBefore(x: Position, y: Position): Boolean {
  if (x.line != y.line)
    return x.line < y.line;
  return x.character < x.character;
}

/** 
 * From: https://github.com/Microsoft/vscode-languageserver-node/blob/cad65160940993c2804452718d2085395274e97e/types/src/main.ts#L1622
 * Unreleased as of this moment.
 */
function getText(t: TextDocument, range: Range): string {
  let start = t.offsetAt(range.start);
  let end = t.offsetAt(range.end);
  return t.getText().substring(start, end);
}