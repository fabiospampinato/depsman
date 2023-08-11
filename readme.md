 # Depsman

Extract and report metadata about dependencies of the current package.

## Metadata

The following bits of information will be provided programmatically, if available, and then sliced in human-readable reports, for each dependency:

- `id`: the name and version of the package combined like this: `{name}^{version}`.
- `name`: the name of the NPM package.
- `version`: the version of the NPM package.
- `esm`: whether the package is an ESM package or not.
- `spdx`: the SPDX code for the license.
- `registry`: the url serving the resolved `tar.gz` on the NPM registry.
- `owner`: the name of the GitHub user owning the repository.
- `repo`: the name of the GitHub repository.
- `package`: the content of the `package.json` file.
- `repository`: the result of querying `https://api.github.com/repos/{owner}/{repo}`.
- `repositoryUrl`: the url of the GitHub repository.
- `repositoryReadmeUrl`: the url of the readme file.
- `repositoryReadme`: the content of the readme file.
- `repositoryLicenseUrl`: the url of the license file.
- `repositoryLicense`: the content of the license file.

Most of this data is downloaded once and cached, for performance. The `--fresh` flag can be used to forcefully refresh the cache.

Some built-in reports are provided via the CLI, others you can probably implement yourself.

PRs or just ideas welcome for new reports or improvements to existing ones.

## Limitations

- Only NPM is supported as a package manager, a regular `node_modules` folder is required.
- Only GitHub is supported as the git hosting provider, most of the information won't be extracted from other providers.
- Providing a GitHub personal access token is strongly recommended, via the `--token` option or via the `DEPSMAN_GITHUB_TOKEN` or `GITHUB_TOKEN` env variables, or you'll get rate limited pretty quickly.
- The first run might take a while, as a lot of information might have to be downloaded.
- Some edge cases might not be supported yet, if you hit any exceptions please report them.
- If you are planning on using this tool to generate a report of your dependencies and their licenses you are _strongly_ recommended to review the whole thing manually. Some packages are shipped bundled and their dependencies are not listed as production dependencies, other packages ship WASM ports of libraries from other ecosystems, etc. 100% relying on a tool like this to generate your licenses report is fundamentally risky.

## Install

```sh
npm install --global depsman
```

## Usage

You can use this as a library to get the metadata easily and build your own reports:

```ts
import Depsman from 'depsman';

const metadata = await Depsman.get ( 'advanced' ); // [{...}, ...]
```

Or you can use the CLI to generate some built-in reports, like the following reports, generated for the [`watcher`](https://github.com/fabiospampinato/watcher) package.

Generate a simple report, for all dependencies:

```
$ depsman --report simple
- @types/debounce 1.2.1
- @types/node 18.11.9
- are-deeply-equal 1.0.1
- busboy 1.6.0
- call-chainer 3.0.0
- commander 7.2.0
- debounce 1.2.1
- escape-string-regexp 5.0.0
- fava 0.0.7
- fetch-shim 1.1.0
- fs-extra 10.1.0
- graceful-fs 4.2.10
- jsonfile 6.1.0
- matcher 5.0.0
- minimist 1.2.7
- picomatch 2.3.1
- promise-make-naked 2.0.0
- ripstat 2.0.0
- specialist 0.6.1
- streamsearch 1.1.0
- stubborn-fs 1.2.1
- tiny-colors 2.0.1
- tiny-parse-argv 1.0.2
- tiny-readdir 2.1.0
- tiny-updater 2.0.0
- tsex 1.1.3
- typescript 4.9.3
- undici 5.12.0
- universalify 2.0.0
- watcher 2.1.0
- when-exit 2.0.0
```

Generate an advanced report, with much more metadata, and only for production dependencies:

```
$ depsman --report advanced --prod
- debounce 1.2.1
  - Description: Creates and returns a new debounced version of the passed function that will postpone its execution until after wait milliseconds have elapsed since the last time it was invoked
  - SPDX: MIT
  - ESM: No
  - Repository: https://github.com/component/debounce
  - Readme: https://raw.githubusercontent.com/component/debounce/master/Readme.md
  - License: https://raw.githubusercontent.com/component/debounce/master/LICENSE
- ripstat 2.0.0
  - Description: Fetch the stats for a file as if a saber-tooth tiger is chasing you!
  - SPDX: MIT
  - ESM: Yes
  - Repository: https://github.com/fabiospampinato/ripstat
  - Readme: https://raw.githubusercontent.com/fabiospampinato/ripstat/master/README.md
  - License: https://raw.githubusercontent.com/fabiospampinato/ripstat/master/LICENSE
- stubborn-fs 1.2.1
  - Description: Stubborn versions of Node's fs functions that try really hard to do their job.
  - SPDX: MIT
  - ESM: Yes
  - Repository: https://github.com/fabiospampinato/stubborn-fs
  - Readme: https://raw.githubusercontent.com/fabiospampinato/stubborn-fs/master/readme.md
  - License: https://raw.githubusercontent.com/fabiospampinato/stubborn-fs/master/license
- tiny-readdir 2.1.0
  - Description: A simple promisified recursive readdir function.
  - SPDX: MIT
  - ESM: Yes
  - Repository: https://github.com/fabiospampinato/tiny-readdir
  - Readme: https://raw.githubusercontent.com/fabiospampinato/tiny-readdir/master/README.md
  - License: https://raw.githubusercontent.com/fabiospampinato/tiny-readdir/master/LICENSE
```

Generate an esm report, for finding non-esm dependencies:

```
$ depsman --report esm --prod
- ESM
  - ripstat 2.0.0
    - Repository: https://github.com/fabiospampinato/ripstat
    - Readme: https://raw.githubusercontent.com/fabiospampinato/ripstat/master/README.md
    - License: https://raw.githubusercontent.com/fabiospampinato/ripstat/master/LICENSE
  - stubborn-fs 1.2.1
    - Repository: https://github.com/fabiospampinato/stubborn-fs
    - Readme: https://raw.githubusercontent.com/fabiospampinato/stubborn-fs/master/readme.md
    - License: https://raw.githubusercontent.com/fabiospampinato/stubborn-fs/master/license
  - tiny-readdir 2.1.0
    - Repository: https://github.com/fabiospampinato/tiny-readdir
    - Readme: https://raw.githubusercontent.com/fabiospampinato/tiny-readdir/master/README.md
    - License: https://raw.githubusercontent.com/fabiospampinato/tiny-readdir/master/LICENSE
- No ESM
  - debounce 1.2.1
    - Repository: https://github.com/component/debounce
    - Readme: https://raw.githubusercontent.com/component/debounce/master/Readme.md
    - License: https://raw.githubusercontent.com/component/debounce/master/LICENSE
```

Generate a license report, for getting a _sense_ of what licenses your dependencies are using:

```
$ depsman --report license --prod
- MIT
  - debounce 1.2.1
    - Repository: https://github.com/component/debounce
    - Readme: https://raw.githubusercontent.com/component/debounce/master/Readme.md
    - License: https://raw.githubusercontent.com/component/debounce/master/LICENSE
  - ripstat 2.0.0
    - Repository: https://github.com/fabiospampinato/ripstat
    - Readme: https://raw.githubusercontent.com/fabiospampinato/ripstat/master/README.md
    - License: https://raw.githubusercontent.com/fabiospampinato/ripstat/master/LICENSE
  - stubborn-fs 1.2.1
    - Repository: https://github.com/fabiospampinato/stubborn-fs
    - Readme: https://raw.githubusercontent.com/fabiospampinato/stubborn-fs/master/readme.md
    - License: https://raw.githubusercontent.com/fabiospampinato/stubborn-fs/master/license
  - tiny-readdir 2.1.0
    - Repository: https://github.com/fabiospampinato/tiny-readdir
    - Readme: https://raw.githubusercontent.com/fabiospampinato/tiny-readdir/master/README.md
    - License: https://raw.githubusercontent.com/fabiospampinato/tiny-readdir/master/LICENSE
```

Generate a github report, for finding which repositories have open issues, missing description or keyword etc.:

```
$ depsman --report github --prod
- debounce 1.2.1
  - Description: Debounce functions. Useful for implementing behavior that should only happen after a repeated action has completed.
  - Keywords: Missing
  - Stars: 590
  - Watchers: 590
  - Forks: 75
  - Issues: 16
  - Repository: https://github.com/component/debounce
  - Owner: https://github.com/component
  - Issues: https://api.github.com/repos/component/debounce/issues
  - Pulls: https://api.github.com/repos/component/debounce/pulls
- ripstat 2.0.0
  - Description: Fetch the stats for a file as if a saber-tooth tiger is chasing you!
  - Keywords: fast, file, stats
  - Stars: 3
  - Watchers: 3
  - Forks: 0
  - Issues: 0
  - Repository: https://github.com/fabiospampinato/ripstat
  - Owner: https://github.com/fabiospampinato
  - Issues: https://api.github.com/repos/fabiospampinato/ripstat/issues
  - Pulls: https://api.github.com/repos/fabiospampinato/ripstat/pulls
- stubborn-fs 1.2.1
  - Description: Stubborn versions of Node's fs functions that try really hard to do their job.
  - Keywords: attempt, fs, reliable, retry, stubborn
  - Stars: 1
  - Watchers: 1
  - Forks: 0
  - Issues: 0
  - Repository: https://github.com/fabiospampinato/stubborn-fs
  - Owner: https://github.com/fabiospampinato
  - Issues: https://api.github.com/repos/fabiospampinato/stubborn-fs/issues
  - Pulls: https://api.github.com/repos/fabiospampinato/stubborn-fs/pulls
- tiny-readdir 2.1.0
  - Description: A simple promisified recursive readdir function.
  - Keywords: promise, readdir, recursive, simple, tiny
  - Stars: 1
  - Watchers: 1
  - Forks: 2
  - Issues: 0
  - Repository: https://github.com/fabiospampinato/tiny-readdir
  - Owner: https://github.com/fabiospampinato
  - Issues: https://api.github.com/repos/fabiospampinato/tiny-readdir/issues
  - Pulls: https://api.github.com/repos/fabiospampinato/tiny-readdir/pulls
```

Generate an owner report, for finding how many different people and organizations you depend on, and for what:

```
$ depsman --report owner --prod
- component
  - debounce 1.2.1
    - Repository: https://github.com/component/debounce
    - Readme: https://raw.githubusercontent.com/component/debounce/master/Readme.md
    - License: https://raw.githubusercontent.com/component/debounce/master/LICENSE
- fabiospampinato
  - ripstat 2.0.0
    - Repository: https://github.com/fabiospampinato/ripstat
    - Readme: https://raw.githubusercontent.com/fabiospampinato/ripstat/master/README.md
    - License: https://raw.githubusercontent.com/fabiospampinato/ripstat/master/LICENSE
  - stubborn-fs 1.2.1
    - Repository: https://github.com/fabiospampinato/stubborn-fs
    - Readme: https://raw.githubusercontent.com/fabiospampinato/stubborn-fs/master/readme.md
    - License: https://raw.githubusercontent.com/fabiospampinato/stubborn-fs/master/license
  - tiny-readdir 2.1.0
    - Repository: https://github.com/fabiospampinato/tiny-readdir
    - Readme: https://raw.githubusercontent.com/fabiospampinato/tiny-readdir/master/README.md
    - License: https://raw.githubusercontent.com/fabiospampinato/tiny-readdir/master/LICENSE
```

Generate a duplicates report, for finding multiple instances of the same package (using another repo for this, since `watcher` has no duplicates):

```
$ depsman --report duplicates --prod
- string_decoder
  - 1.1.1
    - Repository: https://github.com/nodejs/string_decoder
    - Readme: https://raw.githubusercontent.com/nodejs/string_decoder/master/README.md
    - License: https://raw.githubusercontent.com/nodejs/string_decoder/master/LICENSE
  - 1.3.0
    - Repository: https://github.com/nodejs/string_decoder
    - Readme: https://raw.githubusercontent.com/nodejs/string_decoder/master/README.md
    - License: https://raw.githubusercontent.com/nodejs/string_decoder/master/LICENSE
- source-map
  - 0.7.4
    - Repository: https://github.com/mozilla/source-map
    - Readme: https://raw.githubusercontent.com/mozilla/source-map/master/README.md
    - License: https://raw.githubusercontent.com/mozilla/source-map/master/LICENSE
  - 0.6.1
    - Repository: https://github.com/mozilla/source-map
    - Readme: https://raw.githubusercontent.com/mozilla/source-map/master/README.md
    - License: https://raw.githubusercontent.com/mozilla/source-map/master/LICENSE
- semver
  - 6.3.1
    - Repository: https://github.com/npm/node-semver
    - Readme: https://raw.githubusercontent.com/npm/node-semver/master/README.md
    - License: https://raw.githubusercontent.com/npm/node-semver/master/LICENSE
  - 7.5.4
    - Repository: https://github.com/npm/node-semver
    - Readme: https://raw.githubusercontent.com/npm/node-semver/master/README.md
    - License: https://raw.githubusercontent.com/npm/node-semver/master/LICENSE
```

## License

MIT © Fabio Spampinato
