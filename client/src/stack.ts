import { workspace } from 'vscode';
import * as cp from 'child_process';
import * as _ from 'lodash';

type Target = string
type PkgName = string
type Dependencies = string

export async function getTargets(): Promise<Target[][]> {

  const targetsAndPkg = await getTargetsAndPkg();

  const targets = await Promise.all(targetsAndPkg.map(async t => {
    const [target, pkgName] = t;
    const deps = await getDependencies(target);
    
    if ( ! /^hspec .*$/mg.test(deps))
      return [];

    if (new RegExp(`^${pkgName} .*$`, 'mg').test(deps))
      return [target, `${pkgName}:lib`];

    return [target];
  }).map(p => p.catch(error => {
    console.log('Could not get the dependencies for target.');
    console.log(JSON.stringify(error, null, 2));
    return [];
  })));

  return targets.filter(ts => ts.length > 0);
}

function getTargetsAndPkg(): Promise<[Target, PkgName][]> {

  return new Promise<[Target, PkgName][]>((resolve, reject) => {
  
    const cwd = process.cwd();
    process.chdir(workspace.rootPath);

    cp.exec(`stack ide targets`, (error, stdout, stderr) => {
      if (error) reject(error);
      if (!stderr) resolve([]);

      resolve(parseTargets(stderr));
    });

    process.chdir(cwd);
  });
}

function getDependencies(target: Target): Promise<Dependencies> {
  return new Promise((resolve, reject) => {

    const cwd = process.cwd();
    process.chdir(workspace.rootPath);

    cp.exec(`stack list-dependencies ${target} --depth 1`, (error, stdout, stderr) => {
      if (error) reject(error);
      // if (stderr) reject(stderr);

      resolve(stdout);
    });

    process.chdir(cwd);
  });
}

function parseTargets(text: string): [Target, PkgName][] {
  return extract(text, /^(.+):test:.+$/mg).map(m => <[Target, PkgName]> [m[0], m[1]]);
}

function extract(text: string, r: RegExp): RegExpExecArray[] {
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray;
  while ((match = r.exec(text)) != null) {
      matches.push(match);
  }
  return matches;
}

