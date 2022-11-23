
/* TYPES - DEPENDENCY */

type DependencyRoot = {
  name: string,
  version: string,
  dependencies?: DependencyNodes
};

type DependencyNode = {
  resolved?: string,
  version: string,
  dependencies?: DependencyNodes
};

type DependencyNodes = {
  [name: string]: DependencyNode
};

type DependencySimple = {
  id: string,
  name: string,
  registry?: string,
  version: string,
  nodesNr: number
};

type DependencyAdvanced = DependencySimple & {
  esm: boolean,
  spdx?: string,
  owner?: string,
  repo?: string,
  package?: Package,
  repository?: Repository,
  repositoryUrl?: string,
  repositoryReadmeUrl?: string,
  repositoryReadme?: string,
  repositoryLicenseUrl?: string,
  repositoryLicense?: string
};

/* TYPES - OTHER */

type Package = any; //TODO: make this way more exhaustive

type Repository = any; //TODO: make this way more exhaustive

/* TYPES - REPORT */

type ReportSimple = DependencySimple[];

type ReportAdvanced = DependencyAdvanced[];

type ReportESM = Record<string, DependencyAdvanced[]>;

type ReportLicense = Record<string, DependencyAdvanced[]>;

type ReportGitHub = DependencyAdvanced[];

type ReportOwner = Record<string, DependencyAdvanced[]>;

type ReportDuplicates = Record<string, DependencyAdvanced[]>;

/* EXPORT */

export type {DependencyRoot, DependencyNode, DependencyNodes, DependencySimple, DependencyAdvanced};
export type {Package, Repository};
export type {ReportSimple, ReportAdvanced, ReportESM, ReportLicense, ReportGitHub, ReportOwner, ReportDuplicates};
