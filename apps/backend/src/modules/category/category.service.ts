import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, CategoryType } from '../planning/entities/category.entity';
import { TransactionClassification } from '../movements/entities/transaction.enums';
import { DEFAULT_CATEGORIES } from './default-categories';

export interface ListCategoriesFilters {
  type?: CategoryType;
  classification?: TransactionClassification;
}

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  /**
   * Lista las categorías del usuario. Si todavía no tiene categorías por
   * defecto, las crea de forma idempotente antes de devolver el listado.
   */
  async findAll(userId: string, filters: ListCategoriesFilters = {}): Promise<Category[]> {
    await this.ensureDefaultCategories(userId);

    const where: Record<string, unknown> = { userId };
    if (filters.type) where.type = filters.type;
    if (filters.classification) where.classification = filters.classification;

    return this.repo.find({
      where,
      order: { type: 'ASC', isDefault: 'DESC', name: 'ASC' },
    });
  }

  /**
   * Crea las categorías por defecto de finanzas personales para el usuario si
   * aún no tiene ninguna marcada como default. Idempotente.
   */
  async ensureDefaultCategories(userId: string): Promise<void> {
    const existingDefaults = await this.repo.count({
      where: { userId, isDefault: true },
    });
    if (existingDefaults > 0) return;

    const categories = DEFAULT_CATEGORIES.map((seed) =>
      this.repo.create({
        userId,
        name: seed.name,
        type: seed.type,
        classification: seed.classification,
        icon: seed.icon,
        color: seed.color,
        isDefault: true,
      }),
    );

    await this.repo.save(categories);
  }
}
