import * as cp from 'child_process';
import * as regex from './utils/regex';

type Target = string
type PkgName = string
type Dependencies = string

export async function getTargets(root: string): Promise<Target[][]> {

  const targetsAndPkg = await getTargetsAndPkg(root);

  const targets = await Promise.all(targetsAndPkg.map(async t => {
    const [target, pkgName] = t;
    const deps = await getDependencies(root, target);
    
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

function getTargetsAndPkg(root: string): Promise<[Target, PkgName][]> {

  return new Promise<[Target, PkgName][]>((resolve, reject) => {
  
    const cwd = process.cwd();
    process.chdir(root);

    cp.exec(`stack ide targets`, (error, stdout, stderr) => {
      if (error) reject(error);
      if (!stderr) resolve([]);

      resolve(parseTargets(stderr));
    });

    process.chdir(cwd);
  });
}

function getDependencies(root: string, target: Target): Promise<Dependencies> {
  return new Promise((resolve, reject) => {

    const cwd = process.cwd();
    process.chdir(root);

    cp.exec(`stack list-dependencies ${target} --depth 1`, (error, stdout, stderr) => {
      if (error) reject(error);
      // if (stderr) reject(stderr);

      resolve(stdout);
    });

    process.chdir(cwd);
  });
}

function parseTargets(text: string): [Target, PkgName][] {
  return regex.extract(text, /^(.+):test:.+$/mg).map(m => <[Target, PkgName]> [m[0], m[1]]);
}
