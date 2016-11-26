'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import invariant from 'assert';
import fs from 'fs';
import fsPromise from '../../commons-node/fsPromise';
import http from 'http';
import xfetch from '../../commons-node/xfetch';

describe('xfetch', () => {
  it('is the correct module', () => {
    if (typeof atom === 'undefined') {
      expect(xfetch).toBe(require('node-fetch'));
    } else {
      expect(xfetch).toBe(global.fetch);
    }
  });

  it('rejects a connection error', () => {
    waitsForPromise(async () => {
      let errorThrown;
      try {
        await xfetch('http://0.0.0.0:62222');
      } catch (err) {
        errorThrown = err;
      }
      if (typeof atom === 'undefined') {
        expect(errorThrown).toMatch(/FetchError/);
      } else {
        expect(errorThrown).toMatch(/Failed to fetch/);
      }
    });
  });

  describe('with a connection', () => {
    let server: ?http.Server;
    let port;

    beforeEach(() => {
      server = http.createServer((req, res) => {
        fs.readFile(req.url, 'utf8', (err, contents) => {
          if (err) {
            res.statusCode = 404;
            res.end('Not found', 'utf8');
          } else {
            res.setHeader('Content-Type', 'text/plain;charset=utf8');
            res.end(contents, 'utf8');
          }
        });
      }).listen(0);
      port = server.address().port;
    });

    afterEach(() => {
      invariant(server);
      server.close();
    });

    it('can do a 2xx GET request', () => {
      waitsForPromise(async () => {
        const realFilename = __filename;
        const response = await xfetch(`http://0.0.0.0:${port}${realFilename}`);
        expect(response.ok).toBe(true);

        const text = await response.text();
        const contents = await fsPromise.readFile(realFilename, 'utf8');
        expect(text).toEqual(contents);
      });
    });

    it('can do a 404 GET request', () => {
      waitsForPromise(async () => {
        // eslint-disable-next-line no-path-concat
        const nonexistingFilename = __filename + 'XXX';
        const response = await xfetch(`http://0.0.0.0:${port}${nonexistingFilename}`);
        expect(response.ok).toBe(false);
        expect(response.status).toBe(404);
        expect(response.statusText).toBe('Not Found');
      });
    });
  });
});
