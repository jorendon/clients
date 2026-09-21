import { IsInt } from 'class-validator';

export class AssociateContractorDto {
  @IsInt()
  contractorId: number;
}
