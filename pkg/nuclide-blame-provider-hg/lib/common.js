'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {HgRepositoryClient} from '../../nuclide-hg-repository-client';

import {repositoryForPath} from '../../nuclide-hg-git-bridge';

export function hgRepositoryForEditor(editor: TextEditor): ?HgRepositoryClient {
  const repo = repositoryForPath(editor.getPath() || '');
  if (!repo || repo.getType() !== 'hg') {
    return null;
  }
  return ((repo: any): HgRepositoryClient);
}
