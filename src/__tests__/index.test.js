/***************************************************************************************
 * (c) 2017 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 ****************************************************************************************/

import { loadIframe, setDebug, ERROR_CODES } from '../parent';

describe('parent', () => {
  let bridge;

  beforeEach(() => {
    // Turn off debugging because individual test cases can set it to true.
    setDebug(false);
  });

  afterEach(() => {
    if (bridge) {
      bridge.destroy();
    }
  });

  it('loads an iframe and provides API', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/simpleSuccess.html`
    });

    expect(bridge.iframe).toEqual(jasmine.any(HTMLIFrameElement));
    expect(bridge.destroy).toEqual(jasmine.any(Function));

    bridge.promise.then(child => {
      expect(child.init).toEqual(jasmine.any(Function));
      expect(child.validate).toEqual(jasmine.any(Function));
      expect(child.getSettings).toEqual(jasmine.any(Function));
      done();
    });
  });

  it('loads an iframe into specified container', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    bridge = loadIframe({
      url: `http://${location.hostname}:9800/simpleSuccess.html`,
      container
    });

    expect(container.querySelector('iframe')).toBe(bridge.iframe);
  });

  it('sets sandbox attribute on iframe', () => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/simpleSuccess.html`,
    });

    expect(bridge.iframe.getAttribute('sandbox'))
      .toBe('allow-same-origin allow-scripts allow-popups');
  });


  it('proxies extension view API when values are returned', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/extensionViewApiReturningValues.html`
    });

    bridge.promise.then(child => {
      Promise.all([
        child.init(),
        child.validate(),
        child.getSettings()
      ]).then(result => {
        expect(result).toEqual([
          undefined,
          false,
          {
            foo: 'bar'
          }
        ]);
        done();
      });
    });
  });

  it('proxies extension view API when promises are returned', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/extensionViewApiReturningPromises.html`
    });

    bridge.promise.then(child => {
      Promise.all([
        child.init(),
        child.validate(),
        child.getSettings()
      ]).then(result => {
        expect(result).toEqual([
          undefined,
          false,
          {
            foo: 'bar'
          }
        ]);
        done();
      });
    });
  });

  it('returns a rejected promise if validate returns a non-boolean value', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/invalidReturnsValues.html`
    });

    bridge.promise.then(child => {
      child.validate().then(
        () => {},
        error => {
          expect(error.message)
            .toContain('The extension attempted to return a non-boolean value from validate');
          done();
        }
      );
    });
  });

  it('returns a rejected promise if getSettings returns a non-object value', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/invalidReturnsValues.html`
    });

    bridge.promise.then(child => {
      child.getSettings().then(
        () => {},
        error => {
          expect(error.message)
            .toContain('The extension attempted to return a non-object value from getSettings');
          done();
        }
      );
    });
  });

  it('returns a rejected promise if validate returns a non-boolean promise', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/invalidReturnsPromises.html`
    });

    bridge.promise.then(child => {
      child.validate().then(
        () => {},
        error => {
          expect(error.message)
            .toContain('The extension attempted to return a non-boolean value from validate');
          done();
        }
      );
    });
  });

  it('returns a rejected promise if getSettings returns a non-object promise', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/invalidReturnsPromises.html`
    });

    bridge.promise.then(child => {
      child.getSettings().then(
        () => {},
        error => {
          expect(error.message)
            .toContain('The extension attempted to return a non-object value from getSettings');
          done();
        }
      );
    });
  });

  it('times out if extension view doesn\'t register with bridge', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/unregisteredInit.html`
    });

    bridge.promise.then(
      () => {},
      error => {
        expect(error).toBe('renderTimeout');
        done();
      }
    );
  });

  it('rejects load promise if extension view init function throws an error', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/initFailure.html`
    });

    bridge.promise.then(
      () => {},
      error => {
        expect(error.message).toBe('bad things');
        done();
      }
    );
  });

  it('returns a rejected promise if extension view has not registered ' +
      'getSettings (or validate) function', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/unregisteredGetSettings.html`
    });

    bridge.promise.then(child => {
      child.getSettings().then(
        () => {},
        error => {
          expect(error.message)
            .toContain('Unable to call getSettings on the extension. The extension must ' +
              'register a getSettings function using extensionBridge.register().');
          done();
        }
      );
    });
  });

  it('proxies lens API', done => {
    const addResultSuffix = options => options.testOption + ' result';

    bridge = loadIframe({
      url: `http://${location.hostname}:9800/lensApi.html`,
      openCodeEditor: addResultSuffix,
      openRegexTester: addResultSuffix,
      openDataElementSelector: addResultSuffix
    });

    bridge.promise.then(child => {
      // We abuse getSettings() for our testing purposes.
      child.getSettings().then(response => {
        expect(response.results).toEqual([
          'code editor result',
          'regex tester result',
          'data element selector result'
        ]);
        done();
      });
    });
  });

  it('rejects promise when connection fails', done => {
    jasmine.clock().install();

    bridge = loadIframe({
      url: `http://${location.hostname}:9800/connectionFailure.html`
    });

    bridge.promise.then(child => {
      // Do nothing.
    }, err => {
      expect(err).toBe(ERROR_CODES.CONNECTION_TIMEOUT);
      jasmine.clock().uninstall();
      done();
    });

    jasmine.clock().tick(10000);
  });

  it('rejects promise when destroyed', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/simpleSuccess.html`
    });

    bridge.promise.then(child => {
      // Do nothing.
    }, err => {
      expect(err).toBe(ERROR_CODES.DESTROYED);
      done();
    });

    bridge.destroy();
  });

  it('removes iframe when destroyed', () => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/simpleSuccess.html`
    });

    bridge.destroy();

    expect(bridge.iframe.parentNode).toBeNull();
  });

  it('allows debugging to be enabled', () => {
    spyOn(console, 'log');

    setDebug(true);

    bridge = loadIframe({
      url: `http://${location.hostname}:9800/simpleSuccess.html`
    });

    expect(console.log).toHaveBeenCalledWith('[Penpal]', 'Parent: Loading iframe');
  });

  it('times out if extension get settings doesn\'t respond in timely manner', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/extensionTookTooLongToRespond.html`,
      extensionResponseTimeoutDuration: 100
    });

    bridge.promise.then(child => {
      child.getSettings().then(
        () => {},
        error => {
          expect(error).toBe('extensionResponseTimeout');
          done();
        }
      );
    });
  });

  it('times out if extension validate doesn\'t respond in timely manner', done => {
    bridge = loadIframe({
      url: `http://${location.hostname}:9800/extensionTookTooLongToRespond.html`,
      extensionResponseTimeoutDuration: 100
    });

    bridge.promise.then(child => {
      child.validate().then(
        () => {},
        error => {
          expect(error).toBe('extensionResponseTimeout');
          done();
        }
      );
    });
  });
});
