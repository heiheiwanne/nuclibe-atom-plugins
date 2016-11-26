'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

export function getIgnoredNames(): Array<string> {
  const ignoredNames = atom.config.get('core.ignoredNames');
  if (Array.isArray(ignoredNames)) {
    // $FlowIssue: Filter predicates
    return ignoredNames.filter(x => typeof x === 'string');
  } else {
    return [];
  }
}
