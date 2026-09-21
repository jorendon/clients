import type { TFunction } from 'i18next';

const KNOWN_PREFIXES = ['user.', 'validation.', 'client.', 'contractor.', 'documentType.', 'auth.', 'import.'];

/** Traduce mensajes del backend (claves con prefijo conocido) al idioma actual. */
export function translateBackendMessage(t: TFunction, message: unknown): string {
  if (message === 'errors.unexpected') return t('errors.unexpected');
  if (typeof message !== 'string') return t('errors.unexpected');
  const separatorIndex = message.indexOf(':');
  const key = separatorIndex === -1 ? message : message.slice(0, separatorIndex);
  const param = separatorIndex === -1 ? undefined : message.slice(separatorIndex + 1);
  if (KNOWN_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return t(`errors.${key}`, { id: param, defaultValue: message });
  }
  return message;
}

export function getApiErrorMessage(
  t: TFunction,
  error: unknown,
): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) {
      return message.map((item) => translateBackendMessage(t, item)).join(', ');
    }
    if (typeof message === 'string') return translateBackendMessage(t, message);
  }
  return translateBackendMessage(t, 'errors.unexpected');
}
