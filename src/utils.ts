
/* IMPORT */

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import util from 'node:util';
import sanitizeBasename from 'sanitize-basename';
import {color} from 'specialist';
import escapeRegExp from 'string-escape-regex';
import readdir from 'tiny-readdir';
import {ARGV, CACHE_VERSION, GITHUB_TOKEN, HAS_COLORS, IS_FRESH} from './constants';
import type {DependencyRoot, DependencyNode, DependencyNodes, DependencySimple, DependencyAdvanced} from './types';
import type {Package, Repository} from './types';
import type {ReportSimple, ReportAdvanced, ReportESM, ReportLicense, ReportGitHub, ReportOwner, ReportDuplicates} from './types';

/* UTILS - LANG */

const exit = ( message: string ): never => {

  console.log ( color.red ( message ) );

  process.exit ( 1 );

};

const fetchWithGithub = ( url: string ): Promise<Response> => {

  return fetch ( url, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'Depsman/v1' } } );

};

const groupBy = <T> ( arr: T[], iterator: ( value: T, index: number, arr: T[] ) => string ): Record<string, T[]> => {

  const groups: Record<string, T[]> = {};

  for ( let i = 0, l = arr.length; i < l; i++ ) {

    const value = arr[i];
    const group = iterator ( value, i, arr );

    groups[group] ||= [];
    groups[group].push ( value );

  }

  return groups;

};

const inspect = ( value: object ): void => {

  console.log ( util.inspect ( value, { colors: HAS_COLORS, depth: Infinity, maxArrayLength: Infinity, maxStringLength: Infinity } ) );

};

const isObject = ( value: unknown ): value is object => {

  return typeof value === 'object' && value !== null;

};

const isString = ( value: unknown ): value is string => {

  return typeof value === 'string';

};

const isUndefined = ( value: unknown ): value is undefined => {

  return typeof value === 'undefined';

};

const partition = <T> ( arr: ArrayLike<T>, filterer: ( value: T, index: number, arr: ArrayLike<T> ) => boolean ): [T[], T[]] => {

  const positive: T[] = [];
  const negative: T[] = [];

  for ( let i = 0, l = arr.length; i < l; i++ ) {

    const value = arr[i];
    const bucket = filterer ( value, i, arr ) ? positive : negative;

    bucket.push ( value );

  }

  return [positive, negative];

};

const sortKeys = <T> ( obj: Record<string, T>, sorter: ( a: string, b: string ) => number ): Record<string, T> => {

  const keys = Object.keys ( obj ).sort ( sorter );
  const objSorted: Record<string, T> = {};

  keys.forEach ( key => {

    objSorted[key] = obj[key];

  });

  return objSorted;

};

/* UTILS - GENERAL */

const getCachedJSON = async <T> ( id: string, fn: () => T ): Promise<T> => {

  const cacheFolderPath = path.join ( process.cwd (), 'node_modules', '.cache', 'depsman' );
  const cacheFilePath = path.join ( cacheFolderPath, `${CACHE_VERSION}_${sanitizeBasename ( id )}.json` );

  try {

    if ( IS_FRESH ) {

      throw new Error ( 'Cache disabled' );

    } else {

      return JSON.parse ( fs.readFileSync ( cacheFilePath, 'utf8' ) );

    }

  } catch {

    const result = await fn ();

    if ( result ) {

      fs.mkdirSync ( cacheFolderPath, { recursive: true } );
      fs.writeFileSync ( cacheFilePath, JSON.stringify ( result ) );

    }

    return result;

  }

};

const getFileJSON = ( filePath: string ): unknown | undefined => {

  try {

    return JSON.parse ( fs.readFileSync ( path.resolve ( filePath ), 'utf8' ) );

  } catch ( error: unknown ) {

    // console.log ( `Failed to read file "${filePath}"` );
    // console.log ( error );

    return;

  }

};

const isPackage = ( value: unknown ): value is Package => {

  return isObject ( value ) && isString ( value['name'] ) && isString ( value['version'] ) && ( isUndefined ( value['repository'] ) || isObject ( value['repository'] ) || isString ( value['repository'] ) );

};

const isSPDXPermissive = ( spdx: string ): boolean => {

  // const spdxes = new Set ([ 'AGPL-3.0', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'BSL-1.0', 'CC0-1.0', 'EPL-2.0', 'GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'MIT', 'MPL-2.0', 'Unlicense', 'ISC', '0BSD' ]);
  const spdxes = new Set ([ 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'BSL-1.0', 'CC0-1.0', 'MIT', 'Unlicense', 'ISC', '0BSD' ]);

  return spdxes.has ( spdx );

};

/* UTILS - DEPENDENCY */

const getDependencyId = ( name: string, version: string ): string => {

  return `${name}^${version}`;

};

const getDependencyName = ( name: string, node: DependencyNode ): string => {

  if ( !node.resolved ) return name;

  const namespaceRe = new RegExp ( `\\/(@[\\w]+/${escapeRegExp ( name )})\\/` );
  const namespaceMatch = namespaceRe.exec ( node.resolved );

  if ( namespaceMatch && namespaceMatch[1] !== name ) return namespaceMatch[1];

  const registryRe = /^https:\/\/registry\.npmjs\.org\/([\w\.-]+)\//;
  const registryMatch = registryRe.exec ( node.resolved );

  if ( registryMatch && registryMatch[1] !== name ) return registryMatch[1];

  return name;

};

const getDependencyESM = ( pkg: Package ): boolean => {

  return ( pkg.type === 'module' );

};

const getDependencySPDX = ( pkg: Package, metadata?: Repository, license?: string ): string | undefined => {

  if ( metadata?.license?.spdx_id && metadata?.license?.spdx_id !== 'NOASSERTION' ) return metadata.license.spdx_id;

  if ( pkg.license ) return pkg.license;

  if ( license ) return license.slice ( 0, license.indexOf ( '\n' ) ).trim ();

  return;

};

const getDependencyPackage = ( name: string, version: string ): Package => {

  const selector = `#${name}@${version}`;
  const process = spawnSync ( 'npm', ['query', selector] );
  const stdout = process.stdout.toString ();
  const pkg: Package = JSON.parse ( stdout )[0];

  return pkg;

};

const getDependencyAdvanced = async ( simple: DependencySimple, packages: Package[], packagesMap: Record<string, Package> ): Promise<DependencyAdvanced> => {

  /* PACKAGE */
  const pkg = packagesMap[simple.id] || packages.filter ( pkg => simple.registry && simple.registry.includes ( `/${pkg.name}.` ) ).sort ( ( a, b ) => a.name.length - b.name.length )[0] || getDependencyPackage ( simple.name, simple.version );
  if ( !pkg ) exit ( `Missing package for "${simple.id}"` );

  /* REPOSITORY URL */
  const repositoryUrl = getRepository ( simple.registry, pkg );

  /* ESM */
  const esm = getDependencyESM ( pkg );

  /* OWNER & REPO */
  const [owner, repo] = ( repositoryUrl && getRepositoryOwnerAndRepo ( repositoryUrl ) ) || [];

  /* README */
  const [repositoryReadmeUrl, repositoryReadme] = ( repositoryUrl && await getCachedJSON ( `readme_${simple.id}`, () => getRepositoryReadme ( repositoryUrl ) ) ) || [];

  /* LICENSE */
  const [repositoryLicenseUrl, repositoryLicense] = ( repositoryUrl && await getCachedJSON ( `license_${simple.id}`, () => getRepositoryLicense ( repositoryUrl ) ) ) || [];

  /* REPOSITORY */
  const repository = ( repositoryUrl && await getCachedJSON ( `metadata_${simple.id}`, () => getRepositoryMetadata ( repositoryUrl ) ) ) || undefined;

  /* SPDX */
  const spdx = getDependencySPDX ( pkg, repository, repositoryLicense );

  /* ADVANCED */
  const advanced: DependencyAdvanced = {
    ...simple,
    esm,
    spdx,
    owner,
    repo,
    package: pkg,
    repository,
    repositoryUrl,
    repositoryReadmeUrl,
    repositoryReadme,
    repositoryLicenseUrl,
    repositoryLicense,
  };

  return advanced;

};

/* UTILS - REPOSITORY */

const getRepository = ( registry: string | undefined, pkg: Package ): string | undefined => {

  if ( registry ) {

    const githubRe = /github\.com\/([\w-]+)\/([\w-\.]+)\.git/;
    const githubMatch = githubRe.exec ( registry );

    if ( githubMatch ) return `https://github.com/${githubMatch[1]}/${githubMatch[2]}`;

  }

  if ( pkg.repository ) {

    const repositoryUrl = getRepositoryFromPackage ( pkg ).replace ( /\/(github):/, '/' ).replace ( /^ssh:\/\/git@github.com/, 'https://github.com' ).replace ( /\/(git|https?|ssh)(:|@)(\/\/)?(github)\.com(:|\/)/, '/' ).replace ( /\.git$/, '' ).replace ( 'www.github.com', 'github.com' ); //FIXME: Weird and messy cleanup logic

    if ( !repositoryUrl.includes ( 'github.com' ) ) return;

    return repositoryUrl;

  }

};

const getRepositoryFromPackage = (() => {

  // https://raw.githubusercontent.com/sapegin/package-repo-url/main/index.js

  const trimSlash = ( url: string ) => url.replace ( /\/$/, '' );
  const unGitUrl = ( url: string ) => url.replace ( /^git\+/, '' ).replace ( /.git$/, '' );

  return ( pkg: Package ): string => {

    const url = isObject ( pkg.repository ) ? pkg.repository.url : pkg.repository;

    if ( !url ) return '';

    if ( url.startsWith ( 'https:' ) ) {
      return unGitUrl ( trimSlash ( url ) );
    }

    if ( url.startsWith ( 'git+' ) ) {
      return unGitUrl ( url );
    }

    return trimSlash ( `https://github.com/${url}` );

  };

})();

const getRepositoryContent = ( repository: string ): string => {

  return repository.replace ( 'github.com', 'raw.githubusercontent.com' );

};

const getRepositoryOwnerAndRepo = ( repository: string ): [string, string] | undefined => {

  const ownerRe = /github\.com\/([\w-]+)\/([\w-\.]+)/;
  const ownerMatch = ownerRe.exec ( repository );

  if ( !ownerMatch ) return;

  return [ownerMatch[1], ownerMatch[2]];

};

const getRepositoryMetadata = async ( repository: string ): Promise<Repository | undefined> => {

  const metadataUrl = repository.replace ( 'github.com', 'api.github.com/repos' );
  const response = await fetchWithGithub ( metadataUrl );

  if ( response.status !== 200 ) return;

  const metadata: Repository = await response.json ();

  return metadata;

};

const getRepositoryReadme = async ( repository: string ): Promise<[string, string] | undefined> => {

  const content = getRepositoryContent ( repository );

  for ( const branch of ['master', 'main'] ) {
    for ( const fileName of ['README.md', 'readme.md', 'Readme.md', 'README.txt', 'readme.txt', 'Readme.txt', 'README', 'readme', 'Readme'] ) {
      const url = `${content}/${branch}/${fileName}`;
      const response = await fetch ( url );
      const status = response.status;
      if ( status !== 200 ) continue;
      const text = await response.text ();
      return [url, text];
    }
  }

};

const getRepositoryLicense = async ( repository: string ): Promise<[string, string] | undefined> => {

  const content = getRepositoryContent ( repository );

  for ( const branch of ['master', 'main'] ) {
    for ( const fileName of ['LICENSE', 'license', 'License', 'LICENSE.md', 'license.md', 'License.md', 'LICENSE.txt', 'license.txt', 'License.txt'] ) {
      const url = `${content}/${branch}/${fileName}`;
      const response = await fetch ( url );
      const status = response.status;
      if ( status !== 200 ) continue;
      const text = await response.text ();
      return [url, text];
    }
  }

};

/* UTILS - DEPENDENCIES */

const getDependenciesPackages = async (): Promise<Package[]> => {

  const {files} = await readdir ( 'node_modules' );
  const packagesPaths = files.filter ( filePath => filePath.endsWith ( 'package.json' ) );
  const packages = packagesPaths.map ( getFileJSON ).filter ( isPackage );

  return packages;

};

const getDependenciesSimple = ( tree: DependencyRoot ): DependencySimple[] => {

  const simples: DependencySimple[] = [];
  const simplesMap: Record<string, DependencySimple> = {};

  const populate = ( dependencies?: DependencyNodes ): void => {

    if ( !dependencies ) return;

    for ( const baseName in dependencies ) {


      const child = dependencies[baseName];
      const name = getDependencyName ( baseName, child );
      const id = getDependencyId ( name, child.version );
      const dependency = simplesMap[id];

      if ( dependency ) {

        dependency.registry ||= child.resolved;
        dependency.nodesNr += 1;

      } else {

        const dependency: DependencySimple = {
          id,
          name,
          registry: child.resolved,
          version: child.version,
          nodesNr: 1
        };

        simples.push ( dependency );
        simplesMap[id] = dependency;

      }

      populate ( child.dependencies );

    }

  };

  populate ( tree.dependencies );

  const [simplesResolved, simplesUnresolved] = partition ( simples, dependency => !!dependency.registry );
  const simplesResolvedSorted = [...simplesResolved].sort ( ( a, b ) => a.name.localeCompare ( b.name ) );
  const simplesUnresolvedSorted = [...simplesUnresolved].sort ( ( a, b ) => a.name.localeCompare ( b.name ) );

  // inspect ( simplesUnresolved ); //TODO: Ignoring these is a slight issue

  return simplesResolvedSorted.length ? simplesResolvedSorted : simplesUnresolvedSorted; //TODO: This is slightly wrong if both are not empty

};

const getDependenciesAdvanced = async ( simples: DependencySimple[], packages: Package[] ): Promise<DependencyAdvanced[]> => {

  const advanceds: DependencyAdvanced[] = [];
  const packagesMap: Record<string, Package> = {};

  for ( const pkg of packages ) {
    const id = getDependencyId ( pkg.name, pkg.version );
    packagesMap[id] ||= pkg;
  }

  // for ( const simple of simples ) {
  //   const advanced = await getDependencyAdvanced ( simple, packages, packagesMap );
  //   advanceds.push ( advanced );
  // }

  await Promise.all ( simples.map ( async simple => {
    const advanced = await getDependencyAdvanced ( simple, packages, packagesMap );
    advanceds.push ( advanced );
  }));

  const advancedsSorted = advanceds.sort ( ( a, b ) => a.name.localeCompare ( b.name ) );

  return advancedsSorted;

};

const getDependenciesTree = (): DependencyRoot => {

  const scope = ( ARGV['prod'] && !ARGV['dev'] ) ? '--prod' : ( ( ARGV['dev'] && !ARGV['prod'] ) ? '--dev' : '--all' ); //FIXME: https://github.com/npm/cli/issues/5887
  const process = spawnSync ( 'npm', ['ls', scope, '--all', '--json'] );
  const stdout = process.stdout.toString ();
  const tree = JSON.parse ( stdout );

  return tree;

};

/* UTILS - GET REPORTS */

const getReportSimple = async (): Promise<ReportSimple> => {

  const tree = getDependenciesTree ();
  const simples = getDependenciesSimple ( tree );

  return simples;

};

const getReportAdvanced = async (): Promise<ReportAdvanced> => {

  const tree = getDependenciesTree ();
  const simples = getDependenciesSimple ( tree );
  const packages = await getDependenciesPackages ();
  const advanceds = await getDependenciesAdvanced ( simples, packages );

  return advanceds;

};

const getReportESM = async (): Promise<ReportESM> => {

  const advanceds = await getReportAdvanced ();
  const advancedsByESM = groupBy ( advanceds, advanced => advanced.esm ? 'true' : 'false' );
  const advancedsByESMSorted = sortKeys ( advancedsByESM, ( a, b ) => b.localeCompare ( a ) );

  return advancedsByESMSorted;

};

const getReportLicense = async (): Promise<ReportLicense> => {

  const advanceds = await getReportAdvanced ();
  const advancedsByLicense = groupBy ( advanceds, advanced => advanced.spdx || 'false' );
  const advancedsByLicenseSorted = sortKeys ( advancedsByLicense, ( a, b ) => isSPDXPermissive ( a ) && isSPDXPermissive ( b ) ? a.localeCompare ( b ) : isSPDXPermissive ( a ) || b === 'false' ? -1 : isSPDXPermissive ( b ) || a === 'false' ? 1 : a.localeCompare ( b ) );

  return advancedsByLicenseSorted;

};

const getReportGitHub = async (): Promise<ReportGitHub> => {

  return getReportAdvanced ();

};

const getReportOwner = async (): Promise<ReportOwner> => {

  const advanceds = await getReportAdvanced ();
  const advancedsByOwner = groupBy ( advanceds, advanced => advanced.owner || 'false' );
  const advancedsByOwnerSorted = sortKeys ( advancedsByOwner, ( a, b ) => a.localeCompare ( b ) );

  return advancedsByOwnerSorted;

};

const getReportDuplicates = async (): Promise<ReportDuplicates> => {

  const advanceds = await getReportAdvanced ();
  const advancedsByDuplicates = groupBy ( advanceds, advanced => advanced.name );
  const advancedsByDuplicatesSorted = sortKeys ( advancedsByDuplicates, ( a, b ) => b.localeCompare ( a ) );

  Object.keys ( advancedsByDuplicatesSorted ).forEach ( key => {
    if ( advancedsByDuplicatesSorted[key].length > 2 ) return;
    delete advancedsByDuplicatesSorted[key];
  });

  return advancedsByDuplicatesSorted;

};

/* UTILS - PRINT REPORTS */

const printReportSimple = async ( report: ReportSimple ): Promise<void> => {

  const lines: string[] = [];

  report.map ( ({ name, version }) => {

    lines.push ( `- ${color.cyan ( name )} ${color.gray ( version )}` );

  });

  return console.log ( lines.join ( '\n' ) );

};

const printReportAdvanced = async ( report: ReportAdvanced ): Promise<void> => {

  const lines: string[] = [];

  report.map ( ({ name, version, spdx, esm, package: pkg, repositoryUrl, repositoryReadmeUrl, repositoryLicenseUrl }) => {

    lines.push ( `- ${color.cyan ( name )} ${color.gray ( version )}` );
    lines.push ( `  - Description: ${pkg?.description ? pkg.description : color.red ( 'Missing' )} ` );
    lines.push ( `  - SPDX: ${spdx ? ( isSPDXPermissive ( spdx ) ? color.green ( spdx ) : color.yellow ( spdx ) ) : color.red ( 'Unknown' )}` );
    lines.push ( `  - ESM: ${esm ? color.green ( 'Yes' ) : color.red ( 'No' )}` );
    lines.push ( `  - Repository: ${repositoryUrl ? color.green ( repositoryUrl ) : color.red ( 'Unknown' )}` );
    lines.push ( `  - Readme: ${repositoryReadmeUrl ? color.green ( repositoryReadmeUrl ) : color.red ( 'Unknown' )}` );
    lines.push ( `  - License: ${repositoryLicenseUrl ? color.green ( repositoryLicenseUrl ) : color.red ( 'Unknown' )}` );

  });

  return console.log ( lines.join ( '\n' ) );

};

const printReportESM = async ( report: ReportESM ): Promise<void> => {

  const lines: string[] = [];

  for ( const esm in report ) {

    lines.push ( `- ${esm === 'true' ? color.green ( 'ESM' ) : color.red ( 'No ESM' )}` );

    report[esm].map ( ({ name, version, repositoryUrl, repositoryReadmeUrl, repositoryLicenseUrl }) => {

      lines.push ( `  - ${color.cyan ( name )} ${color.gray ( version )}` );
      lines.push ( `    - Repository: ${repositoryUrl ? color.green ( repositoryUrl ) : color.red ( 'Unknown' )}` );
      lines.push ( `    - Readme: ${repositoryReadmeUrl ? color.green ( repositoryReadmeUrl ) : color.red ( 'Unknown' )}` );
      lines.push ( `    - License: ${repositoryLicenseUrl ? color.green ( repositoryLicenseUrl ) : color.red ( 'Unknown' )}` );

    });

  }

  return console.log ( lines.join ( '\n' ) );

};

const printReportLicense = async ( report: ReportLicense ): Promise<void> => {

  const lines: string[] = [];

  for ( const spdx in report ) {

    lines.push ( `- ${spdx === 'false' ? color.red ( 'Unknown' ) : isSPDXPermissive ( spdx ) ? color.green ( spdx ) : color.yellow ( spdx )}` );

    report[spdx].map ( ({ name, version, repositoryUrl, repositoryReadmeUrl, repositoryLicenseUrl }) => {

      lines.push ( `  - ${color.cyan ( name )} ${color.gray ( version )}` );
      lines.push ( `    - Repository: ${repositoryUrl ? color.green ( repositoryUrl ) : color.red ( 'Unknown' )}` );
      lines.push ( `    - Readme: ${repositoryReadmeUrl ? color.green ( repositoryReadmeUrl ) : color.red ( 'Unknown' )}` );
      lines.push ( `    - License: ${repositoryLicenseUrl ? color.green ( repositoryLicenseUrl ) : color.red ( 'Unknown' )}` );

    });

  }

  return console.log ( lines.join ( '\n' ) );

};

const printReportGitHub = async ( report: ReportGitHub ): Promise<void> => {

  const lines: string[] = [];

  report.map ( ({ name, version, repository }) => {

    lines.push ( `- ${color.cyan ( name )} ${color.gray ( version )}` );

    if ( repository ) {

      lines.push ( `  - Description: ${repository.description || color.red ( 'Missing' )} ` );
      lines.push ( `  - Keywords: ${repository.topics.length ? repository.topics.join ( ', ' ) : color.red ( 'Missing' )}` );
      lines.push ( `  - Stars: ${color.yellow ( String ( repository.stargazers_count ) )}` );
      lines.push ( `  - Watchers: ${color.yellow ( String ( repository.watchers_count ) )}` );
      lines.push ( `  - Forks: ${color.yellow ( String ( repository.forks_count ) )}` );
      lines.push ( `  - Issues: ${color.yellow ( String ( repository.open_issues ) )}` );
      lines.push ( `  - Repository: ${color.green ( repository.html_url )}` );
      lines.push ( `  - Owner: ${color.green ( repository.owner.html_url )}` );
      lines.push ( `  - Issues: ${color.green ( repository.issues_url.replace ( '{/number}', '' ) )}` );
      lines.push ( `  - Pulls: ${color.green ( repository.pulls_url.replace ( '{/number}', '' ) )}` );

    } else {

      lines.push ( `  - Description: ${color.red ( 'Unknown' )}` );
      lines.push ( `  - Keywords: ${color.red ( 'Unknown' )}` );
      lines.push ( `  - Stars: ${color.red ( 'Unknown' )}` );
      lines.push ( `  - Watchers: ${color.red ( 'Unknown' )}` );
      lines.push ( `  - Forks: ${color.red ( 'Unknown' )}` );
      lines.push ( `  - Issues: ${color.red ( 'Unknown' )}` );
      lines.push ( `  - Repository: ${color.red ( 'Unknown' )}` );
      lines.push ( `  - Owner: ${color.red ( 'Unknown' )}` );
      lines.push ( `  - Issues: ${color.red ( 'Unknown' )}` );
      lines.push ( `  - Pulls: ${color.red ( 'Unknown' )}` );

    }

  });

  return console.log ( lines.join ( '\n' ) );

};

const printReportOwner = async ( report: ReportOwner ): Promise<void> => {

  const lines: string[] = [];

  for ( const owner in report ) {

    lines.push ( `- ${owner === 'false' ? color.red ( 'Unknown' ) : color.green ( owner )}` );

    report[owner].map ( ({ name, version, repositoryUrl, repositoryReadmeUrl, repositoryLicenseUrl }) => {

      lines.push ( `  - ${color.cyan ( name )} ${color.gray ( version )}` );
      lines.push ( `    - Repository: ${repositoryUrl ? color.green ( repositoryUrl ) : color.red ( 'Unknown' )}` );
      lines.push ( `    - Readme: ${repositoryReadmeUrl ? color.green ( repositoryReadmeUrl ) : color.red ( 'Unknown' )}` );
      lines.push ( `    - License: ${repositoryLicenseUrl ? color.green ( repositoryLicenseUrl ) : color.red ( 'Unknown' )}` );

    });

  }

  return console.log ( lines.join ( '\n' ) );

};

const printReportDuplicates = async ( report: ReportDuplicates ): Promise<void> => {

  const lines: string[] = [];

  for ( const name in report ) {

    lines.push ( `- ${color.cyan ( name )}` );

    report[name].map ( ({ version, repositoryUrl, repositoryReadmeUrl, repositoryLicenseUrl }) => {

      lines.push ( `  - ${color.gray ( version )}` );
      lines.push ( `    - Repository: ${repositoryUrl ? color.green ( repositoryUrl ) : color.red ( 'Unknown' )}` );
      lines.push ( `    - Readme: ${repositoryReadmeUrl ? color.green ( repositoryReadmeUrl ) : color.red ( 'Unknown' )}` );
      lines.push ( `    - License: ${repositoryLicenseUrl ? color.green ( repositoryLicenseUrl ) : color.red ( 'Unknown' )}` );

    });

  }

  return console.log ( lines.join ( '\n' ) );

};

/* EXPORT */

export {exit, inspect, partition};
export {getCachedJSON, getFileJSON, isPackage};
export {getDependencyId, getDependencyName, getDependencyPackage, getDependencyAdvanced};
export {getRepository, getRepositoryFromPackage, getRepositoryContent, getRepositoryOwnerAndRepo, getRepositoryMetadata, getRepositoryReadme, getRepositoryLicense};
export {getDependenciesPackages, getDependenciesSimple, getDependenciesAdvanced, getDependenciesTree};
export {getReportSimple, getReportAdvanced, getReportESM, getReportLicense, getReportGitHub, getReportOwner, getReportDuplicates};
export {printReportSimple, printReportAdvanced, printReportESM, printReportLicense, printReportGitHub, printReportOwner, printReportDuplicates};
