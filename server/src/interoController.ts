import { InteroSvc, Intero } from "./intero";
import { CodeLens } from "vscode-languageserver";


export class InteroController {
  public constructor(
    public svcs: InteroSvc[]
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

  public async reloadSvcForFile(file: string): Promise<void> {
    const promises = this.svcs.map(async svc => {
      if (! (svc instanceof Intero))
        return svc;
  
      if (! await svc.containsFile(file))
        return svc;
  
      return await svc.reload();
    });

    this.svcs = await Promise.all(promises);
  }
}