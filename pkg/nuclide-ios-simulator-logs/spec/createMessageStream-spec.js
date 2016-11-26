'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import featureConfig from '../../commons-atom/featureConfig';
import {createMessageStream} from '../lib/createMessageStream';
import {Observable} from 'rxjs';

describe('createMessageStream', () => {

  it('splits the output by record', () => {
    const original = featureConfig.observeAsStream.bind(featureConfig);
    spyOn(featureConfig, 'observeAsStream').andCallFake(name => (
      name === 'nuclide-ios-simulator-logs.whitelistedTags' ? Observable.of('.*') : original(name)
    ));
    waitsForPromise(async () => {
      const output = Observable.from(OUTPUT_LINES);
      const messages = await createMessageStream(output)
        .map(message => message.text)
        .toArray()
        .toPromise();
      expect(messages).toEqual([
        'Message 1',
        'Message 2',
      ]);
    });
  });

  it('only includes messages with whitelisted tags', () => {
    waitsForPromise(async () => {
      const original = featureConfig.observeAsStream.bind(featureConfig);
      spyOn(featureConfig, 'observeAsStream').andCallFake(name => (
        name === 'nuclide-ios-simulator-logs.whitelistedTags'
          ? Observable.of('X|ExampleTag')
          : original(name)
      ));
      const output = Observable.from(OUTPUT_LINES);
      const messages = await createMessageStream(output)
        .map(message => message.text)
        .toArray()
        .toPromise();
      expect(messages).toEqual(['Message 2']);
    });
  });

  it('shows an error (once) if the regular expression is invalid', () => {
    spyOn(atom.notifications, 'addError');
    const original = featureConfig.observeAsStream.bind(featureConfig);
    spyOn(featureConfig, 'observeAsStream').andCallFake(name => (
      name === 'nuclide-ios-simulator-logs.whitelistedTags' ? Observable.of('(') : original(name)
    ));

    waitsForPromise(async () => {
      const output = Observable.from(OUTPUT_LINES);
      await createMessageStream(output).toPromise();
      expect(atom.notifications.addError.callCount).toBe(1);
    });
  });

});

const OUTPUT_LINES = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
  '<plist version="1.0">',
  '<array>',
  '  <dict>',
  '    <key>ASLMessageID</key>',
  '    <string>54706</string>',
  '    <key>Time</key>',
  '    <string>Feb 17 12:52:17</string>',
  '    <key>TimeNanoSec</key>',
  '    <string>469585000</string>',
  '    <key>Level</key>',
  '    <string>2</string>',
  '    <key>PID</key>',
  '    <string>38152</string>',
  '    <key>UID</key>',
  '    <string>1507447745</string>',
  '    <key>GID</key>',
  '    <string>1876110778</string>',
  '    <key>ReadGID</key>',
  '    <string>80</string>',
  '    <key>Host</key>',
  '    <string>matthewwith-mbp</string>',
  '    <key>Sender</key>',
  '    <string>UIExplorer</string>',
  '    <key>Facility</key>',
  '    <string>user</string>',
  '    <key>Message</key>',
  '    <string>Message 1</string>',
  '    <key>ASLSHIM</key>',
  '    <string>1</string>',
  '    <key>SenderMachUUID</key>',
  '    <string>09F5C0C0-7587-39E8-A92E-7B130965D76C</string>',
  '  </dict>',
  '</array>',
  '</plist>',
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
  '<plist version="1.0">',
  '<array>',
  '  <dict>',
  '    <key>ASLMessageID</key>',
  '    <string>54706</string>',
  '    <key>Time</key>',
  '    <string>Feb 17 12:52:17</string>',
  '    <key>TimeNanoSec</key>',
  '    <string>469585000</string>',
  '    <key>Level</key>',
  '    <string>2</string>',
  '    <key>PID</key>',
  '    <string>38152</string>',
  '    <key>UID</key>',
  '    <string>1507447745</string>',
  '    <key>GID</key>',
  '    <string>1876110778</string>',
  '    <key>ReadGID</key>',
  '    <string>80</string>',
  '    <key>Host</key>',
  '    <string>matthewwith-mbp</string>',
  '    <key>Sender</key>',
  '    <string>UIExplorer</string>',
  '    <key>Facility</key>',
  '    <string>user</string>',
  '    <key>Message</key>',
  '    <string>2016-08-24 15:58:33.113 [ExampleTag] Message 2</string>',
  '    <key>ASLSHIM</key>',
  '    <string>1</string>',
  '    <key>SenderMachUUID</key>',
  '    <string>09F5C0C0-7587-39E8-A92E-7B130965D76C</string>',
  '  </dict>',
  '</array>',
  '</plist>',
];
