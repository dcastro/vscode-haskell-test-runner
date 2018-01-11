import { CodeLens, Range, Command } from "vscode-languageserver";

export class TestCodeLens implements CodeLens {
  readonly command: Command;

  constructor(
    readonly range: Range,
    title: string
  ) { 
    this.command = {
      title: title,
      command: ""
    };
  }

}