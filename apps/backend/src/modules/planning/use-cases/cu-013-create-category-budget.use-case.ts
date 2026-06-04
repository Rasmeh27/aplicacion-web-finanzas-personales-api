import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, CategoryType } from '../entities/category.entity';
import { CreateCategoryBudgetDto } from '../dto/create-category-budget.dto';
import { Budget } from '../entities/budget.entity';

@Injectable()
export class CreateCategoryBudgetUseCase {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async execute(userId: string, dto: CreateCategoryBudgetDto): Promise<Budget> {
    const periodMonth = this.buildPeriodMonth(dto.year, dto.month);
    const currency = (dto.currency ?? 'DOP').toUpperCase();
    const category = await this.findCategory(userId, dto.categoryId);

    const existingBudget = await this.budgetRepo.findOne({
      where: {
        userId,
        categoryId: dto.categoryId,
        periodMonth,
      },
    });

    if (existingBudget) {
      throw new BadRequestException(
        'Ya existe un presupuesto para esa categoria en ese periodo',
      );
    }

    const budget = this.budgetRepo.create({
      userId,
      categoryId: dto.categoryId,
      name: dto.name?.trim() || this.buildDefaultName(category.name, dto.year, dto.month),
      periodMonth,
      limitAmount: dto.limitAmount,
      currency,
    });

    return this.budgetRepo.save(budget);
  }

  private async findCategory(userId: string, categoryId: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({
      where: {
        id: categoryId,
        userId,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria no encontrada');
    }

    if (category.type !== CategoryType.EXPENSE) {
      throw new BadRequestException('Solo se puede presupuestar categorias de gasto');
    }

    return category;
  }

  private buildPeriodMonth(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  private buildDefaultName(categoryName: string, year: number, month: number): string {
    return `Presupuesto ${categoryName} ${String(month).padStart(2, '0')}/${year}`;
  }
}
