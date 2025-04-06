# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.0.0 (2025-04-06)


### Features

* add `checkInstance(error,instance)` type guard and helper method along with `toJSON` for better object serialization ([d1c0a53](https://github.com/fuzzy-st/errors/commit/d1c0a53b8cce0adcb009c78f516d58e7b0a9f523))
* add CI workflow for automated build, linting, and testing ([3a755e2](https://github.com/fuzzy-st/errors/commit/3a755e2a20c12374e615868cf09e747b18a85465))
* add commit-msg hook for validating commit messages with commitlint ([97e681e](https://github.com/fuzzy-st/errors/commit/97e681e3baa94ac627e6b9938f2eaed9e8c14ecf))
* add commitlint configuration for standardized commit messages ([9e06df0](https://github.com/fuzzy-st/errors/commit/9e06df02f0d8c566b2a8affece53597d518d9924))
* add comprehensive examples for custom error handling utility ([2a5be51](https://github.com/fuzzy-st/errors/commit/2a5be51f10bd11d676bcfc9a07760096a63fcd65))
* add cut-release script for automated git tagging and pushing ([659cb03](https://github.com/fuzzy-st/errors/commit/659cb03ef96cec62e45c3ace818f203399682f3c))
* add examples script to package.json for easier demonstration ([13d2c40](https://github.com/fuzzy-st/errors/commit/13d2c403b96ec027171416e0bc2f6a6b840d946d))
* add lint-staged configuration for biome checks on staged files ([82e469b](https://github.com/fuzzy-st/errors/commit/82e469bb733a411e71c07df2aec5fae911b86190))
* add pre-commit deps and scripts ([39e9733](https://github.com/fuzzy-st/errors/commit/39e97333cf1c9f9f3a5800345ef82415109a6017))
* add pre-commit hook for linting and formatting staged files ([41d6ab8](https://github.com/fuzzy-st/errors/commit/41d6ab827a62f07b7ff2de86f0b56ac954847a1d))
* add README for GitHub workflows detailing CI and release processes ([320a1f3](https://github.com/fuzzy-st/errors/commit/320a1f3653bcd1d1b301c3aa0fdc00be83b8063f))
* add release workflow for automated versioning and publishing to npm ([b5f35d7](https://github.com/fuzzy-st/errors/commit/b5f35d7a8ae63101ccf93cd080e30e8b7091a69d))
* add setup script for configuring git hooks ([e47f429](https://github.com/fuzzy-st/errors/commit/e47f429437ad47803c6957f837e31cf8b6c3ce56))
* **biome:** add complexity rule for `noBannedType`s in biome.json ([cef6b27](https://github.com/fuzzy-st/errors/commit/cef6b2782ebef91ce5e650b9ee9982849f0db91d))
* **build:** update entry point to `main.ts` and enable minification, code splitting, and tree shaking ([6bcc0a3](https://github.com/fuzzy-st/errors/commit/6bcc0a340eae381acaf883ebfbc5fcf9f0327676))
* Complete Enhanced Error Hierarchy implementation with expanded API ([f6fd10c](https://github.com/fuzzy-st/errors/commit/f6fd10cdbbcae8fd205d6372be78ad147e6f87ec))
* **config:** Add `biome.json` configuration for code formatting and linting ([51f4572](https://github.com/fuzzy-st/errors/commit/51f4572ba5365eda3c8b3518bc861eb8647aba77))
* **config:** Add `tsup.config.ts` for bundling configuration ([1d41f06](https://github.com/fuzzy-st/errors/commit/1d41f06e8c707d8577c31849ec1000e3e814ab9d))
* **config:** Add TypeScript configuration file `tsconfig.json` ([d349397](https://github.com/fuzzy-st/errors/commit/d3493977db539c20c4153754248dcbae08f6b783))
* **docs:** Update README with comprehensive overview ([a31adb7](https://github.com/fuzzy-st/errors/commit/a31adb78af46240ead5df058225bb106fd8271d8))
* enhance pre-commit hook to check for staged JS/TS files before linting ([ceccb3c](https://github.com/fuzzy-st/errors/commit/ceccb3c7f3fcabe62b819312ce0b4b62b4baac9c))
* **init:** Add `mise.toml` configuration for environment tools ([e8a069b](https://github.com/fuzzy-st/errors/commit/e8a069ba5ea411304c282d45886500817bc27fed))
* **init:** Add initial `pnpm-workspace.yaml` and `package.json` for error handling library ([bf5dcbc](https://github.com/fuzzy-st/errors/commit/bf5dcbce8e464226e5a9c5a8278d45d79c6bfecc))
* **test:** add comprehensive unit tests for `createCustomError` and `checkInstance`. ([aa92c9a](https://github.com/fuzzy-st/errors/commit/aa92c9afedb1cda598be2770c62510bc38c002b6))
* **test:** update tests to reflect changes made to API surface ([ca63ba5](https://github.com/fuzzy-st/errors/commit/ca63ba5f113f09f0fef51c6f9c256e249be4a13d))
* update test suite with more requirements ([af585a6](https://github.com/fuzzy-st/errors/commit/af585a6a7dc6bcdca42fc6fa46d4023abb99b3d9))
* WOCKA WOCKA! Add enhanced custom error handling utility ([47396a3](https://github.com/fuzzy-st/errors/commit/47396a3955a2233e319dd28c67cbcd276604e57f))


### Bug Fixes

* update biome check command from --apply to --write in lint-staged configuration ([44c54fd](https://github.com/fuzzy-st/errors/commit/44c54fdab7ab53bcf94fbf8b09188db204990c11))
