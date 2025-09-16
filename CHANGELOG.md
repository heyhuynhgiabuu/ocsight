## [0.6.2](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.6.1...v0.6.2) (2025-09-16)


### Bug Fixes

* complete Homebrew installation support ([f7c3c23](https://github.com/heyhuynhgiabuu/ocsight/commit/f7c3c232f75d02c5819dbcc4daaf8b99bfb06a5e))

## [0.6.1](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.6.0...v0.6.1) (2025-09-16)


### Bug Fixes

* update Go binary to find JS files in lib/ocsight for Homebrew ([3045c92](https://github.com/heyhuynhgiabuu/ocsight/commit/3045c922626c74befb9badc0fc30244b7cdfbeb8))
* update Go binary to find JS files in lib/ocsight/lib for Homebrew ([ffa5084](https://github.com/heyhuynhgiabuu/ocsight/commit/ffa508473c07150485c0b1e3d526a322388d4500))

# [0.6.0](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.5.2...v0.6.0) (2025-09-15)


### Features

* add cross-platform Go binaries to README features ([3136277](https://github.com/heyhuynhgiabuu/ocsight/commit/3136277bee3e2df32979f80e91c338b062d2f7b2))

## [0.5.2](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.5.1...v0.5.2) (2025-09-15)


### Bug Fixes

* remove ARM64 binary targets to resolve pkg compilation issues ([d8e7be1](https://github.com/heyhuynhgiabuu/ocsight/commit/d8e7be1c68e05d280dd637af038c22c31919fa42))

## [0.5.1](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.5.0...v0.5.1) (2025-09-15)


### Bug Fixes

* rename GITHUB_TOKEN secret to GH_TOKEN ([f147a34](https://github.com/heyhuynhgiabuu/ocsight/commit/f147a34f061df124519b6b5743a3eeac4b03a328))
* use correct GH_TOKEN secret in release workflow ([899cb7e](https://github.com/heyhuynhgiabuu/ocsight/commit/899cb7ea176142e7aa91d925ae9900a733389db1))
* use GH_TOKEN consistently in release workflow ([b8ffd99](https://github.com/heyhuynhgiabuu/ocsight/commit/b8ffd997d40b664087cbf6d7b9df51607c58a729))

# [0.5.0](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.4.3...v0.5.0) (2025-09-15)


### Features

* add development branch workflow and improve CI/CD ([a7e00b9](https://github.com/heyhuynhgiabuu/ocsight/commit/a7e00b9cd50d9c129bd756c2889ec475dcf8b5e4))

## [0.4.3](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.4.2...v0.4.3) (2025-09-15)


### Bug Fixes

* ignore major updates for commander and chalk ([d1ef946](https://github.com/heyhuynhgiabuu/ocsight/commit/d1ef946b07d04c59dc7079108b0876688079eeab))

## [0.4.2](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.4.1...v0.4.2) (2025-09-15)


### Bug Fixes

* include README.md in npm package and fix CI tests ([2cfae6b](https://github.com/heyhuynhgiabuu/ocsight/commit/2cfae6b9216cb4d5712b8d69d9b56ef5792a4327))

## [0.4.1](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.4.0...v0.4.1) (2025-09-15)


### Bug Fixes

* resolve ESM module scope error and fix CI/CD pipeline ([beac489](https://github.com/heyhuynhgiabuu/ocsight/commit/beac489babf593212e5155f20918a3264c68db41))

# [0.4.0](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.3.0...v0.4.0) (2025-09-15)


### Features

* test npm automation token ([c13e40a](https://github.com/heyhuynhgiabuu/ocsight/commit/c13e40a7ccd430181628df53f0934652ee1a5b57))

# [0.3.0](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.2.1...v0.3.0) (2025-09-15)


### Features

* trigger release test ([3e625b0](https://github.com/heyhuynhgiabuu/ocsight/commit/3e625b02756492b6ab04ccf9f500c7dd803b5125))

## [0.2.1](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.2.0...v0.2.1) (2025-09-15)


### Bug Fixes

* **ci:** support bun in workflows & configure npm auth for semantic-release ([ae438e1](https://github.com/heyhuynhgiabuu/ocsight/commit/ae438e1c15f8e61e2c04436265b04086674adb27))
* include bundle build in prepublishOnly script ([ddf3315](https://github.com/heyhuynhgiabuu/ocsight/commit/ddf3315090ba297d1cfee80f77bbe80b867ac907))
* re-enable NPM publishing in semantic-release ([283da01](https://github.com/heyhuynhgiabuu/ocsight/commit/283da01120a4da91bdb1c77b7f2295c7a5d07ac9))
* remove npm cache and frozen-lockfile from CI workflows ([69a36a5](https://github.com/heyhuynhgiabuu/ocsight/commit/69a36a58d759bba8f77711192a33119f7d6e39f0))
* remove NPM publishing from semantic-release ([a2346f8](https://github.com/heyhuynhgiabuu/ocsight/commit/a2346f8fcd72fafbfa6b33b9013c57577cc8d1a7))
* simplify release workflow and fix NPM publishing ([e9de1b0](https://github.com/heyhuynhgiabuu/ocsight/commit/e9de1b0892e8180f292592b0f95362c9c308f145))
* simplify release workflow and fix NPM publishing ([7edd8bd](https://github.com/heyhuynhgiabuu/ocsight/commit/7edd8bd5b3e70bbeae31dd20e0cd34309700abf2))
* simplify release workflow to minimum viable ([6e88352](https://github.com/heyhuynhgiabuu/ocsight/commit/6e88352ae2bc7cf53258718746e43d1cb4f5b475))

# [0.2.0](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.1.4...v0.2.0) (2025-09-15)


### Bug Fixes

* complete homebrew binary distribution and remove ora dependency ([89a3d66](https://github.com/heyhuynhgiabuu/ocsight/commit/89a3d665ac2fc0bb339ac8bec99cd6cec536bce3))
* properly configure semantic-release with exec plugin for automated releases ([b648845](https://github.com/heyhuynhgiabuu/ocsight/commit/b648845c7ebe693a1d20c509a4d9d2437c86753e))
* remove conflicting release steps from workflow ([1595605](https://github.com/heyhuynhgiabuu/ocsight/commit/15956054f03bb26fa3594e0b16dd2dcf02d4ade7))


### Features

* complete cross-platform binary distribution with automated releases ([eebfbd2](https://github.com/heyhuynhgiabuu/ocsight/commit/eebfbd208ce878ef3e08d1bd64443ea8d643082e))
* complete homebrew infrastructure and fix binary builds ([8598951](https://github.com/heyhuynhgiabuu/ocsight/commit/8598951a4ead7a8e289713063da35b0c4b32162c))

# [0.2.0](https://github.com/heyhuynhgiabuu/ocsight/compare/v0.1.4...v0.2.0) (2025-09-15)


### Features

* complete cross-platform binary distribution with automated releases ([eebfbd2](https://github.com/heyhuynhgiabuu/ocsight/commit/eebfbd208ce878ef3e08d1bd64443ea8d643082e))
