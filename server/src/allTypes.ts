import { InteroProxy } from "./interoProxy";
import * as regex from './utils/regex';
import { Range, Position } from "vscode-languageserver";
import * as _ from 'lodash';
import { Lazy } from "./utils/lazy";

export type File = string

export type Expression = {
  range: Range,
  type: string
}

export type Pair<A, B> = [A, B]
export type Map<K, V> = Pair<K, V>[]

// reg expressions in js are mutable (???) so we have to create a new one every time.
const pattern = () => /^([^:]+):\((\d+),(\d+)\)-\((\d+),(\d+)\): (.+)$/mg;

export async function allTypes(intero: InteroProxy): Promise<Map<File, Test[]>> {
  const rsp = await intero.sendRawRequest(':all-types');

  const matches = regex.extract(rsp.rawout, pattern());
  const fileExprs = parseFiles(matches);

  const fileTests = fileExprs.map(pair => {
    const [file, exprs] = pair;

    // lazy, so we don't sort the string expressions twice for multiple `Test`s in the same file
    // also, if the file contains no tests, then `sortedStringExprs` won't be evaluated at all
    const sortedStringExprs = new Lazy<Expression[]>(() =>{
      return _(exprs)
        .filter(e => e.type === "[Char]")
        .sortBy([
          (e: Expression) => e.range.start.line,
          (e: Expression) => e.range.start.character
        ])
        .value()
    });
    
    const tests = exprs
      .filter(e => e.type === "SpecM () ()")
      .map(e => new Test(e.range, file, sortedStringExprs))

    return <Pair<File, Test[]>> [file, tests];
  });

  return fileTests;
}

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

  // TODO:
  // public readonly title: Lazy<string>
}

function isBefore(x: Position, y: Position): Boolean {
  if (x.line != y.line)
    return x.line < y.line;
  return x.character < x.character;
}

function parseFiles(matches: RegExpExecArray[]): Map<File, Expression[]> {
  type State = {
    map: Map<File, Expression[]>,
    current: Current | null
  }

  type Current = {
    file: File
    exprs: Expression[]
  }

  const initialState: State = {
    map: [],
    current: null
  }

  const finalState = matches.reduce((state, match) => {
    if (state.current === null || state.current.file !== match[1]) {
      state.current = { file: match[1], exprs: [] };
      state.map.push([state.current.file, state.current.exprs]);
    }

    const currentFile = state.current.file;
    const currentExprs = state.current.exprs;

    const exprType = match[6];
    if (exprType === '[Char]' || exprType === 'SpecM () ()') {
      currentExprs.push({
        range: {
          start: {
            line: parseInt(match[2]),         // TODO: adjust 0-based to 1-based here
            character: parseInt(match[3])
          },
          end: {
            line: parseInt(match[4]),
            character: parseInt(match[5])
          } 
        },
        type: match[6]
      });
    }

    return state;
  }, initialState);

  return finalState.map;
}
