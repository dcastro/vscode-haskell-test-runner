import * as cp from 'child_process';
import { ChildProcess } from 'child_process';
import { InteroProxy, RawResponse } from './interoProxy';

export async function spawnIntero(targets: string[]): Promise<InteroSvc> {
  const opts = ['ghci', '--with-ghc', 'intero'].concat(targets);
  const ps = cp.spawn('stack', opts);

  const proxy = new InteroProxy(ps);
  const initRsp = await init(proxy);

  return new InteroSvc(proxy, targets);
}

async function init(intero: InteroProxy): Promise<RawResponse> {
  return await intero.sendRawRequest(':set prompt "\\4"');
}

export class InteroSvc {
  public constructor(
    private readonly proxy: InteroProxy,
    public  readonly targets: string[]
  ) {}

  public async allTypes(): Promise<string> {
    const rsp = await this.proxy.sendRawRequest(':all-types');

    const lines = rsp.rawout.split("\n");

    console.log(JSON.stringify(lines.slice(0, 3), null, 2));

    return rsp.rawout;
  }
}
