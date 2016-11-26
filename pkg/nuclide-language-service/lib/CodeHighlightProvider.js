'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {LanguageService} from './LanguageService';

import {trackOperationTiming} from '../../nuclide-analytics';
import {ConnectionCache} from '../../nuclide-remote-connection';
import {getFileVersionOfEditor} from '../../nuclide-open-files';
import {Range} from 'atom';

export type CodeHighlightConfig = {
  version: '0.0.0',
  priority: number,
  analyticsEventName: string,
};

export class CodeHighlightProvider<T: LanguageService> {
  name: string;
  selector: string;
  inclusionPriority: number;
  _analyticsEventName: string;
  _connectionToLanguageService: ConnectionCache<T>;

  constructor(
    name: string,
    selector: string,
    priority: number,
    analyticsEventName: string,
    connectionToLanguageService: ConnectionCache<T>,
  ) {
    this.name = name;
    this.selector = selector;
    this.inclusionPriority = priority;
    this._analyticsEventName = analyticsEventName;
    this._connectionToLanguageService = connectionToLanguageService;
  }

  highlight(editor: atom$TextEditor, position: atom$Point): Promise<Array<atom$Range>> {
    return trackOperationTiming(this._analyticsEventName, async () => {
      const fileVersion = await getFileVersionOfEditor(editor);
      const languageService = this._connectionToLanguageService.getForUri(editor.getPath());
      if (languageService == null || fileVersion == null) {
        return [];
      }

      return (await (await languageService).highlight(
        fileVersion,
        position)).map(range => new Range(range.start, range.end));
    });
  }

  static register(
    name: string,
    selector: string,
    config: CodeHighlightConfig,
    connectionToLanguageService: ConnectionCache<T>,
  ): IDisposable {
    return atom.packages.serviceHub.provide(
      'nuclide-code-highlight.provider',
      config.version,
      new CodeHighlightProvider(
        name,
        selector,
        config.priority,
        config.analyticsEventName,
        connectionToLanguageService,
      ));
  }
}
