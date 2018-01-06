import { InteroSvc } from "./intero";
import { CodeLens } from "vscode-languageserver";


export class InteroController {
  public constructor(
    readonly svcs: InteroSvc[]
  ) { }


  public async codeLenses(file: string): Promise<CodeLens[]> {

    // TODO:
    return [];
  }

  /**
   * Assumes each file belongs to one target only
   */
  public async findTarget(file: string): Promise<string> {
    // TODO:
    throw new Error("not implemented");
  }
}