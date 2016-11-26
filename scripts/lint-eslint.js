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

/* eslint-disable no-console */

const child_process = require('child_process');
const os = require('os');

const eslintGlobUtil = require('eslint/lib/util/glob-util');

const numWorkers = Math.max(os.cpus().length - 1, 1);

const files = eslintGlobUtil
  .listFilesToProcess(['**/*.js'])
  .map(f => f.filename);

const chunks = bucketize(files, numWorkers);

// Verify that chunks were actually split correctly:
// require('assert').deepEqual(files, [].concat(...chunks));

let stdOut = '';
let stdErr = '';
let exitCode;

while (chunks.length) {
  const chunk = chunks.shift();
  const ps = child_process.spawn(
    'node_modules/.bin/eslint',
    [
      '--max-warnings', '0',
      '--',
      ...chunk,
    ]
  )
  .on('exit', code => {
    stdOut += out;
    stdErr += err;
    if (code && exitCode == null) {
      exitCode = code;
    }
  });

  let out = '';
  let err = '';
  ps.stdout.on('data', data => { out += data; });
  ps.stderr.on('data', data => { err += data; });
}

process.on('beforeExit', code => {
  if (!code && exitCode) { process.exitCode = exitCode; }
  if (stdOut) { console.log(stdOut); }
  if (stdErr) { console.error(stdErr); }
});

function bucketize(arr, num) {
  const size = Math.ceil(arr.length / num);
  const result = [];
  let index = 0;
  while (index < arr.length) {
    result.push(arr.slice(index, index += size));
  }
  return result;
}
