import { TextDocumentIdentifier } from "vscode-languageserver";

export function filepath(t: TextDocumentIdentifier): string { 
  return t.uri.replace("file://", "");
}