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

const path = require('path');
const rule = require('../atom-commands');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester();

ruleTester.run('atom-commands', rule, {
  valid: [
    {code: 'atom.commands.add.test("atom-workspace", "command", cb)'},
    // ignores non-workspace commands
    {code: 'atom.commands.add("atom-text-editor", "test", cb)'},
    {code: 'atom.commands.add(test, "test", cb)'},
    // ignores non-trivial expressions
    {code: 'atom.commands.add("atom-workspace", f(), cb)'},
    // these are contained in menus
    {
      code: 'atom.commands.add("atom-workspace", "good_command", null)',
      filename: path.join(__dirname, 'test.js'),
    },
    {
      code: 'atom.commands.add("atom-workspace", "good_command2", null)',
      filename: path.join(__dirname, 'test.js'),
    },
    {
      code: 'api.registerFactory({toggleCommand: "good_command"})',
      filename: path.join(__dirname, 'test.js'),
    },
    {
      code: 'registerFactory({toggleCommand: "bad_command"})',
      filename: path.join(__dirname, 'test.js'),
    },
  ],
  invalid: [
    {
      code: 'atom.commands.add("atom-workspace", "command", cb)',
      errors: [{
        error: rule.MISSING_MENU_ITEM_ERROR + ' (command)',
        type: 'Literal',
      }],
    },
    {
      code: 'atom.commands.add("atom-workspace", {"a": cb, "b": cb})',
      errors: [
        {
          error: rule.MISSING_MENU_ITEM_ERROR + ' (a)',
          type: 'Literal',
        },
        {
          error: rule.MISSING_MENU_ITEM_ERROR + ' (b)',
          type: 'Literal',
        },
      ],
    },
    {
      code: 'var x = "command"; atom.commands.add("atom-workspace", x, cb)',
      errors: [{
        error: rule.COMMAND_LITERAL_ERROR,
        type: 'Identifier',
      }],
    },
    {
      code: 'atom.commands.add("atom-workspace", "bad_command", null)',
      filename: path.join(__dirname, 'test.js'),
      errors: [{
        error: rule.MISSING_MENU_ITEM_ERROR + ' (bad_command)',
        type: 'Literal',
      }],
    },
    {
      code: 'atom.commands.add("atom-workspace", "bad_command2", null)',
      filename: path.join(__dirname, 'test.js'),
      errors: [{
        error: rule.MISSING_MENU_ITEM_ERROR + ' (bad_command2)',
        type: 'Literal',
      }],
    },
    {
      code: 'api.registerFactory({toggleCommand: "bad_command"})',
      filename: path.join(__dirname, 'test.js'),
      errors: [{
        error: rule.MISSING_MENU_ITEM_ERROR + ' (bad_command)',
        type: 'Literal',
      }],
    },
    {
      code: 'atom.commands.add(atom.views.getView(atom.workspace), f(), cb)',
      errors: [{
        error: rule.WORKSPACE_VIEW_LOOKUP_ERROR + ' (bad_command)',
      }],
    },
  ],
});
