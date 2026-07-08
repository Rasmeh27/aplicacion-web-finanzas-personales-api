import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { FinancialContextRequestDto } from './dto/financial-context-request.dto';
import { FinancialContextResponseDto } from './dto/financial-context-response.dto';
import { FinancialContextService } from './financial-context.service';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';

/**
 * Endpoint INTERNO servicio-a-servicio (lo llama solo el ai-service).
 *
 * - Protegido por `X-Internal-API-Key` (InternalApiKeyGuard), NUNCA por JWT de
 *   usuario final: el frontend no debe poder llamarlo.
 * - Excluido de Swagger para no publicitarlo como API de usuario.
 * - Read-only: no muta nada; devuelve un resumen financiero agregado.
 */
@ApiExcludeController()
@UseGuards(InternalApiKeyGuard)
@Controller('internal/assistant')
export class FinancialContextController {
  constructor(private readonly service: FinancialContextService) {}

  @Post('financial-context')
  @HttpCode(HttpStatus.OK)
  buildFinancialContext(
    @Body() dto: FinancialContextRequestDto,
  ): Promise<FinancialContextResponseDto> {
    return this.service.buildFinancialContext(dto);
  }
}
