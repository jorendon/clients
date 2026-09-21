export type SupportedLang = 'es' | 'en';

/** Normaliza el header Accept-Language a 'es' | 'en' (default 'es'). */
export function normalizeLang(header?: string): SupportedLang {
  const code = header?.split(',')[0]?.split('-')[0]?.trim().toLowerCase();
  return code === 'en' ? 'en' : 'es';
}

const dictionaries: Record<SupportedLang, Record<string, string>> = {
  es: {
    'user.emailTaken': 'El email ya está registrado',
    'user.emailInUse': 'El email ya está en uso',
    'validation.invalidEmail': 'Email inválido',
    'validation.nameRequired': 'El nombre es requerido',
    'validation.passwordMin': 'La contraseña debe tener al menos 6 caracteres',
    'validation.invalidRole': 'Rol inválido. Usa ADMIN o EMPLEADO',
    'validation.invalidValue': 'Valor inválido',
    'validation.invalidCode': 'Código inválido. Usa mayúsculas, números y guion bajo',
    'validation.passwordRequired': 'La contraseña es requerida',
    'auth.invalidCredentials': 'Email o contraseña incorrectos',
    'auth.unauthorized': 'Sesión inválida o expirada. Inicia sesión de nuevo',
    'auth.forbidden': 'No tienes permiso para esta acción',
    'documentType.codeTaken': 'El código ya está registrado',
    'client.fiscalAddressRequired': 'Si agregas direcciones, al menos una debe ser fiscal',
    'client.selfAssociation': 'No se puede asociar una entidad consigo misma',
    'contractor.documentTaken': 'La identificación ya está registrada',
    'import.missingName': 'Falta el nombre',
    'import.invalidKind': 'Tipo de entidad inválido (usa PERSON o COMPANY)',
    'import.invalidClientType': 'Tipo de cliente inválido (usa ACCOUNTING o PAYROLL)',
    'import.tooManyRows': 'Demasiadas filas (máximo 5000 por carga)',
  },
  en: {
    'user.emailTaken': 'Email is already registered',
    'user.emailInUse': 'Email is already in use',
    'validation.invalidEmail': 'Invalid email',
    'validation.nameRequired': 'Name is required',
    'validation.passwordMin': 'Password must be at least 6 characters',
    'validation.invalidRole': 'Invalid role. Use ADMIN or EMPLEADO',
    'validation.invalidValue': 'Invalid value',
    'validation.invalidCode': 'Invalid code. Use uppercase, numbers and underscore',
    'validation.passwordRequired': 'Password is required',
    'auth.invalidCredentials': 'Incorrect email or password',
    'auth.unauthorized': 'Session is invalid or expired. Please log in again',
    'auth.forbidden': 'You do not have permission for this action',
    'documentType.codeTaken': 'Code is already registered',
    'client.fiscalAddressRequired': 'If you add addresses, at least one must be fiscal',
    'client.selfAssociation': 'An entity cannot be associated with itself',
    'contractor.documentTaken': 'ID is already registered',
    'import.missingName': 'Missing name',
    'import.invalidKind': 'Invalid entity type (use PERSON or COMPANY)',
    'import.invalidClientType': 'Invalid client type (use ACCOUNTING or PAYROLL)',
    'import.tooManyRows': 'Too many rows (max 5000 per upload)',
  },
};

/**
 * Traduce una clave de mensaje. Soporta parámetro con formato `clave:valor`
 * (ej. `user.notFound:5` → "Usuario #5 no encontrado" / "User #5 not found").
 * Si no es una clave conocida, devuelve el texto original.
 */
export function translate(message: string, lang: SupportedLang): string {
  const separatorIndex = message.indexOf(':');
  const key = separatorIndex === -1 ? message : message.slice(0, separatorIndex);
  const param = separatorIndex === -1 ? undefined : message.slice(separatorIndex + 1);

  if (key === 'user.notFound') {
    return lang === 'en' ? `User #${param} not found` : `Usuario #${param} no encontrado`;
  }
  if (key === 'client.notFound') {
    return lang === 'en' ? `Client #${param} not found` : `Cliente #${param} no encontrado`;
  }
  if (key === 'contractor.notFound') {
    return lang === 'en' ? `Record #${param} not found` : `Registro #${param} no encontrado`;
  }
  if (key === 'documentType.notFound') {
    return lang === 'en'
      ? `Document type #${param} not found`
      : `Tipo de documento #${param} no encontrado`;
  }

  return dictionaries[lang][key] ?? message;
}
