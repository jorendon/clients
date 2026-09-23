import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env from the root directory (.env)
dotenv.config({ path: resolve(process.cwd(), '../.env') });

const keyString = process.env.ENCRYPTION_KEY;
const saltString = process.env.HASH_SALT;

if (!keyString || !saltString) {
  console.error('Missing ENCRYPTION_KEY or HASH_SALT in ../.env');
  process.exit(1);
}

const key = Buffer.from(keyString, 'base64');
const salt = saltString;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, authTag, encrypted]);
  return payload.toString('base64');
}

function hashDeterministic(text: string): string {
  return crypto.createHmac('sha256', salt).update(text).digest('hex');
}

// Override DATABASE_URL to connect locally if not provided
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mysql://root:rootsecret@127.0.0.1:3307/clients';
}

const prisma = new PrismaClient();

async function main() {
  console.log('Starting encryption migration...');
  const parties = await prisma.party.findMany();
  let partyCount = 0;
  for (const party of parties) {
    if (party.documentNumber && party.documentNumber.length < 35) {
      const normalized = party.documentNumber.replace(/[^a-z0-9]/gi, '').toUpperCase();
      const hashedNormalized = hashDeterministic(normalized);
      const encrypted = encrypt(party.documentNumber);
      
      await prisma.party.update({
        where: { id: party.id },
        data: {
          documentNumber: encrypted,
          normalizedDocument: hashedNormalized,
        }
      });
      partyCount++;
    }
  }
  console.log(`Encrypted ${partyCount} parties.`);

  const contacts = await prisma.partyContact.findMany();
  let contactCount = 0;
  for (const contact of contacts) {
    if (contact.documentNumber && contact.documentNumber.length < 35) {
      const encrypted = encrypt(contact.documentNumber);
      await prisma.partyContact.update({
        where: { id: contact.id },
        data: {
          documentNumber: encrypted,
        }
      });
      contactCount++;
    }
  }
  console.log(`Encrypted ${contactCount} contacts.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
