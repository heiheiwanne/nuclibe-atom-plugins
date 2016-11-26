'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import featureConfig from '../../commons-atom/featureConfig';

export function getFormatOnSave(): boolean {
  const formatOnSave = (featureConfig.get('nuclide-code-format.formatOnSave'): any);
  return (formatOnSave == null) ? false : formatOnSave;
}
