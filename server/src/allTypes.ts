import { InteroProxy } from "./interoProxy";
import * as regex from './utils/regex';
import { Range, Position, TextDocument } from "vscode-languageserver";
import * as _ from 'lodash';
import { Lazy } from "./utils/lazy";
import {Pair, Map} from "./utils/map";
import { Test } from "./test";

export type File = string

export type Expression = {
  range: Range,
  type: string
}

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
            line: parseInt(match[2]) - 1, // Intero's ranges are 1-based, and typescript's are 0-based
            character: parseInt(match[3]) // TODO: do we need to subtract 1 from character index as well?
          },
          end: {
            line: parseInt(match[4]) - 1,
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
