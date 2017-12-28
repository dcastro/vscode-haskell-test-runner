
export function extract(text: string, r: RegExp): RegExpExecArray[] {
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray;
  while ((match = r.exec(text)) != null) {
      matches.push(match);
  }
  return matches;
}

