'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import {registerConsoleLogging} from '../../nuclide-debugger-base';
import utils from './utils';
const {log, logError} = utils;
import {Observable} from 'rxjs';
import UniversalDisposable from '../../commons-node/UniversalDisposable';

type NotificationMessage = {
  type: 'info' | 'warning' | 'error' | 'fatalError',
  message: string,
};

/**
 * The ObservableManager keeps track of the streams we use to talk to the server-side nuclide
 * debugger.  Currently it manages 3 streams:
 *   1. A notification stream to communicate events to atom's notification system.
 *   2. A server message stream to communicate events to the debugger UI.
 *   3. An output window stream to communicate events to the client's output window.
 * The manager also allows two callback to be passed.
 *   1. sendServerMessageToChromeUi takes a string and sends it to the chrome debugger UI.
 *   2. onSessionEnd is optional, and is called when all the managed observables complete.
 * The ObservableManager takes ownership of its observables, and disposes them when its dispose
 * method is called.
 */
export class ObservableManager {
  _notifications: Observable<NotificationMessage>;
  _outputWindowMessages: Observable<Object>;
  _disposables: UniversalDisposable;

  constructor(
    notifications: Observable<NotificationMessage>,
    outputWindowMessages: Observable<Object>,
  ) {
    this._notifications = notifications;
    this._outputWindowMessages = outputWindowMessages;
    this._disposables = new UniversalDisposable();
    this._subscribe();
  }

  _subscribe(): void {
    const sharedNotifications = this._notifications.share();
    this._disposables.add(sharedNotifications.subscribe(
      this._handleNotificationMessage.bind(this),
      this._handleNotificationError.bind(this),
      this._handleNotificationEnd.bind(this),
    ));
    this._registerConsoleLogging(this._outputWindowMessages.share());
  }

  _registerConsoleLogging(sharedOutputWindowMessages: Observable<Object>): void {
    const filteredMesages = sharedOutputWindowMessages
      .filter(messageObj => messageObj.method === 'Console.messageAdded')
      .map(messageObj => {
        return JSON.stringify({
          level: messageObj.params.message.level,
          text: messageObj.params.message.text,
        });
      });
    const outputDisposable = registerConsoleLogging(
      'PHP Debugger',
      filteredMesages,
    );
    if (outputDisposable != null) {
      this._disposables.add(outputDisposable);
    }
  }

  _handleNotificationMessage(message: NotificationMessage): void {
    switch (message.type) {
      case 'info':
        log('Notification observerable info: ' + message.message);
        atom.notifications.addInfo(message.message);
        break;

      case 'warning':
        log('Notification observerable warning: ' + message.message);
        atom.notifications.addWarning(message.message);
        break;

      case 'error':
        logError('Notification observerable error: ' + message.message);
        atom.notifications.addError(message.message);
        break;

      case 'fatalError':
        logError('Notification observerable fatal error: ' + message.message);
        atom.notifications.addFatalError(message.message);
        break;

      default:
        logError('Unknown message: ' + JSON.stringify(message));
        break;
    }
  }

  _handleNotificationError(error: string): void {
    logError('Notification observerable error: ' + error);
  }

  _handleNotificationEnd(): void {
    log('Notification observerable ends.');
  }

  dispose(): void {
    this._disposables.dispose();
  }
}
