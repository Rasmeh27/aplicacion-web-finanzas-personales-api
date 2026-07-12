import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketDataService } from '../../../integrations/market-data/market-data.service';
import { CreatePositionDto } from '../dto/create-position.dto';
import { UpdatePositionDto } from '../dto/update-position.dto';
import { InvestmentPosition } from '../entities/investment-position.entity';
import { InvestmentPortfolioService } from './investment-portfolio.service';

export interface CreatePositionResult {
  position: InvestmentPosition;
  /** p. ej. ['market_validation_skipped'] cuando el proveedor está caído. */
  warnings: string[];
}

@Injectable()
export class InvestmentPositionsService {
  private readonly logger = new Logger(InvestmentPositionsService.name);

  constructor(
    @InjectRepository(InvestmentPosition)
    private readonly positionRepo: Repository<InvestmentPosition>,
    private readonly portfolioService: InvestmentPortfolioService,
    private readonly marketData: MarketDataService,
  ) {}

  /** Posiciones activas del usuario (soft-deleted excluidas por TypeORM). */
  async listPositions(userId: string): Promise<InvestmentPosition[]> {
    return this.positionRepo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async createPosition(
    userId: string,
    dto: CreatePositionDto,
  ): Promise<CreatePositionResult> {
    const symbol = this.normalizeSymbolOr400(dto.symbol);
    this.assertPurchaseDateNotInFuture(dto.purchaseDate);

    const portfolio = await this.portfolioService.getOrCreateDefaultPortfolio(userId);

    const duplicate = await this.positionRepo.findOne({
      where: { userId, portfolioId: portfolio.id, symbol },
    });
    if (duplicate) {
      throw new ConflictException({
        statusCode: 409,
        code: 'duplicate_position',
        message: `Ya existe una posición activa para ${symbol} en el portafolio.`,
      });
    }

    // Validación del símbolo contra el proveedor. Si el proveedor está caído
    // NO se bloquea el CRUD: se guarda con una advertencia controlada.
    const warnings: string[] = [];
    let resolvedName: string | null = null;
    const verification = await this.marketData.verifySymbol(symbol);
    if (verification === 'invalid') {
      throw new BadRequestException({
        statusCode: 400,
        code: 'invalid_market_symbol',
        message: `El símbolo ${symbol} no pudo resolverse en el mercado.`,
      });
    }
    if (verification === 'unverified') {
      warnings.push('market_validation_skipped');
    } else if (!dto.displayName) {
      resolvedName = await this.lookupDisplayName(symbol);
    }

    const position = await this.positionRepo.save(
      this.positionRepo.create({
        userId,
        portfolioId: portfolio.id,
        symbol,
        displayName: dto.displayName ?? resolvedName,
        assetType: dto.assetType,
        quantity: dto.quantity,
        averageCost: dto.averageCost,
        currency: 'USD',
        purchaseDate: dto.purchaseDate ?? null,
        notes: dto.notes ?? null,
      }),
    );

    return { position, warnings };
  }

  async updatePosition(
    userId: string,
    positionId: string,
    dto: UpdatePositionDto,
  ): Promise<InvestmentPosition> {
    const position = await this.getOwnedPositionOrFail(userId, positionId);
    this.assertPurchaseDateNotInFuture(dto.purchaseDate);

    const patch: Partial<InvestmentPosition> = {};
    if (dto.assetType !== undefined) patch.assetType = dto.assetType;
    if (dto.quantity !== undefined) patch.quantity = dto.quantity;
    if (dto.averageCost !== undefined) patch.averageCost = dto.averageCost;
    if (dto.purchaseDate !== undefined) patch.purchaseDate = dto.purchaseDate;
    if (dto.notes !== undefined) patch.notes = dto.notes;
    if (dto.displayName !== undefined) patch.displayName = dto.displayName;

    if (Object.keys(patch).length > 0) {
      await this.positionRepo.update({ id: position.id, userId }, patch);
    }
    return this.getOwnedPositionOrFail(userId, positionId);
  }

  /** Soft delete. 404 si no existe o pertenece a otro usuario. */
  async removePosition(userId: string, positionId: string): Promise<void> {
    await this.getOwnedPositionOrFail(userId, positionId);
    await this.positionRepo.softDelete({ id: positionId, userId });
  }

  private async getOwnedPositionOrFail(
    userId: string,
    positionId: string,
  ): Promise<InvestmentPosition> {
    const position = await this.positionRepo.findOne({
      where: { id: positionId, userId },
    });
    if (!position) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'position_not_found',
        message: 'La posición no existe o no pertenece al usuario.',
      });
    }
    return position;
  }

  /** Normaliza el símbolo mapeando el error tipado a un 400 controlado. */
  private normalizeSymbolOr400(raw: string): string {
    try {
      return this.marketData.normalizeSymbol(raw);
    } catch {
      throw new BadRequestException({
        statusCode: 400,
        code: 'invalid_market_symbol',
        message: 'El símbolo no es válido o no pudo resolverse en el mercado.',
      });
    }
  }

  private assertPurchaseDateNotInFuture(purchaseDate?: string): void {
    if (!purchaseDate) return;
    const today = new Date().toISOString().slice(0, 10);
    if (purchaseDate > today) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'invalid_purchase_date',
        message: 'La fecha de compra no puede estar en el futuro.',
      });
    }
  }

  /** Intenta resolver el nombre del activo; nunca falla la creación por esto. */
  private async lookupDisplayName(symbol: string): Promise<string | null> {
    try {
      const matches = await this.marketData.searchSymbols(symbol);
      const exact = matches.find((match) => match.symbol === symbol);
      return exact?.name ?? null;
    } catch {
      this.logger.warn(`displayName lookup skipped symbol=${symbol}`);
      return null;
    }
  }
}
