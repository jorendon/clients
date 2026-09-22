import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AddressKind, ClientType, PartyKind } from '@prisma/client';

export class PartyContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'validation.invalidEmail' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsInt()
  documentTypeId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  documentNumber?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class PartyAddressDto {
  @IsOptional()
  @IsEnum(AddressKind, { message: 'validation.invalidValue' })
  kind?: AddressKind;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  zip?: string;

  @IsOptional()
  @IsBoolean()
  sameAsFiscal?: boolean;
}

export class CreatePartyDto {
  @IsEnum(PartyKind, { message: 'validation.invalidValue' })
  kind: PartyKind;

  @IsString()
  @IsNotEmpty({ message: 'validation.nameRequired' })
  @MaxLength(180)
  fullName: string;

  /** true → visible en Clientes y admite contratistas asociadas */
  @IsOptional()
  @IsBoolean()
  isClient?: boolean;

  @IsOptional()
  @IsBoolean()
  isComplete?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(ClientType, { each: true, message: 'validation.invalidValue' })
  clientTypes?: ClientType[];

  /** Document Number estatal (ej. P18000025045) */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  registryNumber?: string;

  @IsOptional()
  @IsInt()
  documentTypeId?: number;

  /** SSN o FEI/EIN */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  documentNumber?: string;

  @IsOptional()
  @IsEmail({}, { message: 'validation.invalidEmail' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartyContactDto)
  contacts?: PartyContactDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartyAddressDto)
  addresses?: PartyAddressDto[];
}
