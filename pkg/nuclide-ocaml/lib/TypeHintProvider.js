'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {TypeHint} from '../../nuclide-type-hint/lib/rpc-types';
import type {MerlinType} from '../../nuclide-ocaml-rpc';

import {Point, Range} from 'atom';
import {trackOperationTiming} from '../../nuclide-analytics';
import {getServiceByNuclideUri} from '../../nuclide-remote-connection';

// Ignore typehints that span too many lines. These tend to be super spammy.
const MAX_LINES = 10;

// Complex types can end up being super long. Truncate them.
// TODO(hansonw): we could parse these into hint trees
const MAX_LENGTH = 100;

export default class TypeHintProvider {

  typeHint(editor: atom$TextEditor, position: atom$Point): Promise<?TypeHint> {
    return trackOperationTiming('nuclide-ocaml.typeHint', async () => {
      const path = editor.getPath();
      if (path == null) {
        return null;
      }
      const instance = getServiceByNuclideUri('MerlinService', path);
      if (instance == null) {
        return null;
      }
      await instance.pushNewBuffer(path, editor.getText());
      const types = await instance.enclosingType(path, position.row, position.column);
      if (types == null || types.length === 0) {
        return null;
      }
      const type: MerlinType = types[0];
      if (type.end.line - type.start.line > MAX_LINES) {
        return null;
      }
      let hint = type.type;
      if (hint.length > MAX_LENGTH) {
        hint = hint.substr(0, MAX_LENGTH) + '...';
      }
      return {
        hint,
        range: new Range(
          new Point(type.start.line - 1, type.start.col),
          new Point(type.end.line - 1, type.end.col),
        ),
      };
    });
  }

}
