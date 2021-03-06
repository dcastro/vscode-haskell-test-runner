import * as cp from 'child_process';
import { ChildProcess } from 'child_process';
import { InteroProxy, RawResponse } from './interoProxy';
import { Lazy } from './utils/lazy';
import { Map } from './utils/map';
import { allTypes, File } from './commands/allTypes';
import { Test } from './test';
import { reload } from './commands/reload';

export async function spawnIntero(targets: string[]): Promise<InteroSvc> {

  try {
    const opts = ['ghci', '--with-ghc', 'intero'].concat(targets);
    const ps = cp.spawn('stack', opts);

    const proxy = new InteroProxy(ps);
    const initRsp = await init(proxy);

    return new Intero(proxy, targets);
  } catch(ex) {
    console.log(`Failed to initialize intero for targets ${targets}: ${ex}`);
    return new InteroFailed(targets);
  }
}

async function init(intero: InteroProxy): Promise<RawResponse> {
  return await intero.sendRawRequest(':set prompt "\\4"');
}

export type InteroSvc = Intero | InteroFailed

export class Intero {
  public constructor(
    readonly proxy: InteroProxy,
    readonly targets: string[]
  ) {}

  readonly files = new Lazy<Promise<Map<File, Test[]>>>(() => {
    return allTypes(this.proxy);
  });

  async containsFile(filepath: string): Promise<boolean> {
    const files = await this.files.get;

    return files.some(ft => {
      const [file, tests] = ft;
      return file == filepath;
    });
  }

  async reload(): Promise<Intero> {

    // TODO: detect failure to reload, return `InteroFailed` instead (but proxy is still valid).
    await reload(this.proxy);

    return new Intero(this.proxy, this.targets);
  }
}


export class InteroFailed {
  public constructor(
    public readonly targets: string[]
  ) {}

  public async retry(): Promise<InteroSvc> {
    // TODO:
    throw new Error("not imp");
  }
}

