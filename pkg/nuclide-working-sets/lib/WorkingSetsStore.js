'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import {Emitter} from 'atom';
import {WorkingSet} from '../../nuclide-working-sets-common';
import {arrayEqual} from '../../commons-node/collection';
import {track} from '../../nuclide-analytics';
import {getLogger} from '../../nuclide-logging';
import nuclideUri from '../../commons-node/nuclideUri';

import type {WorkingSetDefinition} from './types';

type ApplicabilitySortedDefinitions = {
  applicable: Array<WorkingSetDefinition>,
  notApplicable: Array<WorkingSetDefinition>,
};

const NEW_WORKING_SET_EVENT = 'new-working-set';
const NEW_DEFINITIONS_EVENT = 'new-definitions';
const SAVE_DEFINITIONS_EVENT = 'save-definitions';

export class WorkingSetsStore {
  _emitter: Emitter;
  _current: WorkingSet;
  _definitions: Array<WorkingSetDefinition>;
  _applicableDefinitions: Array<WorkingSetDefinition>;
  _notApplicableDefinitions: Array<WorkingSetDefinition>;
  _prevCombinedUris: Array<string>;
  _lastSelected: Array<string>;

  constructor() {
    this._emitter = new Emitter();
    this._current = new WorkingSet();
    this._definitions = [];
    this._applicableDefinitions = [];
    this._notApplicableDefinitions = [];
    this._prevCombinedUris = [];
    this._lastSelected = [];
  }

  getCurrent(): WorkingSet {
    return this._current;
  }

  getDefinitions(): Array<WorkingSetDefinition> {
    return this._definitions;
  }

  getApplicableDefinitions(): Array<WorkingSetDefinition> {
    return this._applicableDefinitions;
  }

  getNotApplicableDefinitions(): Array<WorkingSetDefinition> {
    return this._notApplicableDefinitions;
  }

  subscribeToCurrent(callback: (current: WorkingSet) => void): IDisposable {
    return this._emitter.on(NEW_WORKING_SET_EVENT, callback);
  }

  subscribeToDefinitions(
    callback: (definitions: ApplicabilitySortedDefinitions) => mixed,
  ): IDisposable {
    return this._emitter.on(NEW_DEFINITIONS_EVENT, callback);
  }

  onSaveDefinitions(
    callback: (definitions: Array<WorkingSetDefinition>) => mixed,
  ): IDisposable {
    return this._emitter.on(SAVE_DEFINITIONS_EVENT, callback);
  }

  updateDefinitions(definitions: Array<WorkingSetDefinition>): void {
    const {applicable, notApplicable} = this._sortOutApplicability(definitions);
    this._setDefinitions(applicable, notApplicable, definitions);
  }

  updateApplicability(): void {
    const {applicable, notApplicable} = this._sortOutApplicability(this._definitions);
    this._setDefinitions(applicable, notApplicable, this._definitions);
  }

  saveWorkingSet(name: string, workingSet: WorkingSet): void {
    this._saveDefinition(name, name, workingSet);
  }

  update(name: string, newName: string, workingSet: WorkingSet): void {
    this._saveDefinition(name, newName, workingSet);
  }

  activate(name: string): void {
    this._activateDefinition(name, /* active */ true);
  }

  deactivate(name: string): void {
    this._activateDefinition(name, /* active */ false);
  }

  deleteWorkingSet(name: string): void {
    track('working-sets-delete', {name});

    const definitions = this._definitions.filter(d => d.name !== name);
    this._saveDefinitions(definitions);
  }

  _setDefinitions(
    applicable: Array<WorkingSetDefinition>,
    notApplicable: Array<WorkingSetDefinition>,
    definitions: Array<WorkingSetDefinition>,
  ): void {
    const somethingHasChanged =
      !arrayEqual(this._applicableDefinitions, applicable) ||
      !arrayEqual(this._notApplicableDefinitions, notApplicable);

    if (somethingHasChanged) {
      this._applicableDefinitions = applicable;
      this._notApplicableDefinitions = notApplicable;
      this._definitions = definitions;

      const activeApplicable = applicable.filter(d => d.active);
      if (activeApplicable.length > 0) {
        this._lastSelected = activeApplicable.map(d => d.name);
      }
      this._emitter.emit(NEW_DEFINITIONS_EVENT, {applicable, notApplicable});

      this._updateCurrentWorkingSet(activeApplicable);
    }
  }

  _updateCurrentWorkingSet(activeApplicable: Array<WorkingSetDefinition>): void {
    const combinedUris = [].concat(
      ...activeApplicable.map(d => d.uris),
    );

    const newWorkingSet = new WorkingSet(combinedUris);
    if (!this._current.equals(newWorkingSet)) {
      this._current = newWorkingSet;
      this._emitter.emit(NEW_WORKING_SET_EVENT, newWorkingSet);
    }
  }

  _saveDefinition(name: string, newName: string, workingSet: WorkingSet): void {
    const definitions = this.getDefinitions();

    let nameIndex = -1;
    definitions.forEach((d, i) => {
      if (d.name === name) {
        nameIndex = i;
      }
    });

    let newDefinitions;
    if (nameIndex < 0) {
      track('working-sets-create', {name, uris: workingSet.getUris().join(',')});

      newDefinitions = definitions.concat({name, uris: workingSet.getUris(), active: false});
    } else {
      track(
        'working-sets-update',
        {oldName: name, name: newName, uris: workingSet.getUris().join(',')},
      );

      const active = definitions[nameIndex].active;
      newDefinitions = [].concat(
        definitions.slice(0, nameIndex),
        {name: newName, uris: workingSet.getUris(), active},
        definitions.slice(nameIndex + 1),
      );
    }

    this._saveDefinitions(newDefinitions);
  }

  _activateDefinition(name: string, active: boolean): void {
    track('working-sets-activate', {name, active: active.toString()});

    const definitions = this.getDefinitions();
    const newDefinitions = definitions.map(d => {
      if (d.name === name) {
        d.active = active;
      }

      return d;
    });
    this._saveDefinitions(newDefinitions);
  }

  deactivateAll(): void {
    const definitions = this.getDefinitions().map(d => {
      if (!this._isApplicable(d)) {
        return d;
      }

      return {...d, active: false};
    });
    this._saveDefinitions(definitions);
  }

  toggleLastSelected(): void {
    track('working-sets-toggle-last-selected');

    if (this.getApplicableDefinitions().some(d => d.active)) {
      this.deactivateAll();
    } else {
      const newDefinitions = this.getDefinitions().map(d => {
        return {
          ...d,
          active: d.active || this._lastSelected.indexOf(d.name) > -1,
        };
      });
      this._saveDefinitions(newDefinitions);
    }
  }

  _saveDefinitions(definitions: Array<WorkingSetDefinition>): void {
    this._emitter.emit(SAVE_DEFINITIONS_EVENT, definitions);
  }

  _sortOutApplicability(definitions: Array<WorkingSetDefinition>): ApplicabilitySortedDefinitions {
    const applicable = [];
    const notApplicable = [];

    definitions.forEach(def => {
      if (this._isApplicable(def)) {
        applicable.push(def);
      } else {
        notApplicable.push(def);
      }
    });

    return {applicable, notApplicable};
  }

  _isApplicable(definition: WorkingSetDefinition): boolean {
    const workingSet = new WorkingSet(definition.uris);
    const dirs = atom.project.getDirectories().filter(dir => {
      // Apparently sometimes Atom supplies an invalid directory, or a directory with an
      // invalid paths. See https://github.com/facebook/nuclide/issues/416
      if (dir == null) {
        const logger = getLogger();

        logger.warn('Received a null directory from Atom');
        return false;
      }
      try {
        nuclideUri.parse(dir.getPath());
        return true;
      } catch (e) {
        const logger = getLogger();

        logger.warn('Failed to parse path supplied by Atom', dir.getPath());
        return false;
      }
    });

    return dirs.some(dir => workingSet.containsDir(dir.getPath()));
  }
}
