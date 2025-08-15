import { PartialType } from '@nestjs/swagger';
import { CreateSignalDto } from './create-signal.dto';

export class UpdateSignalDto extends PartialType(CreateSignalDto) {}
