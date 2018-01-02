import * as cp from 'child_process';
import * as cpUtils from './utils/childProcess';
import * as regex from './utils/regex';
import * as _ from 'lodash';

type Target = string
type PkgName = string
type Dependencies = string

export async function getTargets(root: string, directDepsScript: string): Promise<Target[][]> {
  // TODO: pass stackpath here with --stack-path
  const [err, stdout, stderr] = await cpUtils.exec_(`stack ${directDepsScript} ${root}`);

  if (err) return Promise.reject(err);
  if (stderr) return Promise.reject(stderr);

  const packages = JSON.parse(stdout);

  return _(packages)
    .flatMap(p => p.components)
    .filter(c => /^.+:test:.+$/mg.test(c.target))
    .filter(c => c.deps.includes('hspec'))
    .map(c => 
      c.dependsOnLib ? [c.target, getLibForTarget(c.target)] : [c.target]
    )
    .value();
}

/** Deduce the target for the library component of a test suite. E.g. `halive:test:unit` -> `halive:lib` */
function getLibForTarget(target: string): string {
  return regex
          .extract(target, /^(.+?):/mg)
          [0]   // get first match
          [1]   // get first capture group
          + ":lib";
}
