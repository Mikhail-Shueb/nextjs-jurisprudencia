import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
const { setImmediate, clearImmediate } = require('timers');

// ── Web Streams & Polyfills for Undici / Elasticsearch in JSDOM ──────
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;

global.setImmediate = setImmediate as any;
global.clearImmediate = clearImmediate as any;

global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Suppress known backend console warnings during testing
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Elasticsearch offline') ||
      args[0].includes('fallback') ||
      args[0].includes('Redis'))
  ) {
    return;
  }
  originalWarn(...args);
};
