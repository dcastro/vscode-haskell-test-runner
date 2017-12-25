import { InteroSvc } from "./intero";
import { CodeLens } from "vscode-languageserver";


export class InteroController {
  public constructor(
    private readonly svcs: InteroSvc[]
  ) { }


  public async codeLenses(file: string): Promise<CodeLens[]> {

    await Promise.all(this.svcs.map(x => x.allTypes()));
    return [];
  }
}