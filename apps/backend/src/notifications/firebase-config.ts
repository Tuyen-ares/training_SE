export type FirebaseRuntimeConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export type FirebaseConfigResult =
  | { state: 'DISABLED' }
  | { state: 'MISCONFIGURED'; error: string }
  | { state: 'READY'; config: FirebaseRuntimeConfig };

function value(env: NodeJS.ProcessEnv, key: string): string {
  return env[key]?.trim() ?? '';
}

export function readFirebaseConfig(
  env: NodeJS.ProcessEnv = process.env,
): FirebaseConfigResult {
  if (value(env, 'FIREBASE_ENABLED') !== 'true') return { state: 'DISABLED' };

  const projectId = value(env, 'FIREBASE_PROJECT_ID');
  const clientEmail = value(env, 'FIREBASE_CLIENT_EMAIL');
  const privateKey = value(env, 'FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey)
    return {
      state: 'MISCONFIGURED',
      error: 'FIREBASE_SERVICE_ACCOUNT_INCOMPLETE',
    };
  if (!clientEmail.includes('@'))
    return { state: 'MISCONFIGURED', error: 'FIREBASE_CLIENT_EMAIL_INVALID' };
  if (!privateKey.includes('BEGIN PRIVATE KEY'))
    return { state: 'MISCONFIGURED', error: 'FIREBASE_PRIVATE_KEY_INVALID' };

  return {
    state: 'READY',
    config: {
      projectId,
      clientEmail,
      privateKey,
    },
  };
}
