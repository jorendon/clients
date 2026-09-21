import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentTypeDto } from './create-document-type.dto.js';

export class UpdateDocumentTypeDto extends PartialType(CreateDocumentTypeDto) {}
