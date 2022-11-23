#!/usr/bin/env node

/* IMPORT */

import {program, updater} from 'specialist';
import {exit} from './utils'
import Depsman from '.';

/* HELPERS */

const name = 'depsman';
const version = '1.0.2';
const description = 'Extract and report metadata about dependencies of the current package.';

/* MAIN */

updater ({ name, version });

program
  .name ( name )
  .version ( version )
  .description ( description )
  .option ( '--no-color', 'Disable colors' )
  .option ( '--fresh', 'Ignore the cache, download things again' )
  .option ( '--dev', 'Include only development dependencies' )
  .option ( '--prod', 'Include only production dependencies' )
  .option ( '--json', 'Output the report as JSON' )
  .option ( '--report <report>', 'Report to generate: simple, advanced, esm, license, github, owner', 'simple' )
  .option ( '--token <token>', 'GitHub personal access token' )
  .action ( async options => {
    if ( options.dev ) exit ( 'The "--dev" flag is not yet supported' );
    if ( options.json ) {
      await Depsman.printJSON ( options.report );
    } else {
      await Depsman.printHuman ( options.report );
    }
    process.exit ( 0 );
  });

program.parse ();
