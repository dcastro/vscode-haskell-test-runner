#!/usr/bin/env stack
{- stack
  script
  --resolver lts-10.1
  --package Cabal
  --package yaml
  --package process
  --package bytestring
  --package unordered-containers
  --package text
  --package filepath
  --package aeson
  --package vector
-}

{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE LambdaCase #-}

module DirectDeps where

import Data.Aeson         (FromJSON, ToJSON, Value(..), (.:), (.=), withObject, toJSON, object)
import Data.List          (isPrefixOf)
import Data.Maybe         (fromMaybe, maybeToList)
import Data.Text          (Text)
import Data.Vector        (fromList)
import System.Environment (getArgs)
import System.Exit        (die, ExitCode(..))
import System.FilePath    ((</>), (<.>))
import System.Process     (readCreateProcessWithExitCode, proc, cwd)

import qualified Data.Aeson                             as J
import qualified Data.ByteString.Char8                  as BS
import qualified Data.ByteString.Lazy.Char8             as BSL
import qualified Data.HashMap.Strict                    as HM
import qualified Data.Text                              as T
import qualified Data.Yaml                              as Y
import qualified Distribution.Package                   as P
import qualified Distribution.PackageDescription        as P
import qualified Distribution.PackageDescription.Parse  as P
import qualified Distribution.Types.UnqualComponentName as P
import qualified Distribution.Verbosity                 as P

main :: IO ()
main = do
  argsOpt               <- parseArgs <$> getArgs
  (projPath, stackPath) <- case argsOpt of
                            Just args -> pure args
                            Nothing   -> die usage
  cabalFiles            <- stackQuery projPath stackPath
  packageDescriptions   <- traverse readGenericPackageDescriptionFromFile cabalFiles
  let packages = fmap parsePackage packageDescriptions
  putStrLn $ BSL.unpack $ J.encode packages

-------------------------------------------------------------------
-- parse cabal files
-------------------------------------------------------------------

data Package = Package
  { packageName :: String
  , packageComponents :: [Component]
  }

data Component
  = Lib [P.Dependency]
  | Other ComponentType ComponentName DependsOnLib [P.Dependency]

type ComponentName = String
type DependsOnLib = Bool
data ComponentType = Exe | Test | Bench

instance ToJSON Package where
  toJSON (Package pkgName components) = 
    object
      [ "packageName" .= pkgName
      , "components" .= fromList (map encodeComponent components)
      ]
    where
      encodeComponent (Lib deps) =
        object
          [ "target"  .= pkgName
          , "deps"    .= fromList (map encodeDep deps)
          ]
      encodeComponent (Other ctype cname dependsOnLib deps) =
        object
          [ "target"        .= (pkgName ++ ":" ++ encodeCtype ctype ++ ":"  ++ cname)
          , "dependsOnLib"  .= dependsOnLib
          , "deps"          .= fromList (map encodeDep deps)
          ]
      encodeDep = toJSON . P.unPackageName . P.depPkgName
      encodeCtype Exe   = "exe"
      encodeCtype Test  = "test"
      encodeCtype Bench = "bench"
      
readGenericPackageDescriptionFromFile :: CabalFile -> IO P.GenericPackageDescription
readGenericPackageDescriptionFromFile cf = P.readGenericPackageDescription P.normal fullPath
  where
    fullPath = T.unpack (path cf) </> T.unpack (name cf) <.> "cabal"
    
parsePackage :: P.GenericPackageDescription -> Package
parsePackage gpd =
  let pkgName = P.unPackageName $ P.pkgName $ P.package $ P.packageDescription gpd
      lib     = Lib . P.condTreeConstraints <$> P.condLibrary gpd
      exes    = parseComponent Exe   pkgName <$> P.condExecutables gpd
      tests   = parseComponent Test  pkgName <$> P.condTestSuites gpd
      benches = parseComponent Bench pkgName <$> P.condBenchmarks gpd
      components = maybeToList lib ++ exes ++ tests ++ benches
  in  Package pkgName components

parseComponent
  :: ComponentType
  -> String
  -> (P.UnqualComponentName, P.CondTree b [P.Dependency] c)
  -> Component
parseComponent componentType pkgName (compName, condTree) =
  let compName'     = P.unUnqualComponentName compName
      deps          = P.condTreeConstraints condTree
      dependsOnLib  = any (\d -> P.unPackageName (P.depPkgName d) == pkgName) deps
  in  Other componentType compName' dependsOnLib deps

-------------------------------------------------------------------
-- parse command line args
-------------------------------------------------------------------

type ProjectPath = String
type StackPath = String

parseArgs :: [String] -> Maybe (ProjectPath, StackPath)
parseArgs args =
  go args (Nothing, Nothing) >>= \case
    (Nothing, _) -> Nothing
    (Just projPath, stackPathOpt) -> Just (projPath, fromMaybe "stack" stackPathOpt)
  where
    go :: [String] -> (Maybe ProjectPath, Maybe StackPath) -> Maybe (Maybe ProjectPath, Maybe StackPath)
    go [] paths = Just paths
    go (stackFlag : stackPath : xs) (projPathOpt, _)
      | stackFlag == "-s" || stackFlag == "--stack-path" = go xs (projPathOpt, Just stackPath)
    go (unrecognizedFlag : _) _
      | "-" `isPrefixOf` unrecognizedFlag  = Nothing
    go (projPath : xs) (_, stackPathOpt) = go xs (Just projPath, stackPathOpt)

usage :: String
usage = "Usage: stack DirectDeps.hs <project-path> [-s|--stack-path <stack-path>]"

-------------------------------------------------------------------
-- `stack query`
-------------------------------------------------------------------

stackQuery :: ProjectPath -> StackPath -> IO [CabalFile]
stackQuery projPath stackPath = 
  do
    (exitCode, stdout, stderr) <- readCreateProcessWithExitCode process ""
    
    case exitCode of
      ExitFailure _ -> die ("`stack query` failed:\n" ++ stderr)
      ExitSuccess   -> pure ()

    case Y.decodeEither (BS.pack stdout) of
      Right (StackQuery files)  -> pure files
      Left err                  -> die ("Could not parse response from `stack query`:\n" ++ err)
  where
    process = (proc stackPath ["query"]) { cwd = Just projPath }

newtype StackQuery = StackQuery [CabalFile]

data CabalFile = CabalFile
  { name :: Text
  , path :: Text
  }

instance FromJSON StackQuery where
  parseJSON = 
    let parseCabalFile (k, v) = 
          withObject (T.unpack k) (\v' -> CabalFile k <$> v' .: "path") v
    in
      withObject "root" $ \o ->
        do 
          Object locals <- o .: "locals"
          files         <- traverse parseCabalFile $ HM.toList locals
          pure $ StackQuery files
