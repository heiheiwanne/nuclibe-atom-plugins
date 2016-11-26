'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import logger from './utils';
import type {PhpDebuggerSessionConfig} from './PhpDebuggerService';

const defaultConfig: PhpDebuggerSessionConfig = {
  xdebugAttachPort: 9000,
  xdebugLaunchingPort: 10112,
  logLevel: 'INFO',
  targetUri: '',
  phpRuntimePath: '/usr/local/bin/php',
  phpRuntimeArgs: '',
  dummyRequestFilePath: 'php_only_xdebug_request.php',
  stopOneStopAll: false,
};

let config: PhpDebuggerSessionConfig = defaultConfig;

export function getConfig(): PhpDebuggerSessionConfig {
  return config;
}

export function setConfig(newConfig: PhpDebuggerSessionConfig): void {
  config = {
    ...newConfig,
  };
  logger.log(`Config was set to ${JSON.stringify(config)}`);
}

export function clearConfig(): void {
  config = defaultConfig;
}
