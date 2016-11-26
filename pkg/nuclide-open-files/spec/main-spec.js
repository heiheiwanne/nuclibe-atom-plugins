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
import {FileCache} from '../../nuclide-open-files-rpc/lib/FileCache';
import {getActivation, reset, getFileVersionOfBuffer} from '../lib/main';
import {TextBuffer} from 'atom';
import {getBufferAtVersion} from '../../nuclide-open-files-rpc';
import {Subject} from 'rxjs';

describe('nuclide-open-files', () => {

  let notifier: FileCache = (null: any);

  async function getFileCache(): Promise<FileCache> {
    const cache = await getActivation().notifiers._notifiers.get(null);
    invariant(cache != null);
    return (cache: any);
  }

  describe('observeFileEvents', () => {

    beforeEach(() => {
      waitsForPromise(async () => {
        reset();
        notifier = await getFileCache();
      });
    });

    let finishEvents: () => Promise<Array<Object>> = (null: any);
    let eventCount: number = (null: any);

    beforeEach(() => {
      waitsForPromise(async () => {
        eventCount = 0;
        const done = new Subject();
        const events = (await getFileCache()).observeFileEvents()
          .map(event => {
            eventCount++;
            const result = {
              ...event,
              filePath: event.fileVersion.filePath,
              changeCount: event.fileVersion.version,
            };
            delete result.fileVersion;
            return result;
          }).takeUntil(done).toArray().toPromise();

        finishEvents = () => {
          done.next();
          done.complete();
          return events;
        };
      });
    });

    it('open/close', () => {
      const buffer = new TextBuffer({filePath: 'f1', text: 'contents1'});
      runs(() => {
        // simulates an open
        atom.project.addBuffer(buffer);

        // close
        buffer.destroy();
      });
      waitsFor(() => eventCount >= 2);

      waitsForPromise(async () => {
        expect(await finishEvents()).toEqual([
          {
            kind: 'open',
            filePath: 'f1',
            changeCount: 1,
            contents: 'contents1',
          },
          {
            kind: 'close',
            filePath: 'f1',
            changeCount: 1,
          },
        ]);
      });
    });

    it('open with delayed load sends initial open event after load', () => {
      const buffer = new TextBuffer({filePath: 'f1'});
      runs(() => {
        // simulates an open
        atom.project.addBuffer(buffer);

        // simulates a load ...
        buffer.setText('contents1');

        // close
        buffer.destroy();
      });
      waitsFor(() => eventCount >= 2);

      waitsForPromise(async () => {
        expect(await finishEvents()).toEqual([
          {
            kind: 'open',
            filePath: 'f1',
            changeCount: 2,
            contents: 'contents1',
          },
          {
            kind: 'close',
            filePath: 'f1',
            changeCount: 2,
          },
        ]);
      });
    });

    it('edit', () => {
      const buffer = new TextBuffer({filePath: 'f1', text: 'contents1'});
      runs(() => {
        atom.project.addBuffer(buffer);
      });
      waitsFor(() => eventCount >= 1);

      runs(() => {
        buffer.append('42');

        buffer.destroy();
      });
      waitsFor(() => eventCount >= 3);

      waitsForPromise(async () => {
        expect(await finishEvents()).toEqual([
          {
            kind: 'open',
            filePath: 'f1',
            changeCount: 1,
            contents: 'contents1',
          },
          {
            kind: 'edit',
            filePath: 'f1',
            changeCount: 2,
            oldRange: {
              start: {row: 0, column: 9},
              end: {row: 0, column: 9},
            },
            oldText: '',
            newRange: {
              start: {row: 0, column: 9},
              end: {row: 0, column: 11},
            },
            newText: '42',
          },
          {
            kind: 'close',
            filePath: 'f1',
            changeCount: 2,
          },
        ]);
      });
    });

    it('rename', () => {
      const buffer = new TextBuffer({filePath: 'f1', text: 'contents1'});
      runs(() => {
        atom.project.addBuffer(buffer);
      });
      waitsFor(() => eventCount >= 1);
      runs(() => {
        buffer.setPath('f2');

        buffer.destroy();
      });
      waitsFor(() => eventCount >= 4);

      waitsForPromise(async () => {
        expect(await finishEvents()).toEqual([
          {
            kind: 'open',
            filePath: 'f1',
            changeCount: 1,
            contents: 'contents1',
          },
          {
            kind: 'close',
            filePath: 'f1',
            changeCount: 1,
          },
          {
            kind: 'open',
            filePath: 'f2',
            changeCount: 1,
            contents: 'contents1',
          },
          {
            kind: 'close',
            filePath: 'f2',
            changeCount: 1,
          },
        ]);
      });
    });

    it('rename new file', () => {
      const buffer = new TextBuffer('contents1');
      runs(() => {
        atom.project.addBuffer(buffer);

        buffer.setPath('f2');

        buffer.destroy();
      });
      waitsFor(() => eventCount >= 2);

      waitsForPromise(async () => {
        expect(await finishEvents()).toEqual([
          {
            kind: 'open',
            filePath: 'f2',
            changeCount: 1,
            contents: 'contents1',
          },
          {
            kind: 'close',
            filePath: 'f2',
            changeCount: 1,
          },
        ]);
      });
    });

    it('broken deserialized URIs dont create events', () => {
      runs(() => {
        const brokenBuffer1 = new TextBuffer({filePath: 'nuclide:/f1', text: 'contents1'});
        const brokenBuffer2 = new TextBuffer({filePath: 'nuclide:\\f1', text: 'contents1'});
        atom.project.addBuffer(brokenBuffer1);
        atom.project.addBuffer(brokenBuffer2);

        // close
        brokenBuffer1.destroy();
        brokenBuffer2.destroy();

        // simulates an open
        const buffer = new TextBuffer({filePath: 'f1', text: 'contents1'});
        atom.project.addBuffer(buffer);

        // close
        buffer.destroy();
      });
      waitsFor(() => eventCount >= 2);

      waitsForPromise(async () => {
        expect(await finishEvents()).toEqual([
          {
            kind: 'open',
            filePath: 'f1',
            changeCount: 1,
            contents: 'contents1',
          },
          {
            kind: 'close',
            filePath: 'f1',
            changeCount: 1,
          },
        ]);
      });
    });
  });

  describe('observeDirectoryEvents', () => {

    beforeEach(() => {
      waitsForPromise(async () => {
        reset();
        notifier = await getFileCache();
      });
    });

    let finishDirEvents: () => Promise<Array<Array<string>>> = async () => [];

    let eventCount: number = (null: any);

    beforeEach(() => {
      waitsForPromise(async () => {
        eventCount = 0;
        const done = new Subject();
        const dirEvents = (await getFileCache()).observeDirectoryEvents().takeUntil(done)
          // apm test adds a directory with a name like:
          // '/Applications/Atom.app/Contents/Resources/app.asar/spec'
          .map(dirs => Array.from(dirs).filter(dir => !dir.includes('asar')))
          .do(dirs => { eventCount++; })
          .toArray().toPromise();
        finishDirEvents = () => {
          done.next();
          done.complete();
          return dirEvents;
        };
      });
    });

    it('Initially', () => {
      waitsFor(() => eventCount >= 1);

      waitsForPromise(async () => {
        expect(await finishDirEvents()).toEqual([[]]);
      });
    });

    it('open a dir', () => {
      const dir = __dirname;

      runs(() => {
        atom.project.addPath(dir);
      });
      waitsFor(() => eventCount >= 2);

      waitsForPromise(async () => {
        expect(await finishDirEvents()).toEqual([[], [dir]]);
      });
    });
  });

  describe('getBufferAtVersion', () => {

    beforeEach(() => {
      waitsForPromise(async () => {
        reset();
        notifier = await getFileCache();
      });
    });

    it('get current version', () => {
      waitsForPromise(async () => {
        const buffer = new TextBuffer({notifier, filePath: 'f1', text: 'contents1'});
        atom.project.addBuffer(buffer);

        const fileVersion = await getFileVersionOfBuffer(buffer);
        invariant(fileVersion != null);
        const serverBuffer = await getBufferAtVersion(fileVersion);
        invariant(serverBuffer != null);
        expect(serverBuffer.getText()).toEqual('contents1');

        buffer.destroy();
      });
    });

    it('get next version', () => {
      waitsForPromise(async () => {
        const buffer = new TextBuffer({filePath: 'f1', text: 'contents1'});
        atom.project.addBuffer(buffer);

        const fileVersion = await getFileVersionOfBuffer(buffer);
        invariant(fileVersion != null);
        fileVersion.version++;
        const serverBufferPromise = getBufferAtVersion(fileVersion);

        buffer.append('42');

        invariant(serverBufferPromise != null);
        const serverBuffer = await serverBufferPromise;
        invariant(serverBuffer != null);
        expect(serverBuffer.getText()).toEqual('contents142');

        buffer.destroy();
      });
    });

    it('get out of date version', () => {
      waitsForPromise(async () => {
        const buffer = new TextBuffer({filePath: 'f1', text: 'contents1'});
        atom.project.addBuffer(buffer);

        const outdatedFileVersion = await getFileVersionOfBuffer(buffer);
        invariant(outdatedFileVersion != null);

        buffer.append('42');
        const fileVersion = await getFileVersionOfBuffer(buffer);
        invariant(fileVersion != null);
        await getBufferAtVersion(fileVersion);

        const result = await getBufferAtVersion(outdatedFileVersion);
        expect(result).toBe(null);

        buffer.destroy();
      });
    });

    it('get version before file opens', () => {
      waitsForPromise(async () => {
        const serverBufferPromise = getBufferAtVersion({
          notifier,
          filePath: 'f3',
          version: 1,
        });

        const buffer = new TextBuffer({filePath: 'f3', text: 'contents3'});
        atom.project.addBuffer(buffer);

        const serverBuffer = await serverBufferPromise;
        invariant(serverBuffer != null);
        expect(serverBuffer.getText()).toEqual('contents3');

        buffer.destroy();
      });
    });

    it('get out of date version on open', () => {
      waitsForPromise(async () => {
        const serverBuffer = getBufferAtVersion({
          notifier,
          filePath: 'f3',
          version: 0,
        });

        const buffer = new TextBuffer({filePath: 'f3', text: 'contents1'});
        atom.project.addBuffer(buffer);

        const result = await serverBuffer;

        expect(result).toBe(null);

        buffer.destroy();
      });
    });

    it('get reopened file', () => {
      waitsForPromise(async () => {
        const buffer = new TextBuffer({filePath: 'f3', text: 'contents3'});
        atom.project.addBuffer(buffer);

        const fileVersion = await getFileVersionOfBuffer(buffer);
        invariant(fileVersion != null);
        const serverBuffer = await getBufferAtVersion(fileVersion);
        invariant(serverBuffer != null);
        expect(serverBuffer.getText()).toEqual('contents3');

        const recievedClose = (await getFileCache()).observeFileEvents()
          .filter(event => event.kind === 'close')
          .take(1)
          .toArray()
          .toPromise();
        buffer.destroy();
        await recievedClose;

        const buffer2 = new TextBuffer({filePath: 'f3', text: 'contents4'});
        atom.project.addBuffer(buffer2);
        const fileVersion2 = await getFileVersionOfBuffer(buffer2);
        invariant(fileVersion2 != null);
        const serverBuffer2 = await getBufferAtVersion(fileVersion2);
        invariant(serverBuffer2 != null);
        expect(serverBuffer2.getText())
          .toEqual('contents4');

        buffer2.destroy();
      });
    });
  });
});
