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
  NuclideRemoteConnectionProfile,
  NuclideSavedConnectionDialogConfig,
} from './connection-types';

import type {
  SshConnectionConfiguration,
} from '../../nuclide-remote-connection/lib/SshHandshake';

import invariant from 'assert';
import featureConfig from '../../commons-atom/featureConfig';

/**
 * Section: Default Connection Profile
 */

/**
 * A default connection profile is a combination of the user's last inputs to
 * the connection dialog and the default settings, plus the update logic we use
 * to change the remote server command.
 */
export function getDefaultConnectionProfile(): NuclideRemoteConnectionProfile {
  const defaultConnectionSettings = getDefaultConfig();
  const currentOfficialRSC = defaultConnectionSettings.remoteServerCommand;

  const rawLastConnectionDetails =
    window.localStorage.getItem('nuclide:nuclide-remote-projects:lastConnectionDetails');

  let lastConnectionDetails: ?NuclideSavedConnectionDialogConfig;
  try {
    lastConnectionDetails = JSON.parse(rawLastConnectionDetails);
  } catch (err) {
    // nothing to do...
  } finally {
    if (lastConnectionDetails == null) {
      lastConnectionDetails = {};
    }
  }

  invariant(lastConnectionDetails != null);
  const {lastOfficialRemoteServerCommand, updatedConfig} = lastConnectionDetails;
  const lastConfig = updatedConfig || {};

  // Only use the user's last saved remote server command if there has been no
  // change (upgrade) in the official remote server command.
  let remoteServerCommand = currentOfficialRSC;
  if (lastOfficialRemoteServerCommand === currentOfficialRSC
      && lastConfig.remoteServerCommand) {
    remoteServerCommand = lastConfig.remoteServerCommand;
  }
  const dialogSettings = {...defaultConnectionSettings, ...lastConfig, remoteServerCommand};
  // Due to a previous bug in the sshPort type, we may need to do this cast to
  // correct bad state that was persisted in users' configs.
  dialogSettings.sshPort = String(dialogSettings.sshPort);
  return {
    deletable: false,
    displayTitle: '(default)',
    params: dialogSettings,
    saveable: false,
  };
}


/**
 * Section: User-created Connection Profiles
 */

/**
 * Returns an array of saved connection profiles.
 */
export function getSavedConnectionProfiles(): Array<NuclideRemoteConnectionProfile> {
  const connectionProfiles: ?Array<NuclideRemoteConnectionProfile> =
    (featureConfig.get('nuclide-remote-projects.connectionProfiles'): any);
  invariant(Array.isArray(connectionProfiles));
  prepareSavedConnectionProfilesForDisplay(connectionProfiles);
  return connectionProfiles;
}

/**
 * Saves the connection profiles. Overwrites any existing profiles.
 */
export function saveConnectionProfiles(profiles: Array<NuclideRemoteConnectionProfile>): void {
  prepareConnectionProfilesForSaving(profiles);
  featureConfig.set('nuclide-remote-projects.connectionProfiles', profiles);
}


type ConnectionProfileChange = {
  newValue: ?Array<NuclideRemoteConnectionProfile>,
  oldValue: ?Array<NuclideRemoteConnectionProfile>,
  keyPath: string,
};
/**
 * Calls the callback when the saved connection profiles change.
 * @return Disposable that can be disposed to stop listening for changes.
 */
export function onSavedConnectionProfilesDidChange(
  callback: (newProfiles: ?Array<NuclideRemoteConnectionProfile>) => mixed,
): IDisposable {
  return featureConfig.onDidChange(
    'nuclide-remote-projects.connectionProfiles',
    (event: ConnectionProfileChange) => {
      const newProfiles = event.newValue;
      prepareSavedConnectionProfilesForDisplay(newProfiles);
      callback(newProfiles);
    },
  );
}


/**
 * Section: Default/Last-Used Connection Profiles
 */

/**
 * Saves a connection configuration along with the last official server command.
 */
export function saveConnectionConfig(
  config: SshConnectionConfiguration,
  lastOfficialRemoteServerCommand: string,
): void {
  // Don't store user's password.
  const updatedConfig = {...config, password: ''};
  // SshConnectionConfiguration's sshPort type is 'number', but we want to save
  // everything as strings.
  updatedConfig.sshPort = String(config.sshPort);
  window.localStorage.setItem(
    'nuclide:nuclide-remote-projects:lastConnectionDetails',
    JSON.stringify({
      updatedConfig,
      // Save last official command to detect upgrade.
      lastOfficialRemoteServerCommand,
    }),
  );
}

let defaultConfig: ?any = null;
/**
 * This fetches the 'default' connection configuration supplied to the user
 * regardless of any connection profiles they might have saved.
 */
export function getDefaultConfig(): any {
  if (defaultConfig) {
    return defaultConfig;
  }
  let defaultConfigGetter;
  try {
    // $FlowFB
    defaultConfigGetter = require('./fb/config');
  } catch (e) {
    defaultConfigGetter = require('./config');
  }
  defaultConfig = defaultConfigGetter.getConnectionDialogDefaultSettings();
  return defaultConfig;
}

export function getOfficialRemoteServerCommand(): string {
  return getDefaultConfig().remoteServerCommand;
}

function prepareSavedConnectionProfilesForDisplay(
  connectionProfiles: ?Array<NuclideRemoteConnectionProfile>,
): void {
  if (!connectionProfiles) {
    return;
  }
  // If a profile does not inclide a remote server command, this means the user
  // intended to use the default server command. We must fill this in.
  const defaultConnectionSettings = getDefaultConfig();
  const currentOfficialRSC = defaultConnectionSettings.remoteServerCommand;
  connectionProfiles.forEach((profile: NuclideRemoteConnectionProfile) => {
    if (!profile.params.remoteServerCommand) {
      profile.params.remoteServerCommand = currentOfficialRSC;
    }
  });
}

function prepareConnectionProfilesForSaving(
  connectionProfiles: Array<NuclideRemoteConnectionProfile>,
): void {
  // If a connection profile has a default remote server command, replace it with
  // an empty string. This indicates that this server command should be filled in
  // when this profile is used.
  const defaultConnectionSettings = getDefaultConfig();
  const currentOfficialRSC = defaultConnectionSettings.remoteServerCommand;
  connectionProfiles.forEach((profile: NuclideRemoteConnectionProfile) => {
    if (profile.params.remoteServerCommand === currentOfficialRSC) {
      profile.params.remoteServerCommand = '';
    }
  });
}
