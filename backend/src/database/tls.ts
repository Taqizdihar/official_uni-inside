import { X509Certificate } from 'node:crypto';
import type { Config } from '../config/env';

export function decodeDatabaseCa(encoded: string): string {
  if (!encoded || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error('DB_SSL_CA_BASE64 must be valid single-line base64.');
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.toString('base64') !== encoded) throw new Error('DB_SSL_CA_BASE64 must be valid single-line base64.');
  const pem = bytes.toString('utf8');
  const certificates = [...pem.matchAll(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g)];
  const validCertificates = certificates.length > 0 && certificates.every(([, body]) => {
    const certificate = body?.replace(/\s/g, '') ?? '';
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(certificate) || !certificate || Buffer.from(certificate, 'base64').toString('base64') !== certificate) return false;
    try { new X509Certificate(`-----BEGIN CERTIFICATE-----\n${certificate}\n-----END CERTIFICATE-----`); return true; } catch { return false; }
  });
  if (!Buffer.from(pem, 'utf8').equals(bytes) || !validCertificates) {
    throw new Error('DB_SSL_CA_BASE64 must decode to UTF-8 PEM certificate content.');
  }
  return pem;
}

export function databaseTlsOptions(config: Pick<Config, 'DB_SSL_MODE' | 'DB_SSL_CA_BASE64' | 'DB_SSL_REJECT_UNAUTHORIZED'>) {
  if (config.DB_SSL_MODE !== 'required') return undefined;
  return {
    rejectUnauthorized: config.DB_SSL_REJECT_UNAUTHORIZED,
    ...(config.DB_SSL_CA_BASE64 ? { ca: decodeDatabaseCa(config.DB_SSL_CA_BASE64) } : {}),
  };
}
