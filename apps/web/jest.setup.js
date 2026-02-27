require('@testing-library/jest-dom');

// Mock fetch globally for API routes and SDK tests
global.fetch = jest.fn();

// Polyfill for Next.js API routes testing
// Need to polyfill Response and Request before importing Next.js modules

global.Response = class Response {
  constructor(body, init = {}) {
    this._bodyInit = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = init.headers || {};
    this._bodyType = typeof body;
    // Store object body for direct access
    this._bodyObject = (this._bodyType === 'object' && body !== null) ? body : null;
  }

  async json() {
    if (this._bodyType === 'string') {
      return JSON.parse(this._bodyInit);
    }
    // Return the stored object body
    if (this._bodyObject) {
      return this._bodyObject;
    }
    return this._bodyInit;
  }

  async text() {
    if (this._bodyType === 'string') {
      return this._bodyInit;
    }
    return JSON.stringify(this._bodyObject || this._bodyInit);
  }

  // Static method needed by NextResponse
  static json(body, init = {}) {
    const response = new Response(body, init);
    // Add status property for compatibility
    response.status = init.status || 200;
    return response;
  }
};

global.Request = class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || 'GET';
    this.headers = init.headers || {};
    this.body = init.body;
    this._bodyInit = init.body;
  }

  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    if (this._bodyInit) {
      return JSON.parse(this._bodyInit.toString());
    }
    return {};
  }

  async text() {
    if (typeof this.body === 'string') {
      return this.body;
    }
    if (this._bodyInit) {
      return this._bodyInit.toString();
    }
    return '';
  }
};

global.Headers = class Headers {
  constructor(init) {
    this._map = new Map();
    if (init) {
      if (init instanceof Headers) {
        init._map.forEach((value, key) => this._map.set(key, value));
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this._map.set(key, value));
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this._map.set(key, value));
      }
    }
  }

  set(name, value) {
    this._map.set(name, value);
  }

  get(name) {
    return this._map.get(name) || null;
  }

  has(name) {
    return this._map.has(name);
  }

  delete(name) {
    this._map.delete(name);
  }

  forEach(callback) {
    this._map.forEach(callback);
  }
};

// Mock NextResponse to use our polyfilled Response
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: (body, init) => {
        // Use our global Response class
        return global.Response.json(body, init);
      },
    },
  };
});
