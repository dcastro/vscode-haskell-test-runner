# Haskell Test Runner for VSCode (WIP)

A plugin for VSCode that lets you run your Hspec tests, either manually or automatically “on save”, and view the results without leaving the editor.

![Screenshot showing code lenses](https://raw.githubusercontent.com/dcastro/vscode-haskell-test-runner/master/img/screenshot.png)

## Installation

* This works on [`stack`][stack] projects only.
* Install Intero in your project: `stack build intero`
* Search for `vscode-haskell-test-runner` in VSCode's marketplace (not yet available)

## Troubleshooting

* > cannot satisfy -package (package-name)

    You might have to run `stack build --test` once and then reload vscode.

## Development

`npm i && npm run compile`

* `F5` to start debugging the client.
* `F1` > `Debug: Select and Start Debugging` > `Attach to Server` to debug the server

## Credits

Thanks to [Julien Vannesson][julien] for letting me reuse part of his code for interacting with intero and for his great work with [Haskero][haskero].

 [stack]: https://docs.haskellstack.org/en/stable/install_and_upgrade/
 [julien]: https://twitter.com/vavans
 [haskero]: https://gitlab.com/vannnns/haskero
