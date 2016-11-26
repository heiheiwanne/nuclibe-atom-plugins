'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import {sleep} from '../pkg/commons-node/promise';
import {
  activateAllPackages,
  jasmineIntegrationTestSetup,
  deactivateAllPackages,
} from './utils/integration-test-helpers';
import WS from 'ws';

describe('React Native Inspector', () => {

  beforeEach(() => {
    waitsForPromise(async () => {
      // Configure some jasmine specific things for integration testing.
      jasmineIntegrationTestSetup();
      // Activate nuclide packages.
      await activateAllPackages();
    });
  });

  afterEach(() => {
    // Deactivate nuclide packages.
    deactivateAllPackages();
  });

  it('tries to connect to the RN app on port 8097', () => {
    // Activate the Inspector
    atom.commands.dispatch(
      atom.views.getView(atom.workspace),
      'nuclide-react-inspector:toggle',
      {visible: true},
    );

    waitsForPromise({timeout: 3000}, async () => {
      // Keep trying to connect to the server.
      for (;;) {
        try {
          // eslint-disable-next-line babel/no-await-in-loop
          await tryToConnect();
          return;
        } catch (err) {
          // eslint-disable-next-line babel/no-await-in-loop
          await sleep(500);
        }
      }
    });
  });

});

function tryToConnect(): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WS('ws://localhost:8097/devtools');
    ws.on('error', reject);
    ws.on('open', resolve);
  });
}
