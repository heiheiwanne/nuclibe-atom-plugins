'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import {VERSION_TIMEOUT_MS} from './FlowConstants';

type VersionWithTimestamp = {
  version: ?string,
  receivedTime: number,
};

/*
 * Queries Flow for its version and caches the results. The version is a best guess: it is not 100%
 * guaranteed to be reliable due to caching, but will nearly always be correct.
 */
export class FlowVersion {
  _lastVersion: ?VersionWithTimestamp;

  _versionFn: () => Promise<?string>;

  constructor(
    versionFn: () => Promise<?string>,
  ) {
    this._versionFn = versionFn;
    this._lastVersion = null;
  }

  invalidateVersion(): void {
    this._lastVersion = null;
  }

  async getVersion(): Promise<?string> {
    const lastVersion = this._lastVersion;
    if (lastVersion == null) {
      return await this._queryAndSetVersion();
    }
    const msSinceReceived = Date.now() - lastVersion.receivedTime;
    if (msSinceReceived >= VERSION_TIMEOUT_MS) {
      return await this._queryAndSetVersion();
    }
    return lastVersion.version;
  }

  async _queryAndSetVersion(): Promise<?string> {
    const version = await this._versionFn();
    this._lastVersion = {
      version,
      receivedTime: Date.now(),
    };
    return version;
  }
}
