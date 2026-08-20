import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { inspect } from 'node:util';
import { PrismaAssetRepository } from '../src/repositories/asset.prisma.repository.js';
import { PrismaAuthRepository } from '../src/repositories/auth.prisma.repository.js';
import { PrismaRbacRepository } from '../src/repositories/rbac.prisma.repository.js';
import { PrismaRefreshTokenRepository } from '../src/repositories/refresh-token.prisma.repository.js';
import { PrismaUserRepository } from '../src/repositories/user.prisma.repository.js';
import { PrismaMediaRepository } from '../src/repositories/media.prisma.repository.js';
import { AssetService } from '../src/services/assets.service.js';
import { AuthService } from '../src/services/auth.service.js';
import { RbacService } from '../src/services/rbac.service.js';
import { MediaService } from '../src/services/media.service.js';
import { SessionService } from '../src/services/session.service.js';
import { TokenService } from '../src/services/token.service.js';
import {
  AuthError,
  ConflictError,
  InvalidStateTransitionError,
  MediaError,
  UserError,
} from '../src/shared/app-error.js';
import { hashPassword } from '../src/shared/security/password-hasher.js';

process.env.JWT_SECRET = 'db-test-access-secret-that-is-long-enough';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_SECRET =
  'db-test-refresh-secret-that-is-long-enough';

function uniqueSuffix(): string {
  return randomUUID().replaceAll('-', '').slice(0, 10);
}

function uniquePhone(prefix: number): string {
  const randomDigits = Math.floor(Math.random() * 100_000_000)
    .toString()
    .padStart(8, '0');
  return `${prefix}${randomDigits}`;
}

test('database constraints and conditional updates resolve races in User, Auth, Asset and RBAC', async (context) => {
  const { default: prisma } = await import('../src/prisma.js');
  const department = await prisma.departments.findFirst({
    select: { id: true },
  });
  const employeeRole = await prisma.roles.findUnique({
    where: { name: 'employee' },
    select: { id: true },
  });
  const managerRole = await prisma.roles.findUnique({
    where: { name: 'asset_manager' },
    select: { id: true },
  });

  assert.ok(department, 'A department seed is required');
  assert.ok(employeeRole, 'The employee role seed is required');
  assert.ok(managerRole, 'The asset_manager role seed is required');
  const mediaUploader = await prisma.users.findFirst({ select: { id: true } });
  assert.ok(mediaUploader, 'A user seed is required for media race tests');

  const createdUserIds: number[] = [];
  const createdAssetIds: number[] = [];
  const createdAssetModelIds: number[] = [];
  const createdBrandIds: number[] = [];
  const createdAssetTypeIds: number[] = [];
  const cleanupEmails: string[] = [];
  const createdMediaIds: number[] = [];

  try {
    await context.test(
      'User: simultaneous creates with one email allow one row only',
      async () => {
        const suffix = uniqueSuffix();
        const email = `race.user.${suffix}@test.local`;
        const passwordHash = await hashPassword('123456');
        cleanupEmails.push(email);
        const repository = new PrismaUserRepository(prisma);
        const input = {
          departmentId: department.id,
          name: 'Race User',
          email,
          phone: uniquePhone(11),
          passwordHash,
        };

        // The MariaDB adapter can surface a duplicate-key error only at the
        // commit boundary of concurrent interactive transactions. Running the
        // two INSERT statements directly keeps this test focused on the
        // database constraint and repository error mapping.
        const results = await Promise.allSettled([
          repository.create(input, prisma),
          repository.create(
            { ...input, phone: uniquePhone(12) },
            prisma,
          ),
        ]);

        assert.equal(
          results.filter((result) => result.status === 'fulfilled').length,
          1,
        );
        const rejectedReasons = results
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason);
        assert.equal(
          rejectedReasons.filter(
            (reason) =>
              reason instanceof UserError &&
              reason.code === 'EMAIL_IN_USE',
          ).length,
          1,
          inspect(rejectedReasons, { depth: 5 }),
        );
        assert.equal(
          await prisma.users.count({ where: { email } }),
          1,
        );

        const phone = uniquePhone(15);
        const firstEmail = `race.phone.a.${suffix}@test.local`;
        const secondEmail = `race.phone.b.${suffix}@test.local`;
        cleanupEmails.push(firstEmail, secondEmail);
        const phoneResults = await Promise.allSettled([
          prisma.$transaction((transaction) =>
            repository.create(
              { ...input, email: firstEmail, phone },
              transaction,
            ),
          ),
          prisma.$transaction((transaction) =>
            repository.create(
              { ...input, email: secondEmail, phone },
              transaction,
            ),
          ),
        ]);

        assert.equal(
          phoneResults.filter((result) => result.status === 'fulfilled').length,
          1,
        );
        assert.equal(
          phoneResults.filter(
            (result) =>
              result.status === 'rejected' &&
              result.reason instanceof UserError &&
              result.reason.code === 'PHONE_IN_USE',
          ).length,
          1,
        );
        assert.equal(
          await prisma.users.count({ where: { phone } }),
          1,
        );
      },
    );

    await context.test(
      'Auth: simultaneous use of one refresh token rotates once and revokes the family',
      async () => {
        const suffix = uniqueSuffix();
        const user = await prisma.users.create({
          data: {
            user_code: `BI26${suffix}1`,
            department_id: department.id,
            name: 'Refresh Race User',
            email: `race.auth.${suffix}@test.local`,
            phone: uniquePhone(13),
            password: await hashPassword('123456'),
            user_roles: {
              create: { role_id: employeeRole.id },
            },
          },
          select: { id: true },
        });
        createdUserIds.push(user.id);

        const authRepository = new PrismaAuthRepository(prisma);
        const refreshRepository = new PrismaRefreshTokenRepository(prisma);
        const tokenService = new TokenService();
        const sessionService = new SessionService(refreshRepository);
        const authService = new AuthService(
          authRepository,
          refreshRepository,
          tokenService,
          sessionService,
          prisma,
        );
        const issued = tokenService.createRefreshToken(user.id);
        await refreshRepository.create({
          jti: issued.jti,
          userId: user.id,
          familyId: issued.familyId,
          expiresAt: issued.expiresAt,
        });

        const results = await Promise.allSettled([
          authService.refresh(issued.token),
          authService.refresh(issued.token),
        ]);

        assert.equal(
          results.filter((result) => result.status === 'fulfilled').length,
          1,
        );
        assert.equal(
          results.filter(
            (result) =>
              result.status === 'rejected' &&
              result.reason instanceof AuthError &&
              result.reason.code === 'REFRESH_TOKEN_REUSED',
          ).length,
          1,
        );

        const familyTokens = await prisma.refresh_tokens.findMany({
          where: { family_id: issued.familyId },
          select: { is_revoked: true },
        });
        assert.ok(familyTokens.length >= 2);
        assert.equal(
          familyTokens.every((token) => token.is_revoked),
          true,
        );
      },
    );

    await context.test(
      'Asset: simultaneous reservations use a conditional status update and have one winner',
      async () => {
        const suffix = uniqueSuffix();
        const brand = await prisma.brands.create({
          data: { name: `RaceBrand-${suffix}` },
          select: { id: true },
        });
        createdBrandIds.push(brand.id);
        const normalizedPrefix = `RACE${suffix}`;
        const assetType = await prisma.asset_types.create({
          data: { name: `RaceType-${suffix}`, normalized_prefix: normalizedPrefix },
          select: { id: true },
        });
        createdAssetTypeIds.push(assetType.id);
        const assetModel = await prisma.asset_models.create({
          data: {
            brand_id: brand.id,
            asset_type_id: assetType.id,
            name: `RaceModel-${suffix}`,
          },
          select: { id: true },
        });
        createdAssetModelIds.push(assetModel.id);
        const asset = await prisma.assets.create({
          data: {
            asset_code: `${normalizedPrefix}0001`,
            asset_model_id: assetModel.id,
            serial_number: `RACE-${suffix}`,
            qr_code: randomUUID(),
          },
          select: { id: true },
        });
        createdAssetIds.push(asset.id);

        const service = new AssetService(
          new PrismaAssetRepository(prisma),
          prisma,
        );
        const duplicateSerial = `DUP-${suffix}`;
        const duplicateRepository = new PrismaAssetRepository(prisma);
        const duplicateResults = await Promise.allSettled([
          duplicateRepository.create({
            asset_code: `${normalizedPrefix}0002`,
            asset_model_id: assetModel.id,
            serial_number: duplicateSerial,
            qr_code: randomUUID(),
            status: 'available',
          }),
          duplicateRepository.create({
            asset_code: `${normalizedPrefix}0003`,
            asset_model_id: assetModel.id,
            serial_number: duplicateSerial,
            qr_code: randomUUID(),
            status: 'available',
          }),
        ]);
        const createdDuplicateAsset = duplicateResults.find(
          (result) => result.status === 'fulfilled',
        );
        if (createdDuplicateAsset?.status === 'fulfilled') {
          createdAssetIds.push(createdDuplicateAsset.value.id);
        }
        assert.equal(
          duplicateResults.filter((result) => result.status === 'fulfilled')
            .length,
          1,
        );
        assert.equal(
          duplicateResults.filter(
            (result) =>
              result.status === 'rejected' &&
              result.reason instanceof ConflictError &&
              result.reason.message === 'Serial number already exists',
          ).length,
          1,
        );

        // Verify the conditional UPDATE itself. This isolates its atomic
        // compare-and-set behavior from MariaDB adapter commit timing; a
        // future approval workflow will still supply its own transaction.
        const results = await Promise.allSettled([
          service.reserveForApprovedRequest([asset.id], prisma),
          service.reserveForApprovedRequest([asset.id], prisma),
        ]);
        assert.equal(
          results.filter((result) => result.status === 'fulfilled').length,
          1,
        );
        assert.equal(
          results.filter(
            (result) =>
              result.status === 'rejected' &&
              result.reason instanceof InvalidStateTransitionError,
          ).length,
          1,
        );
        assert.equal(
          (
            await prisma.assets.findUniqueOrThrow({
              where: { id: asset.id },
              select: { status: true },
            })
          ).status,
          'reserved',
        );
      },
    );

    await context.test(
      'Media: cancel and business claim serialize on the media row lock',
      async () => {
        const repository = new PrismaMediaRepository(prisma);
        const createReady = async (label: string) => {
          const row = await prisma.media_files.create({
            data: {
              storage_path: `evidence/return/race-${label}-${randomUUID()}.jpg`,
              mime_type: 'image/jpeg',
              size_bytes: 3,
              purpose: 'return',
              upload_status: 'ready',
              uploaded_by: mediaUploader.id,
              uploaded_at: new Date(),
            },
          });
          createdMediaIds.push(row.id);
          return row;
        };

        const cancelFirst = await createReady('cancel-first');
        let releaseDelete!: () => void;
        const deleteGate = new Promise<void>((resolve) => { releaseDelete = resolve; });
        let deleteStarted!: () => void;
        const deleteStartedGate = new Promise<void>((resolve) => { deleteStarted = resolve; });
        const cancelFirstService = new MediaService(repository, {
          deleteObject: async () => {
            deleteStarted();
            await deleteGate;
            return 'DELETED';
          },
        } as any, prisma);

        const cancelPromise = cancelFirstService.cancel(cancelFirst.id, mediaUploader.id);
        await deleteStartedGate;
        const blockedClaim = prisma.$transaction((transaction) =>
          repository.claimReady(cancelFirst.id, mediaUploader.id, 'RETURN', transaction),
        );
        releaseDelete();
        await cancelPromise;
        assert.equal(await blockedClaim, false, 'claim must fail after cancel deletes the locked row');

        const claimFirst = await createReady('claim-first');
        let releaseClaim!: () => void;
        const claimGate = new Promise<void>((resolve) => { releaseClaim = resolve; });
        let claimLocked!: () => void;
        const claimLockedGate = new Promise<void>((resolve) => { claimLocked = resolve; });
        let storageDeleteCalls = 0;
        const claimFirstService = new MediaService(repository, {
          deleteObject: async () => {
            storageDeleteCalls += 1;
            return 'DELETED';
          },
        } as any, prisma);

        const claimPromise = prisma.$transaction(async (transaction) => {
          const claimed = await repository.claimReady(claimFirst.id, mediaUploader.id, 'RETURN', transaction);
          claimLocked();
          await claimGate;
          return claimed;
        });
        await claimLockedGate;
        const blockedCancel = claimFirstService.cancel(claimFirst.id, mediaUploader.id);
        releaseClaim();
        assert.equal(await claimPromise, true);
        await assert.rejects(blockedCancel, (error: unknown) =>
          error instanceof MediaError && error.code === 'MEDIA_ALREADY_LINKED');
        assert.equal(storageDeleteCalls, 0, 'linked media object must be preserved');
      },
    );

    await context.test(
      'RBAC: simultaneous role replacements never leave a partial or mixed set',
      async () => {
        const suffix = uniqueSuffix();
        const user = await prisma.users.create({
          data: {
            user_code: `BI26${suffix}2`,
            department_id: department.id,
            name: 'RBAC Race User',
            email: `race.rbac.${suffix}@test.local`,
            phone: uniquePhone(14),
            password: await hashPassword('123456'),
            user_roles: {
              create: { role_id: employeeRole.id },
            },
          },
          select: { id: true },
        });
        createdUserIds.push(user.id);
        const service = new RbacService(
          new PrismaRbacRepository(prisma),
          prisma,
        );
        const submittedSets = [
          [employeeRole.id],
          [employeeRole.id, managerRole.id].sort((a, b) => a - b),
        ];

        const results = await Promise.allSettled([
          service.replaceUserRoles(user.id, submittedSets[0]),
          service.replaceUserRoles(user.id, submittedSets[1]),
        ]);

        assert.ok(
          results.some((result) => result.status === 'fulfilled'),
          'At least one atomic role replacement must succeed',
        );

        const persistedRoleIds = (
          await prisma.user_roles.findMany({
            where: { user_id: user.id },
            select: { role_id: true },
            orderBy: { role_id: 'asc' },
          })
        ).map(({ role_id }) => role_id);

        assert.ok(
          submittedSets.some(
            (set) =>
              set.length === persistedRoleIds.length &&
              set.every((roleId, index) => roleId === persistedRoleIds[index]),
          ),
          `Unexpected partial role set: ${persistedRoleIds.join(',')}`,
        );
      },
    );
  } finally {
    await prisma.media_files.deleteMany({
      where: { id: { in: createdMediaIds } },
    });
    await prisma.users.deleteMany({
      where: {
        OR: [
          { id: { in: createdUserIds } },
          { email: { in: cleanupEmails } },
        ],
      },
    });
    await prisma.assets.deleteMany({
      where: { id: { in: createdAssetIds } },
    });
    await prisma.asset_models.deleteMany({
      where: { id: { in: createdAssetModelIds } },
    });
    await prisma.brands.deleteMany({
      where: { id: { in: createdBrandIds } },
    });
    await prisma.asset_types.deleteMany({
      where: { id: { in: createdAssetTypeIds } },
    });
    await prisma.$disconnect();
  }
});
