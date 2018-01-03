import { InteroProxy } from "./interoProxy";
import * as regex from './utils/regex';
import { Range, Position } from "vscode-languageserver";
import * as _ from 'lodash';
import { Lazy } from "./utils/lazy";

type File = string

export type Expression = {
  range: Range,
  type: string
}

type Pair<A, B> = [A, B]
type Map<K, V> = Pair<K, V>[]

// reg expressions in js are mutable (???) so we have to create a new one every time.
const pattern = () => /^([^:]+):\((\d+),(\d+)\)-\((\d+),(\d+)\): (.+)$/mg;

export async function allTypes(intero: InteroProxy): Promise<Map<File, Test[]>> {
  const rsp = await intero.sendRawRequest(':all-types');

  const matches = regex.extract(rsp.rawout, pattern());
  const fileExprs = parseFiles(matches);

  const fileTests = fileExprs.map(pair => {
    const [file, exprs] = pair;

    //TODO: avoid resorting expressions for the same file
    //nb: some files don't need sorting at all (i.e. if it doesnt contain any tests)
    
    const tests = exprs
      .map(e => exprToTest(e, exprs, file))
      .filter(t => t !== null);

    return <Pair<File, Test[]>> [file, tests];
  });

  return fileTests;
}

class Test {

  private otherExprs: Expression[] | null;

  constructor(
    readonly range: Range,
    readonly file: File,
    otherExprs: Expression[]
  ) {
    this.otherExprs = otherExprs;
  }

  readonly titleRange: Lazy<Range | null> = new Lazy(() => {
    const titleExpr = _(this.otherExprs)
      .filter(e => e.type == "[Char]")
      .sortBy([
        (e: Expression) => e.range.start.line,
        (e: Expression) => e.range.start.character
      ])
      .dropWhile(expr2 => isBefore(expr2.range.start, this.range.start))
      .head();

    if (titleExpr === undefined) {
      console.error(`Title not found for test in file '${this.file}' at: ${this.range}`);
      return null;
    }

    // we no longer need these
    this.otherExprs = null;

    return titleExpr.range;
  });

  // TODO:
  // public readonly title: Lazy<string>
}

function exprToTest(expr: Expression, others: Expression[], file: File): Test | null {
  if (expr.type !== "SpecM () ()") return null;

  return new Test(expr.range, file, others);
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
