import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { normalizeLang, translate } from './dictionaries.js';

/**
 * Traduce los mensajes de error (claves como `user.emailTaken` o arrays de
 * claves de validación) al idioma del header `Accept-Language` (es/en).
 * Los mensajes que no son claves pasan sin cambios.
 */
@Catch(HttpException)
export class I18nExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const lang = normalizeLang(request?.headers?.['accept-language']);
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === 'string') {
      response.status(status).json({
        statusCode: status,
        message: translate(body, lang),
      });
      return;
    }

    if (typeof body === 'object' && body !== null) {
      const translated = { ...(body as Record<string, unknown>) };
      if (Array.isArray(translated.message)) {
        translated.message = translated.message.map((item) =>
          typeof item === 'string' ? translate(item, lang) : item,
        );
      } else if (typeof translated.message === 'string') {
        translated.message = translate(translated.message as string, lang);
      }
      response.status(status).json(translated);
      return;
    }

    response.status(status).json(body);
  }
}
