
/* IMPORT */

import process from 'node:process';
import {parseArgv} from 'specialist';

/* MAIN */

const ARGV = parseArgv ( process.argv );

const CACHE_VERSION = 'v0';

const GITHUB_TOKEN = ARGV['github-token'] || ARGV['token'] || process.env['DEPSMAN_GITHUB_TOKEN'] || process.env['GITHUB_TOKEN'];

const HAS_COLORS = !( 'NO_COLOR' in process.env ) && !process.argv.includes ( '--no-color' );

const IS_FRESH = process.argv.includes ( '--fresh' );

/* EXPORT */

export {ARGV, CACHE_VERSION, GITHUB_TOKEN, HAS_COLORS, IS_FRESH};
