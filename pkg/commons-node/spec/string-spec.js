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
  maybeToString,
  relativeDate,
  countOccurrences,
  shellParse,
  removeCommonPrefix,
  removeCommonSuffix,
} from '../string';

describe('relativeDate', () => {
  it('works', () => {
    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    const YEAR = DAY * 365;
    const MONTH = YEAR / 12;

    const reference = 157765000000; // 01.01.1975 00:00
    const now = new Date().getTime();

    // test long format
    expect(relativeDate(0)).toEqual(Math.round(now / YEAR) + ' years ago');
    expect(relativeDate(reference * SECOND, reference)).toEqual('just now');
    expect(relativeDate(reference - 41 * SECOND, reference)).toEqual('just now');
    expect(relativeDate(reference - 42 * SECOND, reference)).toEqual('a minute ago');
    expect(relativeDate(reference - MINUTE, reference)).toEqual('a minute ago');
    expect(relativeDate(reference - MINUTE * 1.5, reference)).toEqual('2 minutes ago');
    expect(relativeDate(reference - MINUTE * 59, reference)).toEqual('59 minutes ago');
    expect(relativeDate(reference - HOUR, reference)).toEqual('an hour ago');
    expect(relativeDate(reference - HOUR * 1.5, reference)).toEqual('2 hours ago');
    expect(relativeDate(reference - HOUR * 16, reference)).toEqual('16 hours ago');
    expect(relativeDate(reference - HOUR * 23, reference)).toEqual('23 hours ago');
    expect(relativeDate(reference - DAY * 1.8, reference)).toEqual('yesterday');
    expect(relativeDate(reference - DAY * 3, reference)).toEqual('3 days ago');
    expect(relativeDate(reference - DAY * 6, reference)).toEqual('6 days ago');
    expect(relativeDate(reference - WEEK, reference)).toEqual('a week ago');
    expect(relativeDate(reference - WEEK * 2, reference)).toEqual('2 weeks ago');
    expect(relativeDate(reference - WEEK * 4, reference)).toEqual('4 weeks ago');
    expect(relativeDate(reference - MONTH * 1.2, reference)).toEqual('a month ago');
    expect(relativeDate(reference - YEAR + HOUR, reference)).toEqual('12 months ago');
    expect(relativeDate(reference - YEAR, reference)).toEqual('a year ago');
    expect(relativeDate(reference - YEAR * 2, reference)).toEqual('2 years ago');
    expect(relativeDate(0, reference)).toEqual('5 years ago');

    // test short format
    expect(relativeDate(0, undefined, /* short */ true)).toEqual(Math.round(now / YEAR) + 'y');
    expect(relativeDate(reference * SECOND, reference, /* short */ true)).toEqual('now');
    expect(relativeDate(reference - 41 * SECOND, reference, /* short */ true)).toEqual('now');
    expect(relativeDate(reference - 42 * SECOND, reference, /* short */ true)).toEqual('1m');
    expect(relativeDate(reference - MINUTE, reference, /* short */ true)).toEqual('1m');
    expect(relativeDate(reference - MINUTE * 1.5, reference, /* short */ true)).toEqual('2m');
    expect(relativeDate(reference - MINUTE * 59, reference, /* short */ true)).toEqual('59m');
    expect(relativeDate(reference - HOUR, reference, /* short */ true)).toEqual('1h');
    expect(relativeDate(reference - HOUR * 1.5, reference, /* short */ true)).toEqual('2h');
    expect(relativeDate(reference - HOUR * 16, reference, /* short */ true)).toEqual('16h');
    expect(relativeDate(reference - HOUR * 23, reference, /* short */ true)).toEqual('23h');
    expect(relativeDate(reference - DAY * 1.8, reference, /* short */ true)).toEqual('1d');
    expect(relativeDate(reference - DAY * 3, reference, /* short */ true)).toEqual('3d');
    expect(relativeDate(reference - DAY * 6, reference, /* short */ true)).toEqual('6d');
    expect(relativeDate(reference - WEEK, reference, /* short */ true)).toEqual('1w');
    expect(relativeDate(reference - WEEK * 2, reference, /* short */ true)).toEqual('2w');
    expect(relativeDate(reference - WEEK * 4, reference, /* short */ true)).toEqual('4w');
    expect(relativeDate(reference - MONTH * 1.2, reference, /* short */ true)).toEqual('1mo');
    expect(relativeDate(reference - YEAR + HOUR, reference, /* short */ true)).toEqual('12mo');
    expect(relativeDate(reference - YEAR, reference, /* short */ true)).toEqual('1y');
    expect(relativeDate(reference - YEAR * 2, reference, /* short */ true)).toEqual('2y');
    expect(relativeDate(0, reference, /* short */ true)).toEqual('5y');
  });
});

describe('maybeToString', () => {
  it("returns 'undefined'", () => {
    expect(maybeToString(undefined)).toEqual('undefined');
  });

  it("returns 'null'", () => {
    expect(maybeToString(null)).toEqual('null');
  });

  it('returns an ordinary string', () => {
    expect(maybeToString('foo')).toEqual('foo');
  });
});

describe('countOccurrences', () => {
  it('counts the number of characters', () => {
    expect(countOccurrences('abcaaa', 'a')).toBe(4);
  });

  it('throws for non-length-1 searches', () => {
    expect(() => {
      countOccurrences('abc', 'abc');
    }).toThrow();
  });
});

describe('shellParse', () => {
  it('parses a list of arguments', () => {
    expect(shellParse('1 2 3 "a b c"')).toEqual(['1', '2', '3', 'a b c']);
  });

  it('throws if operators are given', () => {
    expect(() => {
      shellParse('a | b');
    }).toThrow(Error('Unexpected operator "|" provided to shellParse'));
    expect(() => {
      shellParse('a > b');
    }).toThrow(Error('Unexpected operator ">" provided to shellParse'));
  });
});

describe('removeCommonPrefix', () => {
  it('does nothing if there is no common prefix', () => {
    expect(removeCommonPrefix('foo', 'bar')).toEqual(['foo', 'bar']);
  });

  it('removes a common prefix', () => {
    expect(removeCommonPrefix('foo', 'fbar')).toEqual(['oo', 'bar']);
    expect(removeCommonPrefix('asdffoo', 'asdfbar')).toEqual(['foo', 'bar']);
  });

  it('works with the empty string', () => {
    expect(removeCommonPrefix('', 'bar')).toEqual(['', 'bar']);
    expect(removeCommonPrefix('foo', '')).toEqual(['foo', '']);
    expect(removeCommonPrefix('', '')).toEqual(['', '']);
  });

  it('returns empty strings for identical strings', () => {
    expect(removeCommonPrefix('foo', 'foo')).toEqual(['', '']);
  });
});

describe('removeCommonSuffix', () => {
  it('does nothing if there is no common suffix', () => {
    expect(removeCommonSuffix('foo', 'bar')).toEqual(['foo', 'bar']);
  });

  it('removes a common suffix', () => {
    expect(removeCommonSuffix('foo', 'baro')).toEqual(['fo', 'bar']);
    expect(removeCommonSuffix('fooasdf', 'baroasdf')).toEqual(['fo', 'bar']);
  });

  it('works with the empty string', () => {
    expect(removeCommonSuffix('', 'bar')).toEqual(['', 'bar']);
    expect(removeCommonSuffix('foo', '')).toEqual(['foo', '']);
    expect(removeCommonSuffix('', '')).toEqual(['', '']);
  });

  it('returns empty strings for identical strings', () => {
    expect(removeCommonSuffix('foo', 'foo')).toEqual(['', '']);
  });
});
