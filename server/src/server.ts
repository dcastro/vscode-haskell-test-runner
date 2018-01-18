/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments, TextDocument, 
	Diagnostic, DiagnosticSeverity, InitializeResult, TextDocumentPositionParams, CompletionItem, 
	CompletionItemKind,
	CodeLensParams,
	CancellationToken,
	InitializeError,
	ResponseError,
	InitializeRequest,
	TextDocumentChangeEvent,
	DidChangeTextDocumentParams,
	WillSaveTextDocumentParams,
	TextDocumentSyncKind,
	CodeLensRequest,
	CodeLensRegistrationOptions,
	CodeLens,
	ExecuteCommandRequest
} from 'vscode-languageserver';
import * as stack from './stack';
import { InteroSvc, spawnIntero, Intero } from './intero';
import { spawn } from 'child_process';
import { InteroController } from './interoController';
import { TestCodeLens } from './testCodeLens';
import { filepath } from './utils/textDocumentExt';

// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

let intero: InteroController;

// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities. 
let workspaceRoot: string;
connection.onInitialize((params): Promise<InitializeResult> | ResponseError<InitializeError> => {
	if (!params.rootPath) 
		return new ResponseError(1, "No folder is open. Haskell Test Runner can only run in the context of a stack project.");

	workspaceRoot = params.rootPath;
	const directDepsScript = params.initializationOptions.directDepsScript

	return stack.getTargets(workspaceRoot, directDepsScript).then(async targets => {
		console.log('Initializing targets:');
		targets.map(x => console.log(x));

		const svcs = await Promise.all(targets.map(spawnIntero));

		intero = new InteroController(svcs);
		
		console.log('Initialization done');

		return {
			capabilities: {
				// Tell the client that the server works in FULL text document sync mode
				textDocumentSync: documents.syncKind,
				// Tell the client that the server support code complete
				completionProvider: {
					resolveProvider: true
				}
			}
		}
	});
});

connection.onCodeLens(async (ps: CodeLensParams) => {

	const uri = ps.textDocument.uri;
	const path = filepath(ps.textDocument);
	const doc = documents.get(uri);

	const types = intero.svcs.map(async svc => {
		if (svc instanceof Intero) {
			const files = await svc.files.get
			const match = files.find(f => {
				const [file, _] = f;
				return file === path;
			})

			if (match !== undefined) {
				const [_, tests] = match;

				return tests.map(t => 
					new TestCodeLens({start: t.range.start, end: t.range.start}, t.title(doc) || "N/A"))
			}
		}

		return [];
	})

	const lenses = await Promise.all(types);
	const flattened: TestCodeLens[] = [].concat.apply([], lenses);

	// console.log("----- Lenses -----");
	// console.log(JSON.stringify(flattened, null, 2));

	return flattened;
});

connection.onRequest("htr/reloadIntero", async filename => {
	await intero.reloadSvcForFile(filename);
})

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	validateTextDocument(change.document);
});

// The settings interface describe the server relevant settings part
interface Settings {
	lspSample: ExampleSettings;
}

// These are the example settings we defined in the client's package.json
// file
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// hold the maxNumberOfProblems setting
let maxNumberOfProblems: number;
// The settings have changed. Is send on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
	let settings = <Settings>change.settings;
	maxNumberOfProblems = settings.lspSample.maxNumberOfProblems || 100;
	// Revalidate any open text documents
	documents.all().forEach(validateTextDocument);
});

function validateTextDocument(textDocument: TextDocument): void {
	let diagnostics: Diagnostic[] = [];
	let lines = textDocument.getText().split(/\r?\n/g);
	let problems = 0;
	for (var i = 0; i < lines.length && problems < maxNumberOfProblems; i++) {
		let line = lines[i];
		let index = line.indexOf('typescript');
		if (index >= 0) {
			problems++;
			diagnostics.push({
				severity: DiagnosticSeverity.Warning,
				range: {
					start: { line: i, character: index },
					end: { line: i, character: index + 10 }
				},
				message: `${line.substr(index, 10)} should be spelled TypeScript`,
				source: 'ex'
			});
		}
	}
	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((_change) => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});


// This handler provides the initial list of the completion items.
connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
	// The pass parameter contains the position of the text document in 
	// which code complete got requested. For the example we ignore this
	// info and always provide the same completion items.
	return [
		{
			label: 'TypeScript',
			kind: CompletionItemKind.Text,
			data: 1
		},
		{
			label: 'JavaScript',
			kind: CompletionItemKind.Text,
			data: 2
		}
	]
});

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	if (item.data === 1) {
		item.detail = 'TypeScript details',
			item.documentation = 'TypeScript documentation'
	} else if (item.data === 2) {
		item.detail = 'JavaScript details',
			item.documentation = 'JavaScript documentation'
	}
	return item;
});

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Listen on the connection
connection.listen();
