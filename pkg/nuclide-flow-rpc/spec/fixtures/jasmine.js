/* @noflow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

describe('foo', () => {
  const x = 5;
  it('should work', () => {
    describe('not displaying this', () => x);
  });
});

describe('bar', () => {
  it('should work with a normal function', () => {
  });
});

it('should not display this', () => {});
