import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { AddressKind, ClientType, PartyKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CryptoService } from '../common/crypto/crypto.service.js';
import { AssociateContractorDto } from './dto/associate-contractor.dto.js';
import { CreatePartyDto, PartyAddressDto, PartyContactDto } from './dto/create-party.dto.js';
import { UpdatePartyDto } from './dto/update-party.dto.js';
import {
  ImportClientRow,
  ImportContractorRow,
  ImportReport,
  MAX_IMPORT_ROWS,
  detectKindFromName,
  emptyReport,
  parseBooleanish,
  parseClientTypes,
  parseFullAddress,
  parsePartyKind,
  resolveDocTypeCode,
} from './import.helpers.js';

const detailInclude = {
  contacts: { include: { documentType: true }, orderBy: { id: 'asc' as const } },
  addresses: { orderBy: { id: 'asc' as const } },
  documentType: true,
  clientTypes: true,
} satisfies Prisma.PartyInclude;

const clientDetailInclude = {
  ...detailInclude,
  clientLinks: {
    include: {
      contractor: { include: detailInclude },
    },
    orderBy: { assignedAt: 'desc' as const },
  },
} satisfies Prisma.PartyInclude;

/** Normaliza identificaciones para el matching (quita guiones/espacios; mayúsculas). */
export function normalizeDocumentNumber(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return normalized || undefined;
}

export function maskDocumentNumber(doc?: string | null): string | undefined {
  if (!doc) return doc === null ? undefined : doc;
  if (doc.length <= 4) return doc;
  const visiblePart = doc.slice(-4);
  const hiddenPart = doc.slice(0, -4).replace(/[a-zA-Z0-9]/g, '*');
  return hiddenPart + visiblePart;
}

function maskParty<T extends { documentNumber?: string | null; contacts?: { documentNumber?: string | null }[] }>(party: T, crypto: CryptoService, skipMasking = false): T {
  if (party.documentNumber) {
    const decrypted = crypto.decrypt(party.documentNumber);
    (party as any).documentNumber = skipMasking ? decrypted : maskDocumentNumber(decrypted);
  }
  if (party.contacts) {
    party.contacts.forEach((c: any) => {
      if (c.documentNumber) c.documentNumber = crypto.decrypt(c.documentNumber);
    });
  }
  return party;
}

function toContactCreate(partyId: number, dto: PartyContactDto, crypto: CryptoService): Prisma.PartyContactCreateManyInput {
  return {
    partyId,
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
    phone: dto.phone,
    documentTypeId: dto.documentTypeId,
    documentNumber: dto.documentNumber ? crypto.encrypt(dto.documentNumber) : undefined,
    isPrimary: dto.isPrimary ?? false,
  };
}

function toAddressCreate(partyId: number, dto: PartyAddressDto): Prisma.PartyAddressCreateManyInput {
  return {
    partyId,
    kind: dto.kind ?? AddressKind.FISCAL,
    label: dto.label,
    street: dto.street,
    city: dto.city,
    state: dto.state,
    zip: dto.zip,
    sameAsFiscal: dto.sameAsFiscal ?? false,
  };
}

function requireFiscalAddress(addresses?: PartyAddressDto[]) {
  if (!addresses || addresses.length === 0) return;
  const hasFiscal = addresses.some((a) => (a.kind ?? AddressKind.FISCAL) === AddressKind.FISCAL);
  if (!hasFiscal) throw new BadRequestException('client.fiscalAddressRequired');
}

@Injectable()
export class PartiesService {
  constructor(private readonly prisma: PrismaService, private readonly crypto: CryptoService) {}

  /** Crea una entidad (persona o empresa), opcionalmente marcada como cliente. */
  async create(dto: CreatePartyDto) {
    requireFiscalAddress(dto.addresses);
    const normalized = normalizeDocumentNumber(dto.documentNumber);
    const hashedNormalized = normalized ? this.crypto.hashDeterministic(normalized) : undefined;
    if (normalized) {
      const existing = await this.prisma.party.findUnique({
        where: { normalizedDocument: hashedNormalized },
      });
      if (existing && !existing.deletedAt) {
        throw new ConflictException('contractor.documentTaken');
      }
      if (existing?.deletedAt) {
        await this.prisma.party.update({
          where: { id: existing.id },
          data: {
            kind: dto.kind,
            fullName: dto.fullName,
            isClient: dto.isClient ?? existing.isClient,
            registryNumber: dto.registryNumber,
            documentTypeId: dto.documentTypeId,
            documentNumber: dto.documentNumber ? this.crypto.encrypt(dto.documentNumber) : null,
            normalizedDocument: hashedNormalized ?? null,
            email: dto.email,
            phone: dto.phone,
            deletedAt: null,
          },
        });
        if (dto.clientTypes) {
          await this.replaceClientTypes(existing.id, dto.clientTypes);
        }
        await this.replaceNested(existing.id, dto.contacts, dto.addresses);
        return this.findParty(existing.id);
      }
    }

    const isComplete = dto.isComplete ?? !!(dto.documentNumber && dto.documentTypeId && dto.addresses?.length);

    const created = await this.prisma.party.create({
      data: {
        kind: dto.kind,
        fullName: dto.fullName,
        isClient: dto.isClient ?? false,
        isComplete,
        registryNumber: dto.registryNumber,
        documentTypeId: dto.documentTypeId,
        documentNumber: dto.documentNumber ? this.crypto.encrypt(dto.documentNumber) : null,
        normalizedDocument: hashedNormalized ?? null,
        email: dto.email,
        phone: dto.phone,
        ...(dto.clientTypes?.length
          ? { clientTypes: { create: dto.clientTypes.map((t) => ({ clientType: t })) } }
          : {}),
      },
    });
    await this.replaceNested(created.id, dto.contacts, dto.addresses);
    return this.findParty(created.id);
  }

  /** Vista Clientes: solo entidades marcadas como cliente. */
  async findClients(search?: string, includeDeleted = false, clientType?: ClientType) {
    const where: Prisma.PartyWhereInput = {
      isClient: true,
      ...(includeDeleted ? {} : { deletedAt: null }),
    };
    const filters: Prisma.PartyWhereInput[] = [];
    if (clientType) filters.push({ clientTypes: { some: { clientType } } });
    if (search?.trim()) {
      const term = search.trim();
      filters.push({
        OR: [
          { fullName: { contains: term } },
          { documentNumber: { contains: term } },
          { registryNumber: { contains: term } },
        ],
      });
    }
    if (filters.length) where.AND = filters;
    const results = await this.prisma.party.findMany({
      where,
      orderBy: { fullName: 'asc' },
      include: {
        ...detailInclude,
        _count: { select: { clientLinks: true } },
      },
    });
    return results.map(r => maskParty(r, this.crypto));
  }

  /** Vista Contratistas: todas las entidades activas (incluye las que son cliente). */
  async findContractors(search?: string, kind?: PartyKind, contractorsOnly = false) {
    const where: Prisma.PartyWhereInput = { deletedAt: null };
    const filters: Prisma.PartyWhereInput[] = [];
    if (contractorsOnly) filters.push({ isClient: false });
    if (kind) filters.push({ kind });
    if (search?.trim()) {
      const term = search.trim();
      filters.push({
        OR: [{ fullName: { contains: term } }, { documentNumber: { contains: term } }],
      });
    }
    if (filters.length) where.AND = filters;
    const results = await this.prisma.party.findMany({
      where,
      orderBy: { fullName: 'asc' },
      include: {
        ...detailInclude,
        _count: { select: { contractorLinks: true } },
      },
    });
    return results.map(r => maskParty(r, this.crypto));
  }

  async findParty(id: number) {
    const party = await this.prisma.party.findFirst({
      where: { id, deletedAt: null },
      include: detailInclude,
    });
    if (!party) throw new NotFoundException(`contractor.notFound:${id}`);
    return maskParty(party, this.crypto);
  }

  /** Busca por identificación normalizada (base para la carga masiva). */
  async searchByDocument(document: string) {
    const normalized = normalizeDocumentNumber(document);
    if (!normalized) return Promise.resolve(null);
    const hashedNormalized = this.crypto.hashDeterministic(normalized);
    const result = await this.prisma.party.findFirst({
      where: { normalizedDocument: hashedNormalized, deletedAt: null },
      include: detailInclude,
    });
    return result ? maskParty(result, this.crypto) : null;
  }

  async findClientDetail(id: number) {
    const client = await this.prisma.party.findFirst({
      where: { id, isClient: true, deletedAt: null },
      include: clientDetailInclude,
    });
    if (!client) throw new NotFoundException(`client.notFound:${id}`);
    return maskParty(client, this.crypto);
  }

  async update(id: number, dto: UpdatePartyDto) {
    const existing = await this.prisma.party.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`contractor.notFound:${id}`);

    // If the dto has a masked document number, don't update it (keep existing)
    if (dto.documentNumber?.includes('*')) {
      delete dto.documentNumber;
    }
    // Also skip masked numbers in contacts
    if (dto.contacts) {
      dto.contacts.forEach((c) => {
        if (c.documentNumber?.includes('*')) {
          delete c.documentNumber;
        }
      });
    }

    const normalized = normalizeDocumentNumber(dto.documentNumber);
    const hashedNormalized = normalized ? this.crypto.hashDeterministic(normalized) : undefined;
    if (normalized) {
      const taken = await this.prisma.party.findFirst({
        where: { normalizedDocument: hashedNormalized, NOT: { id }, deletedAt: null },
      });
      if (taken) throw new ConflictException('contractor.documentTaken');
    }
    const finalDocNumber = dto.documentNumber !== undefined ? dto.documentNumber : existing.documentNumber;
    const finalDocTypeId = dto.documentTypeId !== undefined ? dto.documentTypeId : existing.documentTypeId;
    const hasAddress = dto.addresses ? dto.addresses.length > 0 : await this.prisma.partyAddress.count({ where: { partyId: id } }) > 0;
    const isComplete = dto.isComplete ?? !!(finalDocNumber && finalDocTypeId && hasAddress);

    await this.prisma.$transaction(async (tx) => {
      const { contacts, addresses, clientTypes, ...header } = dto;
      await tx.party.update({
        where: { id },
        data: {
          ...header,
          isComplete,
          ...(dto.documentNumber !== undefined ? { documentNumber: dto.documentNumber ? this.crypto.encrypt(dto.documentNumber) : null } : {}),
          ...(dto.documentNumber !== undefined ? { normalizedDocument: hashedNormalized ?? null } : {}),
        },
      });
      if (clientTypes) {
        await this.replaceClientTypes(id, clientTypes, tx);
      }
      if (contacts || addresses) {
        await this.replaceNested(id, contacts, addresses, tx);
      }
    });
    return this.findParty(id);
  }

  private async replaceClientTypes(
    partyId: number,
    clientTypes: ClientType[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    await client.partyClientType.deleteMany({ where: { partyId } });
    if (clientTypes.length) {
      await client.partyClientType.createMany({
        data: clientTypes.map((clientType) => ({ partyId, clientType })),
      });
    }
  }

  private async replaceNested(
    partyId: number,
    contacts: PartyContactDto[] | undefined,
    addresses: PartyAddressDto[] | undefined,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    if (contacts) {
      await client.partyContact.deleteMany({ where: { partyId } });
      if (contacts.length) {
        await client.partyContact.createMany({
          data: contacts.map((c) => toContactCreate(partyId, c, this.crypto)),
        });
      }
    }
    if (addresses) {
      await client.partyAddress.deleteMany({ where: { partyId } });
      if (addresses.length) {
        await client.partyAddress.createMany({
          data: addresses.map((a) => toAddressCreate(partyId, a)),
        });
      }
    }
  }

  /** Quitar marca de cliente (conserva la entidad y sus datos). */
  async unmarkClient(id: number) {
    const party = await this.prisma.party.findFirst({
      where: { id, isClient: true, deletedAt: null },
    });
    if (!party) throw new NotFoundException(`client.notFound:${id}`);
    await this.prisma.party.update({
      where: { id },
      data: { isClient: false },
    });
    return this.findParty(id);
  }

  /** Volver a marcar como cliente. */
  async remarkClient(id: number) {
    const party = await this.prisma.party.findFirst({ where: { id, deletedAt: null } });
    if (!party) throw new NotFoundException(`client.notFound:${id}`);
    await this.prisma.party.update({ where: { id }, data: { isClient: true } });
    return this.findClientDetail(id);
  }

  /** Baja lógica total (desaparece de clientes y contratistas). */
  async remove(id: number) {
    const party = await this.prisma.party.findUnique({ where: { id } });
    if (!party) throw new NotFoundException(`contractor.notFound:${id}`);
    const result = await this.prisma.party.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: detailInclude,
    });
    return maskParty(result, this.crypto);
  }

  async restore(id: number) {
    const party = await this.prisma.party.findUnique({ where: { id } });
    if (!party) throw new NotFoundException(`contractor.notFound:${id}`);
    await this.prisma.party.update({ where: { id }, data: { deletedAt: null } });
    return this.findParty(id);
  }

  async listContractors(clientId: number, unmasked = false) {
    await this.findClientDetail(clientId);
    const links = await this.prisma.clientContractor.findMany({
      where: { clientId },
      include: { contractor: { include: detailInclude } },
      orderBy: { assignedAt: 'desc' },
    });
    return links.map((link) => ({ ...maskParty(link.contractor, this.crypto, unmasked), assignedAt: link.assignedAt }));
  }

  async getUnmaskedDocumentNumber(id: number) {
    const party = await this.prisma.party.findUnique({
      where: { id },
      select: { documentNumber: true },
    });
    if (!party) throw new NotFoundException(`contractor.notFound:${id}`);
    const decrypted = party.documentNumber ? this.crypto.decrypt(party.documentNumber) : null;
    return { documentNumber: decrypted };
  }

  /**
   * Asocia una entidad como contratista del cliente. Idempotente.
   * Cualquier entidad activa (persona/empresa, sea o no cliente) puede asociarse.
   */
  async associateContractor(clientId: number, dto: AssociateContractorDto) {
    await this.findClientDetail(clientId);
    if (dto.contractorId === clientId) {
      throw new BadRequestException('client.selfAssociation');
    }
    const contractor = await this.prisma.party.findFirst({
      where: { id: dto.contractorId, deletedAt: null },
    });
    if (!contractor) throw new NotFoundException(`contractor.notFound:${dto.contractorId}`);
    await this.prisma.clientContractor.upsert({
      where: { clientId_contractorId: { clientId, contractorId: dto.contractorId } },
      create: { clientId, contractorId: dto.contractorId },
      update: {},
    });
    return this.listContractors(clientId);
  }

  async dissociateContractor(clientId: number, contractorId: number) {
    await this.findClientDetail(clientId);
    await this.prisma.clientContractor.deleteMany({ where: { clientId, contractorId } });
    return this.listContractors(clientId);
  }

  // ---------- Carga masiva ----------

  private async docTypeIdByCode(): Promise<Map<string, number>> {
    const types = await this.prisma.documentType.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true },
    });
    return new Map(types.map((t) => [t.code, t.id]));
  }

  /**
   * Carga masiva de clientes. Cada fila crea un cliente; si la identificación
   * ya existe como entidad no-cliente, la marca como cliente (no duplica).
   */
  async importClients(rows: ImportClientRow[]): Promise<ImportReport> {
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException('import.tooManyRows');
    }
    const report = emptyReport(rows.length);
    const docTypeIds = await this.docTypeIdByCode();
    const seen = new Set<string>();

    for (let index = 0; index < rows.length; index++) {
      const rowNumber = index + 1;
      try {
        const row = rows[index];
        const fullName = row.fullName?.trim();
        if (!fullName) throw new BadRequestException('import.missingName');

        const kind = row.kind?.trim()
          ? (parsePartyKind(row.kind) ?? detectKindFromName(fullName))
          : detectKindFromName(fullName);
        if (row.kind?.trim() && !parsePartyKind(row.kind)) {
          throw new BadRequestException('import.invalidKind');
        }
        const clientTypes = parseClientTypes(row.clientType);
        if (row.clientType?.trim() && clientTypes.length === 0) {
          throw new BadRequestException('import.invalidClientType');
        }

        const normalized = normalizeDocumentNumber(row.documentNumber);
        const hashedNormalized = normalized ? this.crypto.hashDeterministic(normalized) : undefined;
        if (normalized) {
          if (seen.has(normalized)) {
            report.duplicatesInFile += 1;
            continue;
          }
          seen.add(normalized);
        }

        const docCode = resolveDocTypeCode(row.documentType);
        const contacts: PartyContactDto[] = [];
        if (row.contactFirstName || row.contactLastName || row.contactEmail || row.contactPhone) {
          contacts.push({
            firstName: row.contactFirstName?.trim() || undefined,
            lastName: row.contactLastName?.trim() || undefined,
            email: row.contactEmail?.trim() || undefined,
            phone: row.contactPhone?.trim() || undefined,
          });
        }
        const addresses: PartyAddressDto[] = [];
        const fiscalFull = row.address?.trim() ? parseFullAddress(row.address) : {};
        const fiscalStreet = row.street?.trim() || fiscalFull.street;
        const fiscalCity = row.city?.trim() || fiscalFull.city;
        const fiscalState = row.state?.trim() || fiscalFull.state;
        const fiscalZip = row.zip?.trim() || fiscalFull.zip;
        if (fiscalStreet || fiscalCity || fiscalState || fiscalZip) {
          addresses.push({
            kind: AddressKind.FISCAL,
            street: fiscalStreet || undefined,
            city: fiscalCity || undefined,
            state: fiscalState || undefined,
            zip: fiscalZip || undefined,
          });
        }
        const mailingSame = parseBooleanish(row.mailingSameAsFiscal);
        if (mailingSame) {
          addresses.push({ kind: AddressKind.MAILING, sameAsFiscal: true });
        } else {
          const mailingFull = row.mailingAddress?.trim()
            ? parseFullAddress(row.mailingAddress)
            : {};
          const mailingStreet = row.mailingStreet?.trim() || mailingFull.street;
          const mailingCity = row.mailingCity?.trim() || mailingFull.city;
          const mailingState = row.mailingState?.trim() || mailingFull.state;
          const mailingZip = row.mailingZip?.trim() || mailingFull.zip;
          if (mailingStreet || mailingCity || mailingState || mailingZip) {
            addresses.push({
              kind: AddressKind.MAILING,
              street: mailingStreet || undefined,
              city: mailingCity || undefined,
              state: mailingState || undefined,
              zip: mailingZip || undefined,
            });
          }
        }

        const payload = {
          kind,
          fullName,
          isClient: true,
          ...(clientTypes.length ? { clientTypes } : {}),
          ...(row.registryNumber?.trim() ? { registryNumber: row.registryNumber.trim() } : {}),
          ...(docCode && docTypeIds.get(docCode) ? { documentTypeId: docTypeIds.get(docCode) } : {}),
          ...(row.documentNumber?.trim() ? { documentNumber: row.documentNumber.trim() } : {}),
          ...(row.email?.trim() ? { email: row.email.trim() } : {}),
          ...(row.phone?.trim() ? { phone: row.phone.trim() } : {}),
          ...(contacts.length ? { contacts } : {}),
          ...(addresses.length ? { addresses } : {}),
        };

        try {
          await this.create(payload);
          report.created += 1;
        } catch (error) {
          if (error instanceof ConflictException && hashedNormalized) {
            const existing = await this.prisma.party.findFirst({
              where: { normalizedDocument: hashedNormalized, deletedAt: null },
              include: { clientTypes: true },
            });
            if (existing && !existing.isClient) {
              const merged = [
                ...new Set([
                  ...existing.clientTypes.map((t) => t.clientType),
                  ...(payload.clientTypes ?? []),
                ]),
              ];
              await this.update(existing.id, { ...payload, isClient: true, clientTypes: merged });
              report.markedClient += 1;
            } else if (existing?.isClient) {
              report.existing += 1;
            } else {
              report.markedClient += 1;
            }
          } else {
            console.error('Test unexpected error:', error);
            throw error;
          }
        }
      } catch (error) {
        console.error('Test caught error:', error);
        report.errors.push({
          row: rowNumber,
          message: error instanceof HttpException ? (error.message as string) : 'errors.unexpected',
        });
      }
    }
    return report;
  }

  /**
   * Carga masiva de contratistas asociadas a un cliente. Si la identificación
   * ya existe (de este u otro cliente), solo la asocia; si no, la crea y asocia.
   */
  async importClientContractors(clientId: number, rows: ImportContractorRow[]): Promise<ImportReport> {
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException('import.tooManyRows');
    }
    await this.findClientDetail(clientId);
    const report = emptyReport(rows.length);
    const docTypeIds = await this.docTypeIdByCode();
    const seen = new Set<string>();

    for (let index = 0; index < rows.length; index++) {
      const rowNumber = index + 1;
      try {
        const row = rows[index];
        const fullName = row.name?.trim();
        if (!fullName) throw new BadRequestException('import.missingName');

        const kind = row.kind?.trim()
          ? parsePartyKind(row.kind)
          : detectKindFromName(fullName);
        if (!kind) throw new BadRequestException('import.invalidKind');

        const normalized = normalizeDocumentNumber(row.id);
        const hashedNormalized = normalized ? this.crypto.hashDeterministic(normalized) : undefined;
        if (normalized) {
          if (seen.has(normalized)) {
            report.duplicatesInFile += 1;
            continue;
          }
          seen.add(normalized);
        }

        if (row.mergeId) {
          const existing = await this.prisma.party.findFirst({ where: { id: row.mergeId, deletedAt: null }});
          if (existing) {
            await this.associateContractor(clientId, { contractorId: existing.id });
            report.associated += 1;
            continue;
          }
        }

        let existing = hashedNormalized
          ? await this.prisma.party.findFirst({
              where: { normalizedDocument: hashedNormalized, deletedAt: null },
            })
          : null;

        if (existing) {
          await this.associateContractor(clientId, { contractorId: existing.id });
          report.associated += 1;
          continue;
        }

        const docCode = resolveDocTypeCode(row.idType);
        const full = row.address?.trim() ? parseFullAddress(row.address) : {};
        const legacy = row.city || row.state || row.zip ? undefined : parseFullAddress(row.cityStateZip);
        const street = row.street?.trim() || full.street;
        const city = row.city?.trim() || full.city || legacy?.city;
        const state = row.state?.trim() || full.state || legacy?.state;
        const zip = row.zip?.trim() || full.zip || legacy?.zip;
        const addresses: PartyAddressDto[] = [];
        if (street || city || state || zip) {
          addresses.push({
            kind: AddressKind.FISCAL,
            street: street || undefined,
            city: city || undefined,
            state: state || undefined,
            zip: zip || undefined,
          });
        }

        const created = await this.create({
          kind,
          fullName,
          ...(docCode && docTypeIds.get(docCode) ? { documentTypeId: docTypeIds.get(docCode) } : {}),
          ...(row.id?.trim() ? { documentNumber: row.id.trim() } : {}),
          ...(row.email?.trim() ? { email: row.email.trim() } : {}),
          ...(row.phone?.trim() ? { phone: row.phone.trim() } : {}),
          ...(addresses.length ? { addresses } : {}),
        });
        await this.associateContractor(clientId, { contractorId: created.id });
        report.created += 1;
      } catch (error) {
        report.errors.push({
          row: rowNumber,
          message: error instanceof HttpException ? (error.message as string) : 'errors.unexpected',
        });
      }
    }
    return report;
  }

  async checkDuplicates(names: string[]) {
    if (!names?.length) return [];
    
    // Normalize string for comparison: lowercase, remove accents, remove non-alphanumeric except spaces
    const normalizeName = (s: string) => 
      s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/gi, '');

    const parties = await this.prisma.party.findMany({
      where: { deletedAt: null, isClient: false }, // Only look for contractors for merging
      select: { id: true, fullName: true, documentNumber: true, kind: true }
    });
    parties.forEach(p => {
      if (p.documentNumber) p.documentNumber = this.crypto.decrypt(p.documentNumber);
    });

    const results = names.map(name => {
      const normName = normalizeName(name);
      
      // Try exact match first on normalized names
      let exactMatches = parties.filter(p => normalizeName(p.fullName) === normName);
      if (exactMatches.length > 0) {
        return { name, exactMatch: true, matches: exactMatches };
      }
      
      // If no exact match, try fuzzy (contains)
      let fuzzyMatches = parties.filter(p => {
        const normP = normalizeName(p.fullName);
        return normP.includes(normName) || normName.includes(normP);
      });

      return { name, exactMatch: false, matches: fuzzyMatches };
    });

    return results;
  }
}
