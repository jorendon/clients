# OurClients — Gestión de clientes y contratistas (Vite + Nest.js + MySQL + Docker)

Aplicación **OurClients**: registro de clientes (contabilidad y/o payroll, selección
múltiple) con múltiples contactos y direcciones, mantenedor de tipos de
documento, y contratistas (personas o empresas) asociadas a clientes. Acceso con
login (admin/empleado), bilingüe español/inglés, diseño sobrio con drawer
lateral personalizable con los datos de la empresa.

## Modelo (una sola tabla de entidades)

`Party` concentra personas y empresas: cada registro puede estar **marcado como
cliente** (`isClient` → visible en Clientes y admite contratistas) y a la vez
ser **contratista de otro cliente**. La relación es N:M autorreferenciada
(`client_contractors`): la contratista existe una sola vez por identificación
(`normalizedDocument`) y se asocia a N clientes — base para la futura carga
masiva desde Excel.

## Acceso (login)

La app arranca en `/login`. Sesión JWT (12 h) con roles:

| Usuario | Rol | Contraseña inicial |
| ------- | --- | ------------------ |
| `jonathan.rendon@gmail.com` | ADMIN (gestiona usuarios) | `OurClients#Adm2026!` |
| `michrotel@gmail.com` | EMPLEADO | `OurClients#Emp2026!` |

(Creados con `npm run seed`; re-ejecutarlo resetea las contraseñas.)
Sin token el API responde 401 y el frontend vuelve al login.

## Idiomas (es/en)

- **Frontend:** selector ES/EN en el drawer lateral (persiste en `localStorage`).
  Textos en `frontend/src/i18n/locales/{es,en}.json`.
- **Backend:** traduce sus errores según el header `Accept-Language` (`es` por
  defecto). El frontend lo envía automáticamente.
  Diccionario en `backend/src/common/i18n/dictionaries.ts`.

```bash
curl -H 'Accept-Language: en' http://localhost:3000/api/users/999
# {"statusCode":404,"message":"User #999 not found","error":"Not Found"}
```

## Stack

- **Frontend:** Vite + React 19 + TypeScript + React Router + Axios + Vitest
- **Backend:** Nest.js + Prisma 6 + MySQL + class-validator + Vitest
- **Infra:** Docker + docker-compose (mysql + backend + frontend)

## Estructura

```
.
├── docker-compose.yml
├── .env.example
├── backend/        # Nest.js API (prefijo /api, CORS al front)
│   ├── prisma/schema.prisma   # User, Party, DocumentType, ClientContractor…
│   ├── prisma/seed.ts         # tipos base + COBICA INTERNATIONAL CORP
│   └── src/{users,document-types,parties}/
└── frontend/       # Vite React (clientes, contratistas, tipos, branding)
```

## API — Usuarios

| Método | Ruta                     | Descripción                         |
| ------ | ------------------------ | ----------------------------------- |
| POST   | `/api/users`             | Crear (reactiva si estaba inactivo) |
| GET    | `/api/users`             | Listar activos (`?includeDeleted=true` para todos) |
| GET    | `/api/users/:id`         | Obtener uno activo                  |
| PATCH  | `/api/users/:id`         | Modificar                           |
| DELETE | `/api/users/:id`         | Baja lógica (setea `deletedAt`)     |
| POST   | `/api/users/:id/restore` | Restaurar                           |

Roles: `ADMIN`, `EMPLEADO` (default `EMPLEADO`). Password se guarda con bcrypt.

## API — Tipos de documento

CRUD completo en `/api/document-types` (+ `DELETE` baja lógica, `POST :id/restore`,
`?includeDeleted=true`). El `code` es único (ej. `SSN`, `FEI_EIN`).

## API — Clientes (entidades con `isClient`)

| Método | Ruta                              | Descripción                                    |
| ------ | --------------------------------- | ---------------------------------------------- |
| POST   | `/api/clients`                    | Crear cliente con contactos y direcciones      |
| GET    | `/api/clients?search=`            | Listar clientes                                |
| GET    | `/api/clients/:id`                | Detalle (contactos, direcciones, contratistas) |
| PATCH  | `/api/clients/:id`                | Modificar (reemplaza anidados si se envían)    |
| DELETE | `/api/clients/:id`                | Quita la marca de cliente (conserva datos)     |
| POST   | `/api/clients/:id/restore`        | Volver a marcar como cliente                   |
| GET    | `/api/clients/:id/contractors`    | Contratistas asociadas                         |
| POST   | `/api/clients/:id/contractors`    | Asociar `{ contractorId }` (idempotente)       |
| DELETE | `/api/clients/:id/contractors/:contractorId` | Desasociar                        |

## API — Contratistas (todas las entidades)

CRUD en `/api/contractors` (`?search=`, `?kind=PERSON|COMPANY`,
`?contractorsOnly=true`), baja lógica + restore, y
`GET /api/contractors/search/by-document?document=` (matching normalizado para
la futura carga masiva).

## Carga masiva (CSV)

Flujo en la UI: **subir archivo (.csv, .xls, .xlsx) → validación de formato
(extensión, 10 MB máx., columna de nombre) → tabla previa editable con buscador
→ Procesar carga → reporte** (creadas, asociadas, marcadas cliente, ya existentes,
duplicadas en archivo, errores por fila). Los encabezados aceptan variantes
es/en y typos (`Adress`, `IdType`, `Id`); la columna `CIUDAD, ST ZIP` sin
encabezado se detecta sola; el tipo persona/empresa se infiere por sufijo
(LLC, Inc, Corp…) y es editable.

| Carga | Entrada | Endpoint |
| ----- | ------- | -------- |
| Clientes | `/clients/import` (botón “Carga masiva”) | `POST /api/clients/import` |
| Contratistas de un cliente | `/clients/:id/contractors/import` | `POST /api/clients/:id/contractors/import` |

Reglas de contratistas: si la identificación ya existe (de este u otro
cliente) solo se asocia; sin identificación se busca por nombre exacto; si no
existe se crea y asocia. Todo el reporte usa claves traducibles es/en.

## Personalización (Configuración)

En `/settings`: nombre de la empresa, subtítulo, logo (URL o imagen),
email/teléfono/dirección. Se guarda localmente y se muestra en la barra
superior y el pie. Diseño sobrio sin animaciones.

## Seed MVP

```bash
cd backend && npm run seed
```

Crea los tipos base (SSN, FEI/EIN, Document Number, ITIN, Pasaporte, Licencia)
y **COBICA INTERNATIONAL CORP** como cliente (Document Number `P18000025045`,
FEI/EIN `82-4839524`, 3 contactos, dirección fiscal + correo igual a la fiscal).

## Levantar con Docker (recomendado)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000/api/clients
- MySQL: localhost:3307 (user `w9` / db `w9`; puerto 3307 por defecto para no
  chocar con otros MySQL locales — ajustable con `MYSQL_PORT` en `.env`)

Las migraciones de Prisma corren automáticamente al iniciar el backend
(`prisma migrate deploy`).

## Desarrollo local (sin Docker)

Terminal 1 — MySQL (puedes usar el servicio de compose solo para DB):

```bash
docker compose up mysql
```

Terminal 2 — Backend:

```bash
cd backend
cp .env.example .env   # ajusta DATABASE_URL a mysql://w9:w9secret@localhost:3307/w9
npx prisma migrate dev --name xxx
npm run seed
npm run start:dev
```

Terminal 3 — Frontend:

```bash
cd frontend
cp .env.example .env
npm run dev   # http://localhost:5173
```

## Tests

```bash
cd backend && npm test    # 73 tests: auth + users + document-types + parties + import + i18n
cd frontend && npm test   # 34 tests: auth + apis + tablas + formularios + csv/excel + idioma
```

## Siguiente paso

Nada pendiente de carga: el CSV real de COBICA ya es importable desde
`/clients/1/contractors/import`. Siguientes módulos a definir (pagos, reportes,
retenciones…).
