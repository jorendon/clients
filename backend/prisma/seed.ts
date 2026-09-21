import { AddressKind, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function normalize(raw: string): string {
  return raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

async function main() {
  // 1. Tipos de documento base (mantenedor: se pueden agregar más desde la UI)
  const docTypes = [
    { code: 'SSN', name: 'SSN — Social Security Number' },
    { code: 'FEI_EIN', name: 'FEI/EIN — Federal Employer ID' },
    { code: 'DOC_NUMBER', name: 'Document Number (registro estatal)' },
    { code: 'ITIN', name: 'ITIN — Individual Taxpayer ID' },
    { code: 'PASSPORT', name: 'Pasaporte' },
    { code: 'DRIVER_LICENSE', name: 'Licencia de conducir' },
  ];
  for (const dt of docTypes) {
    await prisma.documentType.upsert({
      where: { code: dt.code },
      create: dt,
      update: { name: dt.name, deletedAt: null },
    });
  }
  const feiEin = await prisma.documentType.findUniqueOrThrow({ where: { code: 'FEI_EIN' } });

  // 2. MVP: COBICA INTERNATIONAL CORP como entidad cliente
  const normalized = normalize('82-4839524');
  let cobica = await prisma.party.findUnique({ where: { normalizedDocument: normalized } });
  if (!cobica) {
    cobica = await prisma.party.create({
      data: {
        kind: 'COMPANY',
        fullName: 'COBICA INTERNATIONAL CORP',
        isClient: true,
        clientTypes: { create: [{ clientType: 'ACCOUNTING' }] },
        registryNumber: 'P18000025045',
        documentTypeId: feiEin.id,
        documentNumber: '82-4839524',
        normalizedDocument: normalized,
      },
    });
    await prisma.partyContact.createMany({
      data: [
        {
          partyId: cobica.id,
          firstName: 'Jose Alejandro',
          lastName: 'Avendano',
          email: 'cobicaangi@gmail.com',
          phone: '407-300-4950',
          isPrimary: true,
        },
        {
          partyId: cobica.id,
          firstName: 'Angiely',
          email: 'cobicaalejandro@gmail.com',
          phone: '407-300-8843',
        },
        { partyId: cobica.id, email: 'ale21ve@gmail.com' },
      ],
    });
    // Dirección conocida (mailing informado = misma que fiscal por ahora)
    await prisma.partyAddress.createMany({
      data: [
        {
          partyId: cobica.id,
          kind: AddressKind.FISCAL,
          street: '10901 ISLAND GROVE RD',
          city: 'CLERMONT',
          state: 'FL',
          zip: '34711',
        },
        { partyId: cobica.id, kind: AddressKind.MAILING, sameAsFiscal: true },
      ],
    });
    console.log('Seed: COBICA INTERNATIONAL CORP creada como cliente');
  } else {
    console.log('Seed: COBICA ya existía, sin cambios');
  }

  // 3. Usuarios iniciales (re-ejecutable: también resetea la contraseña)
  const users = [
    {
      email: 'jonathan.rendon@gmail.com',
      name: 'Jonathan Rendon',
      password: 'OurClients#Adm2026!',
      role: 'ADMIN' as const,
    },
    {
      email: 'michrotel@gmail.com',
      name: 'Empleado',
      password: 'OurClients#Emp2026!',
      role: 'EMPLEADO' as const,
    },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: { ...u, password: await bcrypt.hash(u.password, 10) },
      update: { name: u.name, role: u.role, deletedAt: null, password: await bcrypt.hash(u.password, 10) },
    });
    console.log(`Seed: usuario ${u.email} (${u.role}) listo`);
  }
}

await main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
