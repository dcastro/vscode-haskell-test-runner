
export function extract(text: string, r: RegExp): RegExpExecArray[] {
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = r.exec(text)) != null) {
      matches.push(match);
  }
  return matches;
}

