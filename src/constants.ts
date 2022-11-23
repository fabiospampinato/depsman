
/* IMPORT */

import process from 'node:process';
import parseArgv from 'tiny-parse-argv';

/* MAIN */

const ARGV = parseArgv ();

const CACHE_VERSION = 'v0';

const GITHUB_TOKEN = ARGV['github-token'] || ARGV['token'] || process.env['GITHUB_TOKEN'];

const HAS_COLORS = !( 'NO_COLOR' in process.env ) && !process.argv.includes ( '--no-color' );

const IS_FRESH = process.argv.includes ( '--fresh' );

/* EXPORT */

export {ARGV, CACHE_VERSION, GITHUB_TOKEN, HAS_COLORS, IS_FRESH};
