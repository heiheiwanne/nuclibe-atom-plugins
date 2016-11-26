'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {NuclideUri} from '../../commons-node/nuclideUri';

// This file contains RPC definitions for jediserver.py.

export type JediCompletion = {
  type: string,
  text: string,
  description?: string,
  params?: Array<string>,
};

export type JediDefinition = {
  type: string,
  text: string,
  file: NuclideUri,
  line: number,
  column: number,
};

export type JediReference = {
  type: string,
  text: string,
  file: NuclideUri,
  line: number,
  column: number,
  parentName?: string,
};

export type Position = {
  line: number,
  column: number,
};

export type JediFunctionItem = {
  kind: 'function',
  name: string,
  start: Position,
  end: Position,
  children?: Array<JediOutlineItem>,
  docblock?: string,
  params?: Array<string>,
};

export type JediClassItem = {
  kind: 'class',
  name: string,
  start: Position,
  end: Position,
  children?: Array<JediOutlineItem>,
  docblock?: string,
  // Class params, i.e. superclasses.
  params?: Array<string>,
};

export type JediStatementItem = {
  kind: 'statement',
  name: string,
  start: Position,
  end: Position,
  docblock?: string,
};

export type JediOutlineItem = JediFunctionItem | JediClassItem | JediStatementItem;

export async function get_completions(
  src: NuclideUri,
  contents: string,
  line: number,
  column: number,
): Promise<?Array<JediCompletion>> {
  throw new Error('RPC Stub');
}

export async function get_definitions(
  src: NuclideUri,
  contents: string,
  line: number,
  column: number,
): Promise<?Array<JediDefinition>> {
  throw new Error('RPC Stub');
}

export async function get_references(
  src: NuclideUri,
  contents: string,
  line: number,
  column: number,
): Promise<?Array<JediReference>> {
  throw new Error('RPC Stub');
}

export function get_outline(
  src: NuclideUri,
  contents: string,
): Promise<?Array<JediOutlineItem>> {
  throw new Error('RPC Stub');
}

export function add_paths(
  paths: Array<string>,
): Promise<?Array<string>> {
  throw new Error('RPC Stub');
}
