import { CodeLensProvider, CancellationToken, TextDocument, CodeLens, EventEmitter, Range, Position } from "vscode";
import { Event, LanguageClient, CodeLensRequest, ExecuteCommandParams, ExecuteCommandRequest, CodeLensParams, CodeLensRegistrationOptions } from "vscode-languageclient";

export class TestCodeLensProvider implements CodeLensProvider {

  constructor(
    readonly client: LanguageClient
  ) { }
  
  readonly onDidChangeCodeLensesEmitter = new EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  async provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {

    const args = { textDocument: { uri: document.uri.toString() } };
    
    const lenses = await this.client.sendRequest(CodeLensRequest.type, args);


    return lenses.map(l => {
      const range = new Range(
        new Position(l.range.start.line, l.range.start.character),
        new Position(l.range.end.line, l.range.end.character)
      );
      return new CodeLens(range, l.command);
    });
  }
}