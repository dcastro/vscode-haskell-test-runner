import { InteroProxy } from "./interoProxy";
import * as regex from './utils/regex';
import { Range } from "vscode-languageserver";
import * as _ from 'lodash';

type File = string

export type Expression = {
  range: Range,
  type: string
}

type Test = {
  s: string
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
    
    const tests = exprs
      .map(e => exprToTest(e, exprs))
      .filter(t => t !== null);

    return <Pair<File, Test[]>> [file, tests];
  });

  return fileTests;
}

function exprToTest(expr: Expression, others: Expression[]): Test | null {
  if (expr.type !== "SpecM () ()") return null;

  //TODO:
  return null;
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
