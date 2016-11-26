'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {
  DbgpBreakpoint,
  FileLineBreakpointInfo,
} from './DbgpSocket';

import invariant from 'assert';
import logger from './utils';
import {
  ConnectionStatus,
} from './DbgpSocket';

import type {Connection} from './Connection';

type XDebugBreakpointId = string;

export type BreakpointId = string;
export type Breakpoint = {
  chromeId: BreakpointId,
  breakpointInfo: FileLineBreakpointInfo,
  resolved: boolean,
};

export type ExceptionState = 'none' | 'uncaught' | 'all';

const PAUSE_ALL_EXCEPTION_NAME = '*';
const EXCEPTION_PAUSE_STATE_ALL = 'all';

// Stores breakpoints and connections.
//
// Added breakpoints are given a unique id and are added to all available connections.
//
// Breakpoints may be added before any connections.
//
// Care is taken to ensure that operations are atomic in the face of async turns.
// Specifically, removing a breakpoint removes it from all connection's maps
// before returning.
export class BreakpointStore {
  _breakpointCount: number;
  // For each connection a map from the chrome's breakpoint id to
  // the Connection's xdebug breakpoint id.
  _connections: Map<Connection, Map<BreakpointId, XDebugBreakpointId>>;
  // Client visible breakpoint map from
  // chrome breakpoint id to Breakpoint object.
  _breakpoints: Map<BreakpointId, Breakpoint>;
  _pauseAllExceptionBreakpointId: ?BreakpointId;

  constructor() {
    this._breakpointCount = 0;
    this._connections = new Map();
    this._breakpoints = new Map();
    this._pauseAllExceptionBreakpointId = null;
  }

  async setFileLineBreakpoint(
    chromeId: BreakpointId,
    filename: string,
    lineNumber: number,
    conditionExpression: ?string,
  ): Promise<BreakpointId> {
    const breakpointInfo = {filename, lineNumber, conditionExpression};
    this._breakpoints.set(chromeId, {
      chromeId,
      breakpointInfo,
      resolved: false,
    });
    const breakpointPromises = Array.from(this._connections.entries())
      .map(async entry => {
        const [connection, map] = entry;
        const xdebugBreakpointId = await connection.setFileLineBreakpoint(breakpointInfo);
        map.set(chromeId, xdebugBreakpointId);
      });
    await Promise.all(breakpointPromises);
    await this._updateBreakpointInfo(chromeId);
    return chromeId;
  }

  async _updateBreakpointInfo(chromeId: BreakpointId): Promise<void> {
    for (const entry of this._connections) {
      const [connection, map] = entry;
      const xdebugBreakpointId = map.get(chromeId);
      invariant(xdebugBreakpointId != null);
      const promise = connection.getBreakpoint(xdebugBreakpointId);
      const xdebugBreakpoint = await promise; // eslint-disable-line babel/no-await-in-loop
      this.updateBreakpoint(chromeId, xdebugBreakpoint);
      // Breakpoint status should be the same for all connections
      // so only need to fetch from the first connection.
      break;
    }
  }

  getBreakpoint(breakpointId: BreakpointId): ?Breakpoint {
    return this._breakpoints.get(breakpointId);
  }

  getBreakpointIdFromConnection(
    connection: Connection,
    xdebugBreakpoint: DbgpBreakpoint,
  ): ?BreakpointId {
    const map = this._connections.get(connection);
    invariant(map);
    for (const [key, value] of map) {
      if (value === xdebugBreakpoint.id) {
        return key;
      }
    }
    return null;
  }

  updateBreakpoint(chromeId: BreakpointId, xdebugBreakpoint: DbgpBreakpoint): void {
    const breakpoint = this._breakpoints.get(chromeId);
    invariant(breakpoint != null);
    const {breakpointInfo} = breakpoint;
    breakpointInfo.lineNumber = xdebugBreakpoint.lineno || breakpointInfo.lineNumber;
    breakpointInfo.filename = xdebugBreakpoint.filename || breakpointInfo.filename;
    if (xdebugBreakpoint.resolved != null) {
      breakpoint.resolved = (xdebugBreakpoint.resolved === 'resolved');
    } else {
      breakpoint.resolved = true;
    }
  }

  async removeBreakpoint(breakpointId: BreakpointId): Promise<any> {
    this._breakpoints.delete(breakpointId);
    return await this._removeBreakpointFromConnections(breakpointId);
  }

  /**
   * TODO[jeffreytan]: look into unhandled exception support.
   * Dbgp protocol does not seem to support uncaught exception handling
   * so we only support 'all' and treat all other states as 'none'.
   */
  async setPauseOnExceptions(chromeId: BreakpointId, state: ExceptionState): Promise<void> {
    if (state !== EXCEPTION_PAUSE_STATE_ALL) {
      // Try to remove any existing exception breakpoint.
      return await this._removePauseAllExceptionBreakpointIfNeeded();
    }
    this._pauseAllExceptionBreakpointId = chromeId;

    const breakpointPromises = Array.from(this._connections.entries())
      .map(async entry => {
        const [connection, map] = entry;
        const xdebugBreakpointId =
          await connection.setExceptionBreakpoint(PAUSE_ALL_EXCEPTION_NAME);
        map.set(chromeId, xdebugBreakpointId);
      });
    await Promise.all(breakpointPromises);
  }

  async _removePauseAllExceptionBreakpointIfNeeded(): Promise<void> {
    const breakpointId = this._pauseAllExceptionBreakpointId;
    if (breakpointId) {
      this._pauseAllExceptionBreakpointId = null;
      return await this._removeBreakpointFromConnections(breakpointId);
    } else {
      // This can happen if users switch between 'none' and 'uncaught' states.
      logger.log('No exception breakpoint to remove.');
      return Promise.resolve();
    }
  }

  _removeBreakpointFromConnections(breakpointId: BreakpointId): Promise<any> {
    return Promise.all(Array.from(this._connections.entries())
      .map(entry => {
        const [connection, map] = entry;
        if (map.has(breakpointId)) {
          const connectionIdPromise = map.get(breakpointId);
          invariant(connectionIdPromise != null);
          map.delete(breakpointId);
          // Ensure we've removed from the connection's map before awaiting.
          return (async () => connection.removeBreakpoint(await connectionIdPromise))();
        } else {
          return Promise.resolve();
        }
      }));
  }

  async addConnection(connection: Connection): Promise<void> {
    const map: Map<BreakpointId, XDebugBreakpointId> = new Map();
    const breakpointPromises = Array.from(this._breakpoints.values())
      .map(async breakpoint => {
        const {chromeId, breakpointInfo} = breakpoint;
        const xdebugBreakpointId =
          await connection.setFileLineBreakpoint(breakpointInfo);
        map.set(chromeId, xdebugBreakpointId);
      });
    await Promise.all(breakpointPromises);
    if (this._pauseAllExceptionBreakpointId) {
      const breakpoitnId = await connection.setExceptionBreakpoint(PAUSE_ALL_EXCEPTION_NAME);
      invariant(this._pauseAllExceptionBreakpointId != null);
      map.set(
        this._pauseAllExceptionBreakpointId,
        breakpoitnId,
      );
    }
    this._connections.set(connection, map);
    connection.onStatus(status => {
      switch (status) {
        case ConnectionStatus.Stopping:
        case ConnectionStatus.Stopped:
        case ConnectionStatus.Error:
        case ConnectionStatus.End:
          this._removeConnection(connection);
      }
    });
  }

  _removeConnection(connection: Connection): void {
    if (this._connections.has(connection)) {
      this._connections.delete(connection);
    }
  }
}
