
/* IMPORT */

import {exit} from 'specialist';
import {inspect} from './utils';
import {getReportSimple, getReportAdvanced, getReportESM, getReportLicense, getReportGitHub, getReportOwner, getReportDuplicates} from './utils';
import {printReportSimple, printReportAdvanced, printReportESM, printReportLicense, printReportGitHub, printReportOwner, printReportDuplicates} from './utils';
import type {ReportSimple, ReportAdvanced, ReportESM, ReportLicense, ReportGitHub, ReportOwner} from './types';

/* MAIN */

const Depsman = new class {

  /* API */

  async get ( type: 'simple' ): Promise<ReportSimple>
  async get ( type: 'advanced' ): Promise<ReportAdvanced>
  async get ( type: 'esm' ): Promise<ReportESM>
  async get ( type: 'license' ): Promise<ReportLicense>
  async get ( type: 'github' ): Promise<ReportGitHub>
  async get ( type: 'owner' ): Promise<ReportOwner>
  async get ( type: 'duplicates' ): Promise<ReportOwner>
  async get ( type: 'simple' | 'advanced' | 'esm' | 'license' | 'github' | 'owner' | 'duplicates' ) {

    if ( type === 'simple' ) {

      return getReportSimple ();

    } else if ( type === 'advanced' ) {

      return getReportAdvanced ();

    } else if ( type === 'esm' ) {

      return getReportESM ();

    } else if ( type === 'license' ) {

      return getReportLicense ();

    } else if ( type === 'github' ) {

      return getReportGitHub ();

    } else if ( type === 'owner' ) {

      return getReportOwner ();

    } else if ( type === 'duplicates' ) {

      return getReportDuplicates ();

    } else {

      exit ( `Unsupported report: "${type}"` );

    }

  }

  async printJSON ( type: 'simple' ): Promise<void>
  async printJSON ( type: 'advanced' ): Promise<void>
  async printJSON ( type: 'esm' ): Promise<void>
  async printJSON ( type: 'license' ): Promise<void>
  async printJSON ( type: 'github' ): Promise<void>
  async printJSON ( type: 'owner' ): Promise<void>
  async printJSON ( type: 'duplicates' ): Promise<void>
  async printJSON ( type: 'simple' | 'advanced' | 'esm' | 'license' | 'github' | 'owner' | 'duplicates' ): Promise<void> {

    if ( type === 'simple' ) {

      inspect ( await getReportSimple () );

    } else if ( type === 'advanced' ) {

      inspect ( await getReportAdvanced () );

    } else if ( type === 'esm' ) {

      inspect ( await getReportESM () );

    } else if ( type === 'license' ) {

      inspect ( await getReportLicense () );

    } else if ( type === 'github' ) {

      inspect ( await getReportGitHub () );

    } else if ( type === 'owner' ) {

      inspect ( await getReportOwner () );

    } else if ( type === 'duplicates' ) {

      inspect ( await getReportDuplicates () );

    } else {

      exit ( `Unsupported report: "${type}"` );

    }

  }

  async printHuman ( type: 'simple' ): Promise<void>
  async printHuman ( type: 'advanced' ): Promise<void>
  async printHuman ( type: 'esm' ): Promise<void>
  async printHuman ( type: 'license' ): Promise<void>
  async printHuman ( type: 'github' ): Promise<void>
  async printHuman ( type: 'owner' ): Promise<void>
  async printHuman ( type: 'duplicates' ): Promise<void>
  async printHuman ( type: 'simple' | 'advanced' | 'esm' | 'license' | 'github' | 'owner' | 'duplicates' ): Promise<void> {

    if ( type === 'simple' ) {

      printReportSimple ( await getReportSimple () );

    } else if ( type === 'advanced' ) {

      printReportAdvanced ( await getReportAdvanced () );

    } else if ( type === 'esm' ) {

      printReportESM ( await getReportESM () );

    } else if ( type === 'license' ) {

      printReportLicense ( await getReportLicense () );

    } else if ( type === 'github' ) {

      printReportGitHub ( await getReportGitHub () );

    } else if ( type === 'owner' ) {

      printReportOwner ( await getReportOwner () );

    } else if ( type === 'duplicates' ) {

      printReportDuplicates ( await getReportDuplicates () );

    } else {

      exit ( `Unsupported report: "${type}"` );

    }

  }

};

/* EXPORT */

export default Depsman;
