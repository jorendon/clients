import { IsArray } from 'class-validator';
import type { ImportClientRow, ImportContractorRow } from '../import.helpers.js';

export class ImportClientsDto {
  @IsArray()
  rows: ImportClientRow[];
}

export class ImportContractorsDto {
  @IsArray()
  rows: ImportContractorRow[];
}
