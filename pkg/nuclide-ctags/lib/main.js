'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {HyperclickProvider} from '../../hyperclick/lib/types';
import type {Provider as QuickOpenProviderType} from '../../nuclide-quick-open/lib/types';

import HyperclickHelpers from './HyperclickHelpers';
import QuickOpenHelpers from './QuickOpenHelpers';

export function activate(state: ?Object) {
}

export function getHyperclickProvider(): HyperclickProvider {
  return {
    priority: 1, // Should be lower than all language-specific providers.
    providerName: 'nuclide-ctags',
    getSuggestionForWord(editor, text, range) {
      return HyperclickHelpers.getSuggestionForWord(editor, text, range);
    },
  };
}

export function getQuickOpenProvider(): QuickOpenProviderType {
  return {
    getProviderType: () => 'DIRECTORY',
    getName: () => 'CtagsSymbolProvider',
    isRenderable: () => true,
    getTabTitle: () => 'Ctags',
    isEligibleForDirectory(directory) {
      return QuickOpenHelpers.isEligibleForDirectory(directory);
    },
    getComponentForItem(item) {
      return QuickOpenHelpers.getComponentForItem(item);
    },
    executeQuery(query, directory) {
      return QuickOpenHelpers.executeQuery(query, directory);
    },
  };
}

export function deactivate() {
}
