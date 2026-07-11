import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, CategoryType } from '../planning/entities/category.entity';
import {
  CLASSIFICATION_TO_TYPE,
  TransactionClassification,
} from '../movements/entities/transaction.enums';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
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

  async create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    this.ensureClassificationMatchesType(dto.type, dto.classification ?? null);

    const name = dto.name.trim();
    await this.ensureNameAvailable(userId, name);

    const category = this.repo.create({
      userId,
      name,
      type: dto.type,
      classification: dto.classification ?? null,
      icon: dto.icon?.trim() || 'Tag',
      color: dto.color ?? '#6366f1',
      isDefault: false,
    });

    return this.repo.save(category);
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findEditable(userId, id);
    const nextType = dto.type ?? category.type;
    const nextClassification =
      dto.classification !== undefined ? dto.classification : category.classification;

    this.ensureClassificationMatchesType(nextType, nextClassification ?? null);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      await this.ensureNameAvailable(userId, name, id);
      category.name = name;
    }
    if (dto.type !== undefined) category.type = dto.type;
    if (dto.classification !== undefined) category.classification = dto.classification;
    if (dto.icon !== undefined) category.icon = dto.icon?.trim() || null;
    if (dto.color !== undefined) category.color = dto.color;

    return this.repo.save(category);
  }

  async remove(userId: string, id: string): Promise<void> {
    const category = await this.findEditable(userId, id);
    await this.repo.delete({ id: category.id, userId });
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

  private async findEditable(userId: string, id: string): Promise<Category> {
    const category = await this.repo.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    if (category.isDefault) {
      throw new BadRequestException('Las categorías predeterminadas no se pueden modificar');
    }
    return category;
  }

  private async ensureNameAvailable(
    userId: string,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    if (name.length < 2) {
      throw new BadRequestException('El nombre de la categoría debe tener al menos 2 caracteres');
    }
    const existing = await this.repo.findOne({ where: { userId, name } });
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException('Ya existe una categoría con ese nombre');
    }
  }

  private ensureClassificationMatchesType(
    type: CategoryType,
    classification: TransactionClassification | null,
  ): void {
    if (!classification) return;
    if (String(CLASSIFICATION_TO_TYPE[classification]) !== String(type)) {
      throw new BadRequestException('La clasificación no corresponde al tipo de categoría');
    }
  }
}
