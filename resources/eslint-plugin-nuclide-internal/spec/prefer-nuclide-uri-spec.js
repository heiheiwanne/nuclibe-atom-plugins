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

const rule = require('../prefer-nuclide-uri');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: 'babel-eslint',
});

ruleTester.run('prefer-nuclide-uri', rule, {
  valid: [
    {code: 'var path = require("path")'},
    {code: 'var pathModule = require("path")'},
    {code: 'require("path")'},
    {code: 'var whateverModule = require("whateverModule")'},
    {code: 'import type pathModule from "path";'},
    {code: 'import typeof pathModule from "path";'},
  ],
  invalid: [
    {
      code: 'import path from "path";',
      errors: [{
        message: 'path module is not to be used. Use commons-node/nuclideUri instead',
        type: 'ImportDeclaration',
      }],
    },
    {
      code: 'import {join} from "path";',
      errors: [{
        message: 'path module is not to be used. Use commons-node/nuclideUri instead',
        type: 'ImportDeclaration',
      }],
    },
    {
      code: 'import {join, basename} from "path";',
      errors: [{
        message: 'path module is not to be used. Use commons-node/nuclideUri instead',
        type: 'ImportDeclaration',
      }],
    },
    {
      code: 'import pathModule from "path";',
      errors: [{
        message: 'path module is not to be used. Use commons-node/nuclideUri instead',
        type: 'ImportDeclaration',
      }],
    },
    {
      code: 'import * as path from "path";',
      errors: [{
        message: 'path module is not to be used. Use commons-node/nuclideUri instead',
        type: 'ImportDeclaration',
      }],
    },
    {
      code: 'import * as pathModule from "path";',
      errors: [{
        message: 'path module is not to be used. Use commons-node/nuclideUri instead',
        type: 'ImportDeclaration',
      }],
    },
    {
      code: 'import pathModule, {path} from "path"',
      errors: [{
        message: 'path module is not to be used. Use commons-node/nuclideUri instead',
        type: 'ImportDeclaration',
      }],
    },
    {
      code: 'import pathUtils, {path} from "path"',
      errors: [{
        message: 'path module is not to be used. Use commons-node/nuclideUri instead',
        type: 'ImportDeclaration',
      }],
    },
  ],
});
