import { ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeLang, translate } from './dictionaries.js';
import { I18nExceptionFilter } from './i18n-exception.filter.js';

describe('normalizeLang', () => {
  it.each([
    [undefined, 'es'],
    ['es', 'es'],
    ['es-MX', 'es'],
    ['en', 'en'],
    ['en-US,en;q=0.9,es;q=0.8', 'en'],
    ['fr', 'es'],
  ])('"%s" → "%s"', (header, expected) => {
    expect(normalizeLang(header)).toBe(expected);
  });
});

describe('translate', () => {
  it('traduce claves conocidas a español por defecto', () => {
    expect(translate('user.emailTaken', 'es')).toBe('El email ya está registrado');
  });

  it('traduce claves conocidas a inglés', () => {
    expect(translate('user.emailTaken', 'en')).toBe('Email is already registered');
    expect(translate('validation.passwordMin', 'en')).toBe(
      'Password must be at least 6 characters',
    );
  });

  it('interpola el id en user.notFound', () => {
    expect(translate('user.notFound:5', 'es')).toBe('Usuario #5 no encontrado');
    expect(translate('user.notFound:5', 'en')).toBe('User #5 not found');
  });

  it('devuelve el texto original si no es una clave', () => {
    expect(translate('Algo inesperado', 'en')).toBe('Algo inesperado');
  });
});

describe('I18nExceptionFilter', () => {
  let filter: I18nExceptionFilter;
  let json: ReturnType<typeof vi.fn>;
  let status: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    filter = new I18nExceptionFilter();
    json = vi.fn();
    status = vi.fn().mockReturnValue({ json });
  });

  function hostWithLang(acceptLanguage?: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'accept-language': acceptLanguage } }),
        getResponse: () => ({ status }),
      }),
    } as never;
  }

  it('traduce el mensaje según Accept-Language: en', () => {
    filter.catch(new ConflictException('user.emailTaken'), hostWithLang('en'));
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'Email is already registered',
      error: 'Conflict',
    });
  });

  it('usa español por defecto sin header', () => {
    filter.catch(new NotFoundException('user.notFound:9'), hostWithLang(undefined));
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Usuario #9 no encontrado',
      error: 'Not Found',
    });
  });

  it('traduce arrays de errores de validación', () => {
    const exception = new HttpException(
      {
        statusCode: 400,
        message: ['validation.invalidEmail', 'validation.nameRequired'],
        error: 'Bad Request',
      },
      400,
    );
    filter.catch(exception, hostWithLang('en'));
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: ['Invalid email', 'Name is required'],
      error: 'Bad Request',
    });
  });

  it('deja intactos los mensajes que no son claves', () => {
    filter.catch(new ConflictException('Otro error'), hostWithLang('en'));
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'Otro error',
      error: 'Conflict',
    });
  });
});
