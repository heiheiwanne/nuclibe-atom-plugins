'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import {
  expressionForRevisionsBeforeHead,
  parseRevisionInfoOutput,
  INFO_REV_END_MARK,
} from '../lib/hg-revision-expression-helpers';

describe('hg-revision-expression-helpers', () => {
  describe('expressionForRevisionsBeforeHead', () => {
    it('returns a correct expression <= 0 revisions before head.', () => {
      expect(expressionForRevisionsBeforeHead(0)).toBe('.');
      expect(expressionForRevisionsBeforeHead(-2)).toBe('.');
    });

    it('returns a correct expression for > 0 revisions before head.', () => {
      expect(expressionForRevisionsBeforeHead(3)).toBe('.~3');
    });
  });

  describe('parseRevisionInfoOutput', () => {
    it('returns the parsed revision info if is valid.', () => {
      const commit1Description =
`Commit 1 'title'.
Continue Commit 1 message.`;
      const commit2Description =
`Commit 2 'title'.

Still, multi-line commit 2 message

Test Plan: complete`;
      const revisionsString =
`124
Commit 1 'title'.
Author Name<auth_2_alias@domain.com>
2015-10-15 16:03 -0700
a343fb3
default
draft
b-1 b-2

tip
a343fb211111 000000000000
@
${commit1Description}
${INFO_REV_END_MARK}
123
Commit 2 'title'.
Author Name<auth_2_alias@domain.com>
2015-10-15 16:02 -0700
a343fb2
default
public

remote/master

abc123411111 000000000000

${commit2Description}
${INFO_REV_END_MARK}
`;

      expect(parseRevisionInfoOutput(revisionsString)).toEqual([
        {
          id: 124,
          isHead: true,
          title: "Commit 1 'title'.",
          author: 'Author Name<auth_2_alias@domain.com>',
          hash: 'a343fb3',
          bookmarks: ['b-1', 'b-2'],
          remoteBookmarks: [],
          date: new Date('2015-10-15 16:03 -0700'),
          branch: 'default',
          phase: 'draft',
          tags: ['tip'],
          parents: ['a343fb211111'],
          description: commit1Description,
        },
        {
          id: 123,
          isHead: false,
          title: "Commit 2 'title'.",
          author: 'Author Name<auth_2_alias@domain.com>',
          hash: 'a343fb2',
          bookmarks: [],
          remoteBookmarks: ['remote/master'],
          date: new Date('2015-10-15 16:02 -0700'),
          branch: 'default',
          phase: 'public',
          tags: [],
          parents: ['abc123411111'],
          description: commit2Description,
        },
      ]);
    });

    it('skips an entry if invalid - should never happen', () => {
      expect(parseRevisionInfoOutput('revision:123')).toEqual([]);
    });
  });
});
