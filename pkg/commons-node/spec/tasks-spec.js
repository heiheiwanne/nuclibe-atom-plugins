'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import {taskFromObservable, observableFromTask} from '../tasks';
import invariant from 'assert';
import {Emitter} from 'event-kit';
import {Observable, Subject, Subscription} from 'rxjs';

describe('commons-node/tasks', () => {

  describe('observableFromTask', () => {

    it('calls start when subscribed', () => {
      const task = createMockTask();
      const observable = observableFromTask(task);
      expect(task.start).not.toHaveBeenCalled();
      observable.subscribe();
      expect(task.start).toHaveBeenCalled();
    });

    it('calls cancel when unsubscribed early', () => {
      const task = createMockTask();
      const observable = observableFromTask(task);
      const sub = observable.subscribe();
      expect(task.cancel).not.toHaveBeenCalled();
      sub.unsubscribe();
      expect(task.cancel).toHaveBeenCalled();
    });

    it('completes when the task does', () => {
      const task = createMockTask();
      const observable = observableFromTask(task);
      const completed = jasmine.createSpy();
      observable.subscribe({complete: completed});
      expect(completed).not.toHaveBeenCalled();
      task._complete();
      expect(completed).toHaveBeenCalled();
    });

    it('errors when the task does', () => {
      const task = createMockTask();
      const observable = observableFromTask(task);
      const errored = jasmine.createSpy();
      observable.subscribe({error: errored});
      expect(errored).not.toHaveBeenCalled();
      task._error(new Error());
      expect(errored).toHaveBeenCalled();
    });

    it("doesn't call cancel when unsubscribed after completion", () => {
      const task = createMockTask();
      const observable = observableFromTask(task);
      const sub = observable.subscribe();
      task._complete();
      sub.unsubscribe();
      expect(task.cancel).not.toHaveBeenCalled();
    });

    it("doesn't call cancel when unsubscribed after an error", () => {
      const task = createMockTask();
      const observable = observableFromTask(task);
      const sub = observable.catch(() => Observable.empty()).subscribe();
      task._error(new Error());
      sub.unsubscribe();
      expect(task.cancel).not.toHaveBeenCalled();
    });

    it('includes emitted progress events', () => {
      const task = createMockTask();
      const observable = observableFromTask(task);
      const handler = jasmine.createSpy();
      observable.subscribe(handler);
      task._progress(0.5);
      expect(handler).toHaveBeenCalledWith({type: 'progress', progress: 0.5});
    });

  });

  describe('taskFromObservable', () => {

    it('subscribes when started', () => {
      const observable = new Subject();
      spyOn(observable, 'subscribe').andCallThrough();
      const task = taskFromObservable(observable);
      expect(observable.subscribe).not.toHaveBeenCalled();
      task.start();
      expect(observable.subscribe).toHaveBeenCalled();
    });

    it('unsubscribes when canceled', () => {
      const sub = new Subscription();
      spyOn(sub, 'unsubscribe');
      const observable = new Subject();
      spyOn(observable, 'subscribe').andReturn(sub);
      const task = taskFromObservable(observable);
      task.start();
      expect(sub.unsubscribe).not.toHaveBeenCalled();
      task.cancel();
      expect(sub.unsubscribe).toHaveBeenCalled();
    });

    it('calls onDidComplete callbacks when it completes', () => {
      const sub = new Subscription();
      spyOn(sub, 'unsubscribe');
      const observable = new Subject();
      const task = taskFromObservable(observable);
      const completed = jasmine.createSpy();
      task.onDidComplete(completed);
      task.start();
      expect(completed).not.toHaveBeenCalled();
      observable.complete();
      expect(completed).toHaveBeenCalled();
    });

    it('calls onDidError callbacks when it errors', () => {
      const observable = new Subject();
      const task = taskFromObservable(observable);
      const errored = jasmine.createSpy();
      task.onDidError(errored);
      task.start();
      expect(errored).not.toHaveBeenCalled();
      observable.error();
      expect(errored).toHaveBeenCalled();
    });

    it('calls onProgress callbacks for progress events', () => {
      const observable = new Subject();
      const task = taskFromObservable(observable);
      const handler = jasmine.createSpy();
      invariant(task.onProgress != null);
      task.onProgress(handler);
      task.start();
      expect(handler).not.toHaveBeenCalled();
      observable.next({type: 'progress', progress: 0.5});
      expect(handler).toHaveBeenCalledWith(0.5);
    });

  });

});

function createMockTask() {
  const emitter = new Emitter();
  const task = {
    start: () => {},
    cancel: () => {},
    onDidComplete: (callback: () => mixed): IDisposable => {
      return emitter.on('complete', callback);
    },
    onDidError: (callback: (err: Error) => mixed): IDisposable => {
      return emitter.on('error', callback);
    },
    onProgress: (callback: (progress: ?number) => mixed): IDisposable => {
      return emitter.on('progress', callback);
    },
    _complete: (): void => {
      emitter.emit('complete');
    },
    _error: (err: Error): void => {
      emitter.emit('error', err);
    },
    _progress: (progress: ?number): void => {
      emitter.emit('progress', progress);
    },
  };
  spyOn(task, 'start');
  spyOn(task, 'cancel');
  return task;
}
