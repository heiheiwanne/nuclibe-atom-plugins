'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

const {encryptString, decryptString} =
  require('../lib/RemoteConnectionConfigurationManager').__test__;

describe('RemoteConnectionConfigurationManager', () => {
  describe('encryptString and decryptString', () => {
    it('can encrypt and dycrypt strings', () => {
      const text = 'This little piggy went to market';
      const {
        password,
        salt,
        encryptedString,
      } = encryptString(text);

      expect(encryptedString).not.toEqual(text);
      expect(decryptString(encryptedString, password, salt)).toEqual(text);

    });
  });
});
