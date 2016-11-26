'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import invariant from 'assert';
import electron from 'electron';
import {DebuggerStore, DebuggerMode} from './DebuggerStore';
import {getNotificationService} from '../../nuclide-debugger-base';
import {CompositeDisposable, Disposable} from 'atom';

const {remote} = electron;
invariant(remote != null);

export class DebuggerPauseController {
  _store: DebuggerStore;
  _disposables: CompositeDisposable;

  constructor(store: DebuggerStore) {
    this._disposables = new CompositeDisposable();
    this._store = store;
    store.onDebuggerModeChange(() => this._handleChange());
  }

  _handleChange(): void {
    const mode = this._store.getDebuggerMode();
    if (mode === DebuggerMode.PAUSED) {
      // Moving from non-pause to pause state.
      this._scheduleNativeNotification();
    }
  }

  _scheduleNativeNotification(): void {
    const currentWindow = remote.getCurrentWindow();
    if (currentWindow.isFocused()) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const raiseNativeNotification = getNotificationService();
      if (raiseNativeNotification != null) {
        raiseNativeNotification('Nuclide Debugger', 'Paused at a breakpoint');
      }
    }, 3000);

    // If the user focuses the window at any time, then they are assumed to have seen the debugger
    // pause, and we will not display a notification.
    currentWindow.once('focus', () => {
      clearTimeout(timeoutId);
    });

    this._disposables.add(new Disposable(() => clearTimeout(timeoutId)));
  }

  dispose(): void {
    this._disposables.dispose();
  }
}
