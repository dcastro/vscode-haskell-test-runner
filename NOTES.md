# Notes

* in ghci, do `let main = Main.main` > `:main -m etc` to disambiguate between different mains that may be in scope (this happens in HIE)
* in HIE, running the tests a second time results in this: ** Exception: ./test-main.log: openFile: resource busy (file is locked)
    for HIE, we'd need `let main = hspec Spec.spec`. this may different on a per-project basis, so put it in configuration? dhall config file? workspace settings?

* Discovered tests are organized by module name, minus "Spec". I.e., ApplyRefactPluginSpec -> ApplyRefactPlugin
  * But NOT non-discovered tests (see `stack ghci --with-ghc intero haskell-ide-engine:test:haskell-ide-func-test haskell-ide-engine:lib`)
