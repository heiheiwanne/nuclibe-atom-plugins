'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import typeof * as FlowService from '../../pkg/nuclide-flow-rpc';

import invariant from 'assert';
import child_process from 'child_process';

import nuclideUri from '../../pkg/commons-node/nuclideUri';
import {RemoteConnection, getServiceByNuclideUri} from '../../pkg/nuclide-remote-connection';
import {getMountedReactRootNames} from '../../pkg/commons-atom/testHelpers';

// TEST_NUCLIDE_SERVER_PORT can be set by the test runner to allow simultaneous remote tests.
const SERVER_PORT = parseInt(process.env.TEST_NUCLIDE_SERVER_PORT, 10) || 9090;

export function jasmineIntegrationTestSetup(): void {
  // To run remote tests, we have to star the nuclide server. It uses `nohup`, but apparently
  // `nohup` doesn't work from within tmux, so starting the server fails.
  invariant(
    process.env.TMUX == null,
    'ERROR: tmux interferes with remote integration tests -- please run the tests outside of tmux',
  );
  // Allow jasmine to interact with the DOM.
  jasmine.attachToDOM(atom.views.getView(atom.workspace));

  // This prevents zombie buck/java processes from hanging the tests
  process.env.NO_BUCKD = '1';

  // Set the testing window dimensions (smallish, yet realistic).
  // TODO: In Atom 1.10.0 these styles changed. https://github.com/atom/atom/pull/11960
  // .spec-reporter-container now covers #jasmine-content and that makes it
  // annoying to debug issues. Fix this.
  const styleCSS = `
    height: 600px;
    width: 1000px;
  `;
  document.querySelector('#jasmine-content').setAttribute('style', styleCSS);

  // Unmock timer functions.
  jasmine.useRealClock();

  // Atom will add the fixtures directory to the project during tests.
  // We'd like to have Atom start with a clean slate.
  // https://github.com/atom/atom/blob/v1.7.3/spec/spec-helper.coffee#L66
  atom.project.setPaths([]);
}

/**
 * Activates all nuclide and fb atom packages that do not defer their own
 * activation until a certain command or hook is executed.
 *
 * @returns A promise that resolves to an array of strings, which are the names
 * of all the packages that this function activates.
 */
export async function activateAllPackages(): Promise<Array<string>> {
  // These are packages we want to activate, including some which come bundled
  // with atom, or ones widely used in conjunction with nuclide.
  const whitelist = [
    'autocomplete-plus',
    'hyperclick',
    'status-bar',
    'tool-bar',
  ];

  // Manually call `triggerDeferredActivationHooks` since Atom doesn't call it via
  // `atom.packages.activate()` during tests. Calling this before we activate
  // Nuclide packages sets `deferredActivationHooks` to `null`, so that deferred
  // activation hooks are triggered as needed instead of batched.
  // https://github.com/atom/atom/blob/v1.8.0/src/package-manager.coffee#L467-L472
  atom.packages.triggerDeferredActivationHooks();

  const packageNames = atom.packages.getAvailablePackageNames().filter(name => {
    const pack = atom.packages.loadPackage(name);
    if (pack == null) {
      return false;
    }
    const isActivationDeferred = pack.hasActivationCommands() || pack.hasActivationHooks();
    const isLanguagePackage = name.startsWith('language-');
    const inWhitelist = whitelist.indexOf(name) >= 0;
    return (isLanguagePackage || inWhitelist) && !isActivationDeferred;
  });

  // Include the path to the nuclide package.
  packageNames.push(nuclideUri.dirname(require.resolve('../../package.json')));
  // Include the path to the tool-bar package
  packageNames.push(nuclideUri.join(String(process.env.ATOM_HOME), 'packages/tool-bar'));

  await Promise.all(packageNames.map(pack => atom.packages.activatePackage(pack)));
  return atom.packages.getActivePackages().map(pack => pack.name);
}

export function deactivateAllPackages(): void {
  atom.packages.deactivatePackages();
  atom.packages.unloadPackages();

  const mountedReactRootNames = getMountedReactRootNames();
  mountedReactRootNames.forEach(rootDisplayName => {
    // eslint-disable-next-line no-console
    console.error(
      'Found a mounted React component. ' +
      `Did you forget to call React.unmountComponentAtNode on "${rootDisplayName}"?`,
    );
  });

  expect(mountedReactRootNames.length).toBe(0);
}

/**
 * Starts a local version of the nuclide server in insecure mode on the
 * specified port. The server is started in a separate process than the caller's.
 */
export function startNuclideServer(): void {
  child_process.spawnSync(
    require.resolve('../../pkg/nuclide-server/nuclide-start-server'),
    ['-k', `--port=${SERVER_PORT}`],
  );
}

/**
 * Kills the nuclide server associated with `connection`, and closes the
 * connection.
 */
export async function stopNuclideServer(
  connection: RemoteConnection,
): Promise<void> {
  const path = connection.getUriForInitialWorkingDirectory();
  // Clean up the underlying Hg repository (if it exists) by removing the project.
  // Otherwise, we'll have dangling subscriptions that error when the server exits.
  atom.project.removePath(path);
  const service: ?FlowService = getServiceByNuclideUri('FlowService', path);
  invariant(service);
  service.dispose();
  // If this ever fires, either ensure that your test closes all RemoteConnections
  // or we can add a force shutdown method to ServerConnection.
  invariant(connection.isOnlyConnection());
  const attemptShutdown = true;
  await connection.close(attemptShutdown);
}

/**
 * Add a remote project to nuclide.  This function bypasses the SSH
 * authentication that the server normally uses. `projectPath` is a path to a
 * local directory. This function assumes that the nuclide server has been
 * started in insecure mode, e.g. with using the
 * integration-test-helpers.startNuclideServer function.
 */
export async function addRemoteProject(
  projectPath: string,
): Promise<?RemoteConnection> {
  return await RemoteConnection._createInsecureConnectionForTesting(
    projectPath,
    SERVER_PORT,
  );
}
