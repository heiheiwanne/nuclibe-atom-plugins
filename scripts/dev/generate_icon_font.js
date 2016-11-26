#!/usr/bin/env node
'use strict';
/* @noflow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

/* NON-TRANSPILED FILE */
/* eslint comma-dangle: [1, always-multiline], prefer-object-spread/prefer-object-spread: 0 */


const webfontsGenerator = require('webfonts-generator');
const glob = require('glob');
const path = require('path');
const fs = require('fs');

const basedir = path.join(__dirname, '../..');
const nucliconsDir = path.join(basedir, 'resources/nuclicons');
const stylesDir = path.join(basedir, 'pkg/nuclide-ui/styles');
const svgs = glob.sync(path.join(basedir, 'resources/nuclicons/*.svg'));

webfontsGenerator(
  {
    files: svgs,
    dest: stylesDir,
    fontName: 'nuclicons',
    cssDest: path.join(stylesDir, 'nuclicons.css'),
    cssTemplate: path.join(nucliconsDir, 'template.css'),
    templateOptions: {
      classPrefix: 'nuclicon-',
    },
    types: ['ttf'],
    rename: basename => basename.match(/\d+-(.*)\.svg/)[1].toLowerCase(),
  },
  err => {
    if (err) {
      throw err;
    } else {
      // webfonts-generator created this file even though we didn't include it in the `types`
      // config. Just delete it.
      fs.unlinkSync(path.join(stylesDir, 'nuclicons.svg'));
    }
  }
);
