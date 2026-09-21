# AGENTS.md — Instrucciones para agentes de IA

## Proyecto

**Clients** es una aplicación fullstack para gestionar clientes (empresas de contabilidad/payroll) y contratistas asociados. Incluye login JWT, UI bilingüe (es/en), carga masiva CSV/Excel, y personalización visual (branding).

---

## Stack

| Capa       | Tecnología                                                         |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | Vite 8 + React 19 + TypeScript 6 + React Router 7 + Axios + i18next |
| Backend    | Nest.js 12 + Prisma 6 + MySQL 8.4 + class-validator + JWT         |
| Tests      | Vitest (ambos lados)                                               |
| Linting    | oxlint (no ESLint)                                                 |
| Infra      | Docker Compose (mysql, backend, frontend con nginx)                |

---

## Estructura del proyecto

```
.
├── docker-compose.yml          # 3 servicios: mysql, backend, frontend
├── .env / .env.example         # Variables compartidas (MySQL, puertos)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Modelo: User, Party, DocumentType, ClientContractor...
│   │   └── seed.ts             # Datos iniciales (tipos doc, COBICA, usuarios)
│   └── src/
│       ├── auth/               # Login JWT, guard global, roles
│       ├── users/              # CRUD usuarios con baja lógica
│       ├── document-types/     # Catálogo de tipos de identificación
│       ├── parties/            # Clientes + Contratistas + Carga masiva
│       ├── prisma/             # PrismaService (módulo global)
│       └── common/i18n/        # Traducción de errores del backend (es/en)
└── frontend/
    └── src/
        ├── api/                # Clientes Axios por recurso
        ├── auth/               # AuthContext (JWT en localStorage)
        ├── branding/           # BrandingContext (personalización visual)
        ├── components/         # Formularios, tablas, importación
        ├── i18n/locales/       # es.json, en.json
        ├── pages/              # Páginas de la app
        ├── types/              # Interfaces TypeScript compartidas
        └── utils/              # Helpers (CSV, errores API)
```

---

## Modelo de datos — Conceptos clave

- **`Party`** es la tabla central: unifica personas y empresas. Un registro puede ser **cliente** (`isClient=true`) y/o **contratista** de otros clientes.
- La relación cliente↔contratista es **N:M autorreferenciada** via `ClientContractor`.
- **`normalizedDocument`** se usa para matching en carga masiva (quita guiones/espacios, mayúsculas).
- Todas las entidades usan **baja lógica** (`deletedAt`), nunca DELETE físico.
- Los contactos y direcciones se **reemplazan completos** al hacer PATCH (no merge parcial).

---

## Convenciones de código

### Backend (Nest.js)

- **ESM puro**: el proyecto usa `"type": "module"`. Los imports entre archivos locales llevan extensión `.js` (e.g. `import { X } from './x.js'`).
- **Prefijo de API**: todas las rutas usan `/api` como prefijo global.
- **Validación**: usa `class-validator` + `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`.
- **Guard global**: `AuthGuard` protege todas las rutas. Usa `@Public()` para rutas públicas (solo `/api/auth/login` y `/api` healthcheck).
- **Roles**: `@Roles(Role.ADMIN)` para restringir a admins.
- **Errores i18n**: los mensajes de error del backend son claves (e.g. `'auth.invalidCredentials'`). El `I18nExceptionFilter` los traduce según `Accept-Language`.
- **Prisma**: siempre pasar por `PrismaService` (inyectado). Las migraciones se aplican con `prisma migrate dev --name xxx` en desarrollo.

### Frontend (React)

- **Sin framework CSS**: usa CSS vanilla en `src/index.css`. No usar TailwindCSS ni CSS-in-JS.
- **i18n**: todos los textos visibles al usuario van en `src/i18n/locales/{es,en}.json`. Usar `t('clave')` de react-i18next, nunca textos hardcodeados.
- **localStorage keys**: prefijo `clients-` (e.g. `clients-token`, `clients-user`, `clients-branding`, `clients-lang`).
- **API client**: usar `apiClient` de `src/api/client.ts` (Axios con interceptor de token JWT).
- **Iconos**: usar `lucide-react`, no instalar otros paquetes de iconos.
- **Formularios**: controlados con `useState`. Sin librerías de formularios (no Formik, no react-hook-form).
- **Rutas protegidas**: envolver con `<Protected>` o `<Protected adminOnly>`.

---

## Tests

### Comandos
```bash
cd backend && npm test     # ~73 tests
cd frontend && npm test    # ~34 tests
```

### Convenciones
- Framework: **Vitest** (no Jest). Archivos `*.spec.ts` en backend, `*.test.ts(x)` en frontend.
- Frontend: usa `@testing-library/react` + `@testing-library/user-event`.
- Backend: usa `@nestjs/testing` para módulos, mocks manuales con `vi.fn()`.
- **Siempre correr los tests** después de cambios significativos.
- Los tests de importación CSV usan archivos inline (no fixtures en disco).

---

## i18n — Internacionalización

- **Frontend**: archivos `frontend/src/i18n/locales/es.json` y `en.json`. Estructura jerárquica por módulo.
- **Backend**: diccionario en `backend/src/common/i18n/dictionaries.ts`. Los errores HTTP se traducen automáticamente.
- **Al agregar textos nuevos**: agregar la clave en **ambos idiomas** (es y en).
- El header `Accept-Language` controla el idioma del backend. El frontend lo envía automáticamente.

---

## Seed y datos iniciales

```bash
cd backend && npm run seed
```

Crea:
- 6 tipos de documento (SSN, FEI/EIN, ITIN, etc.)
- COBICA INTERNATIONAL CORP como cliente de ejemplo
- 2 usuarios: admin (`jonathan.rendon@gmail.com` / `Clients#Adm2026!`) y empleado (`michrotel@gmail.com` / `Clients#Emp2026!`)

> **Nota**: el seed es idempotente (usa upsert). Re-ejecutarlo resetea contraseñas.

---

## Docker

```bash
# Levantar todo
docker compose up --build

# Solo base de datos (desarrollo local)
docker compose up mysql
```

- El Dockerfile del backend ejecuta `prisma migrate deploy` al iniciar, pero **NO ejecuta el seed**.
- Si se borra el volumen (`docker compose down -v`), hay que correr el seed manualmente:
  ```bash
  docker compose exec backend npx prisma db seed
  ```

---

## Patrones comunes

### Agregar un nuevo módulo backend
1. `nest g module nombre` + `nest g controller nombre` + `nest g service nombre`
2. Agregar el modelo en `prisma/schema.prisma` y correr `npx prisma migrate dev --name xxx`
3. Crear DTOs con `class-validator` decorators
4. Registrar el módulo en `app.module.ts`
5. Seguir el patrón de baja lógica (`deletedAt`) si aplica
6. Agregar claves de error en `common/i18n/dictionaries.ts` (es + en)

### Agregar una nueva página frontend
1. Crear el componente en `src/pages/NombrePage.tsx`
2. Agregar la ruta en `App.tsx` dentro de `<Routes>`, envuelta con `<Protected>`
3. Agregar el link en el array `links` del `Shell` si va en el sidebar
4. Agregar textos en `src/i18n/locales/es.json` y `en.json`
5. Crear el API client en `src/api/nombre.ts` usando `apiClient`

### Carga masiva (importación)
- Endpoint: `POST /api/clients/import` o `POST /api/clients/:id/contractors/import`
- El frontend parsea CSV/Excel con `papaparse` + `xlsx`, muestra tabla previa editable, y envía filas al backend.
- El backend hace matching por `normalizedDocument` y devuelve un reporte detallado.

---

## Errores comunes a evitar

- **No olvidar la extensión `.js`** en imports del backend (ESM).
- **No hardcodear textos** en el frontend; siempre usar claves i18n.
- **No usar `prisma` directamente**; usar `PrismaService` inyectado.
- **No hacer DELETE físico**; usar baja lógica con `deletedAt`.
- **No instalar ESLint**; el proyecto usa `oxlint`.
- **No instalar TailwindCSS**; el proyecto usa CSS vanilla.
- **No instalar librerías de formularios**; los formularios son controlados con `useState`.
- **Recordar agregar traducciones en ambos idiomas** (es y en) al agregar textos.
