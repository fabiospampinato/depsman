#!/usr/bin/env node

/* IMPORT */

import {bin} from 'specialist';
import {exit} from './utils'
import Depsman from '.';

/* MAIN */

bin ( 'depsman', 'Extract and report metadata about dependencies of the current package' )
  /* DEFAULT COMMAND */
  .option ( '--fresh', 'Ignore the cache, download things again' )
  .option ( '--dev', 'Include only development dependencies' )
  .option ( '--prod', 'Include only production dependencies' )
  .option ( '--json', 'Output the report as JSON' )
  .option ( '--report <report>', 'Report to generate: simple, advanced, esm, license, github, owner, duplicates', { default: 'simple', enum: ['simple', 'advanced', 'esm', 'license', 'github', 'owner', 'duplicates'] } )
  .option ( '--token <token>', 'GitHub personal access token' )
  .action ( options => {
    const {dev, json, report} = options;
    if ( dev ) exit ( 'The "--dev" flag is not yet supported' );
    if ( json ) {
      return Depsman.printJSON ( report );
    } else {
      return Depsman.printHuman ( report );
    }
  })
  /* RUN */
  .run ();
