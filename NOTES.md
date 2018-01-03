# Notes

* in ghci, do `let main = Main.main` > `:main -m etc` to disambiguate between different mains that may be in scope (this happens in HIE)
* in HIE, running the tests a second time results in this: ** Exception: ./test-main.log: openFile: resource busy (file is locked)
    for HIE, we'd need `let main = hspec Spec.spec`. this may different on a per-project basis, so put it in configuration? dhall config file? workspace settings?

* Discovered tests are organized by module name, minus "Spec". I.e., ApplyRefactPluginSpec -> ApplyRefactPlugin
  * But NOT non-discovered tests (see `stack ghci --with-ghc intero haskell-ide-engine:test:haskell-ide-func-test haskell-ide-engine:lib`)

* maybe defer type errors, so we can show code lenses for partially type checked programs

* when a target fails to load, keep a record of it in "failed" state.
  * when a file changes, we:
    * try to find the target it belongs to; if we find it, reload it
    * otherwise, see if there's any target in the failed state, :r it
    * if :r still fails, move onto the next failed target
    * if there are no failed targets, do nothing

* when a file is added
  * :r a target
  * ???? we can't use all-types, because the file may have no expressions in it yet

* when loading the HIE project, haskero only shows the actual targets, not ghc-mod for example. How does it do it?

* Do expressions of type `[Char]` become of type `IsString s => s` when `-XOverloadedStrings` is enabled?