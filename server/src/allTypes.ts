import { InteroProxy } from "./interoProxy";
import * as regex from './utils/regex';
import { Range } from "vscode-languageserver";

export type File = {
  path: string,
  exprs: Expression[]
}

export type Expression = {
  range: Range,
  type: string
}

// reg expressions in js are mutable (???) so we have to create a new one every time.
const pattern = () => /^([^:]+):\((\d+),(\d+)\)-\((\d+),(\d+)\): (.+)$/mg;

export async function allTypes(intero: InteroProxy): Promise<File[]> {
  const rsp = await intero.sendRawRequest(':all-types');

  const matches = regex.extract(rsp.rawout, pattern());
  const files = parseFiles(matches);

  // TODO: transform Expression[] into Testp[]

  return files;
}

function parseFiles(matches: RegExpExecArray[]): File[] {

  const initialState: [File[], File] = [ [] , null ];

  const [files, _] = matches.reduce((state, match) => {
    let [files, currentFile] = state;

    if (currentFile === null || currentFile.path !== match[1]) {
      currentFile = {
        path: match[1],
        exprs: []
      };
      files.push(currentFile);
    }

    const exprType = match[6];
    if (exprType === '[Char]' || exprType === 'SpecM () ()') {
      currentFile.exprs.push({
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

    return <[File[], File]> [files, currentFile];
  }, initialState);

  return files;
}
