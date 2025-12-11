// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import crypto from 'crypto';

Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: string[]) => crypto.randomBytes(arr.length),
  },
});

// Mock layout-related DOM APIs for ProseMirror
Element.prototype.getBoundingClientRect = () =>
  ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    toJSON() {},
  } as DOMRect);

Element.prototype.getClientRects = () =>
  [
    {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      width: 0,
      height: 0,
      toJSON() {},
    },
  ] as unknown as DOMRectList;
  