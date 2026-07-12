import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestmentPortfolio } from '../entities/investment-portfolio.entity';

const DEFAULT_PORTFOLIO_NAME = 'Mi Portafolio';

@Injectable()
export class InvestmentPortfolioService {
  private readonly logger = new Logger(InvestmentPortfolioService.name);

  constructor(
    @InjectRepository(InvestmentPortfolio)
    private readonly portfolioRepo: Repository<InvestmentPortfolio>,
  ) {}

  /**
   * Obtiene el portafolio predeterminado del usuario, creándolo de forma
   * idempotente si no existe. Ante una carrera de creación simultánea, el
   * índice único parcial (user_id, is_default, deleted_at null) garantiza un
   * solo portafolio; el perdedor de la carrera relee el existente.
   */
  async getOrCreateDefaultPortfolio(userId: string): Promise<InvestmentPortfolio> {
    const existing = await this.portfolioRepo.findOne({
      where: { userId, isDefault: true },
      order: { createdAt: 'ASC' },
    });
    if (existing) return existing;

    try {
      return await this.portfolioRepo.save(
        this.portfolioRepo.create({
          userId,
          name: DEFAULT_PORTFOLIO_NAME,
          baseCurrency: 'USD',
          isDefault: true,
        }),
      );
    } catch (error) {
      // Carrera: otro request creó el portafolio primero (violación del índice único).
      this.logger.warn(`default portfolio race user_id=${userId}; re-reading`);
      const winner = await this.portfolioRepo.findOne({
        where: { userId, isDefault: true },
        order: { createdAt: 'ASC' },
      });
      if (winner) return winner;
      throw error;
    }
  }

  /** Portafolio del usuario por id, con aislamiento estricto por user_id. */
  async getOwnedPortfolioOrFail(userId: string, portfolioId: string): Promise<InvestmentPortfolio> {
    const portfolio = await this.portfolioRepo.findOne({
      where: { id: portfolioId, userId },
    });
    if (!portfolio) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'portfolio_not_found',
        message: 'El portafolio no existe o no pertenece al usuario.',
      });
    }
    return portfolio;
  }
}
