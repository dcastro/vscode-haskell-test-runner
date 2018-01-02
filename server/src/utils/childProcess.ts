import * as cp from 'child_process';

type Stderr = string;
type Stdout = string;

export function exec(dir: string, cmd: string): Promise<[Error, Stdout, Stderr]> {
  return new Promise((resolve, reject) => {
  
    const cwd = process.cwd();
    process.chdir(dir);

    cp.exec(cmd, (error, stdout, stderr) => resolve([error, stdout, stderr]));

    process.chdir(cwd);
  });
}

export function exec_(cmd: string): Promise<[Error, Stdout, Stderr]> {
  return new Promise((resolve, reject) => {
    cp.exec(cmd, (error, stdout, stderr) => resolve([error, stdout, stderr]));
  });
}