import * as sshpk from 'sshpk';
import { generateKeyPairSync } from 'crypto';

export interface SshKeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate an RSA-4096 key pair suitable for GitLab deploy keys and OpenHost.
 * RSA has broader compatibility with older SSH clients than Ed25519.
 * Returns the public key in OpenSSH `ssh-rsa AAA...` format and the private
 * key in OpenSSH `-----BEGIN OPENSSH PRIVATE KEY-----` format.
 */
export function generateSshKeyPair(comment = 'openhost-deploy@lovecode.com'): SshKeyPair {
  const { publicKey: publicPem, privateKey: privatePem } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });

  const parsedPrivate = sshpk.parsePrivateKey(privatePem, 'pem');
  const publicKey = parsedPrivate.toPublic();

  return {
    publicKey: publicKey.toString('ssh') + (comment ? ` ${comment}` : ''),
    privateKey: parsedPrivate.toString('openssh'),
  };
}
