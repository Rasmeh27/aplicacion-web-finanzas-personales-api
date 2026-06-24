import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import {
  CLASSIFICATION_TO_TYPE,
  TransactionClassification,
  TransactionType,
} from '../entities/transaction.entity';

/**
 * Valida la coherencia entre `type` y `classification`.
 *
 * Si el cliente envía `type`, debe corresponder a la clasificación:
 * - regular_income / extra_income  -> income
 * - fixed_expense / variable_expense -> expense
 *
 * Si `type` no se envía, el servicio lo deriva de la clasificación, por lo que
 * el validador no falla cuando `type` está ausente.
 */
@ValidatorConstraint({ name: 'isTypeCoherentWithClassification', async: false })
export class IsTypeCoherentWithClassificationConstraint
  implements ValidatorConstraintInterface
{
  validate(type: TransactionType | undefined, args: ValidationArguments): boolean {
    const classification = (args.object as { classification?: TransactionClassification })
      .classification;

    // Sin clasificación o sin type explícito no hay nada que validar aquí.
    if (!classification || type === undefined || type === null) {
      return true;
    }

    return CLASSIFICATION_TO_TYPE[classification] === type;
  }

  defaultMessage(args: ValidationArguments): string {
    const classification = (args.object as { classification?: TransactionClassification })
      .classification;
    const expected = classification ? CLASSIFICATION_TO_TYPE[classification] : 'income | expense';
    return `type must be "${expected}" for classification "${classification}"`;
  }
}
