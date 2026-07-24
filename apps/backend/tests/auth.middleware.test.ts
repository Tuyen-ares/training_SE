import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../src/middleware/auth.middleware.js';
import { TokenService } from '../src/services/token.service.js';

const accessSecret = 'middleware-test-access-secret-that-is-long-enough';
process.env.JWT_SECRET = accessSecret;
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_SECRET =
  'middleware-test-refresh-secret-that-is-long-enough';

interface ResponseCapture {
  statusCode?: number;
  body?: unknown;
}

function createResponse(capture: ResponseCapture): Response {
  return {
    status(code: number) {
      capture.statusCode = code;
      return this;
    },
    json(body: unknown) {
      capture.body = body;
      return this;
    },
  } as unknown as Response;
}

function createRequest(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {},
  } as Request;
}

test('requireAuth rejects missing and malformed Bearer headers', () => {
  for (const authorization of [
    undefined,
    'Basic abc',
    'Bearer',
    'Bearer abc extra',
  ]) {
    const capture = {};
    let nextCalled = false;
    requireAuth(
      createRequest(authorization),
      createResponse(capture),
      () => {
        nextCalled = true;
      },
    );

    assert.equal(capture.statusCode, 401);
    assert.equal(nextCalled, false);
  }
});

test('requireAuth rejects an invalid signature, expired token and invalid payload', () => {
  const tokens = [
    jwt.sign(
      { sub: 1, permissionCodes: ['user.view'] },
      'another-secret',
      { algorithm: 'HS256' },
    ),
    jwt.sign(
      { sub: 1, permissionCodes: ['user.view'] },
      accessSecret,
      { algorithm: 'HS256', expiresIn: -1 },
    ),
    jwt.sign({ sub: 1 }, accessSecret, { algorithm: 'HS256' }),
  ];

  for (const token of tokens) {
    const capture = {};
    let nextCalled = false;
    requireAuth(
      createRequest(`Bearer ${token}`),
      createResponse(capture),
      () => {
        nextCalled = true;
      },
    );

    assert.equal(capture.statusCode, 401);
    assert.equal(nextCalled, false);
  }
});

test('requireAuth attaches a verified payload and continues', () => {
  const token = new TokenService().createAccessToken(7, [
    'user.view',
    'asset.view',
  ]);
  const request = createRequest(`bEaReR ${token}`);
  let nextCalled = false;

  requireAuth(request, createResponse({}), () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(request.auth, {
    sub: 7,
    permissionCodes: ['user.view', 'asset.view'],
  });
});

test('requireAuth returns 500 when the server access-token secret is missing', () => {
  const currentSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  const capture = {};

  try {
    requireAuth(
      createRequest('Bearer any-token'),
      createResponse(capture),
      () => assert.fail('next must not be called'),
    );
    assert.equal(capture.statusCode, 500);
  } finally {
    process.env.JWT_SECRET = currentSecret;
  }
});
