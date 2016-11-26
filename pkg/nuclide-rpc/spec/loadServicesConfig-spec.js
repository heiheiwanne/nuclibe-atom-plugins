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
import loadServicesConfig from '../lib/loadServicesConfig';
import nuclideUri from '../../commons-node/nuclideUri';
import {generateFixture} from '../../nuclide-test-helpers';

describe('loadServicesConfig()', () => {
  let configPath: ?string;

  beforeEach(() => {
    waitsForPromise(async () => {
      const services3json = [
        {
          implementation: './FooService.js',
          name: 'FooService',
        },
        {
          definition: './BarServiceDefinition.js',
          implementation: './BarServiceImplementation.js',
          name: 'BarService',
        },
      ];
      const fbservices3json = [
        {
          implementation: './BazService.js',
          name: 'BazService',
          preserveFunctionNames: true,
        },
      ];
      configPath = await generateFixture('services', new Map([
        ['services-3.json', JSON.stringify(services3json)],
        ['fb-services-3.json', JSON.stringify(fbservices3json)],
      ]));
    });
  });

  it('resolves absolute paths', () => {
    invariant(configPath);
    const servicesConfig = loadServicesConfig(configPath);
    servicesConfig.forEach(service => {
      expect(nuclideUri.isAbsolute(service.definition)).toBe(true);
      expect(nuclideUri.isAbsolute(service.implementation)).toBe(true);
    });
  });

  it('uses the implementation when the definition is missing', () => {
    invariant(configPath);
    const servicesConfig = loadServicesConfig(configPath);
    const fooService = servicesConfig
      .find(service => service.name === 'FooService');
    invariant(fooService != null);
    expect(fooService.definition).toBe(fooService.implementation);
  });

  it('respects preserveFunctionNames', () => {
    invariant(configPath);
    const servicesConfig = loadServicesConfig(configPath);

    const fooService = servicesConfig
      .find(service => service.name === 'FooService');
    invariant(fooService != null);
    expect(fooService.preserveFunctionNames).toBe(false);

    const barService = servicesConfig
      .find(service => service.name === 'BarService');
    invariant(barService != null);
    expect(barService.preserveFunctionNames).toBe(false);

    const BazService = servicesConfig
      .find(service => service.name === 'BazService');
    invariant(BazService != null);
    expect(BazService.preserveFunctionNames).toBe(true);
  });
});
