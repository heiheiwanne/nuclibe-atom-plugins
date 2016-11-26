'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import {CompositeDisposable} from 'atom';
import {trackOperationTiming, track} from '../../nuclide-analytics';
import nuclideUri from '../../commons-node/nuclideUri';
import {getFileSystemServiceByNuclideUri} from '../../nuclide-remote-connection';
import {getLogger} from '../../nuclide-logging';

const logger = getLogger();

class FileWatcher {

  _editor: TextEditor;
  _subscriptions: ?CompositeDisposable;

  constructor(editor: TextEditor) {
    this._editor = editor;
    if (this._editor == null) {
      logger.warn('No editor instance on this._editor');
      return;
    }
    const _subscriptions = new CompositeDisposable();
    _subscriptions.add(this._editor.onDidConflict(() => {
      if (this._shouldPromptToReload()) {
        logger.info(`Conflict at file: ${this._editor.getPath() || 'File not found'}`);
        this._promptReload();
      }
    }));
    this._subscriptions = _subscriptions;
  }

  _shouldPromptToReload(): boolean {
    return this._editor.getBuffer().isInConflict();
  }

  _promptReload(): Promise<any> {
    return trackOperationTiming(
      'file-watcher:promptReload',
      () => this.__promptReload(),
    );
  }

  async __promptReload(): Promise<any> {
    const filePath = this._editor.getPath();
    if (filePath == null) {
      return;
    }
    const encoding = this._editor.getEncoding();
    const fileName = nuclideUri.basename(filePath);
    const choice = atom.confirm({
      message: fileName + ' has changed on disk.',
      buttons: ['Reload', 'Compare', 'Ignore'],
    });
    if (choice === 2) {
      track('file-watcher:promptReload-ignoreChosen');
      return;
    }
    if (choice === 0) {
      track('file-watcher:promptReload-reloadChosen');
      const buffer = this._editor.getBuffer();
      if (buffer) {
        buffer.reload();
      }
      return;
    }
    track('file-watcher:promptReload-compareChosen');

    // Load the file contents locally or remotely.
    const service = getFileSystemServiceByNuclideUri(filePath);
    const localFilePath = nuclideUri.getPath(filePath);
    const contents = (await service.readFile(localFilePath)).toString(encoding);

    // Open a right split pane to compare the contents.
    // TODO: We can use the diff-view here when ready.
    const splitEditor = await atom.workspace.open('', {split: 'right'});

    splitEditor.insertText(contents);
    splitEditor.setGrammar(this._editor.getGrammar());
  }

  destroy() {
    if (!this._subscriptions) {
      return;
    }
    this._subscriptions.dispose();
    this._subscriptions = null;
  }
}

module.exports = FileWatcher;
