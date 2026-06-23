import { PartialType } from '@nestjs/swagger';
import { CreateTransactionDto } from './create-transaction.dto';

/**
 * Todos los campos opcionales. La coherencia type/classification se valida solo
 * cuando ambos se envían (ver IsTypeCoherentWithClassificationConstraint) y el
 * servicio re-deriva el tipo cuando cambia la clasificación.
 */
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
