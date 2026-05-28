import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum CategoryType { INCOME = 'income', EXPENSE = 'expense', BOTH = 'both' }

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: CategoryType, default: CategoryType.EXPENSE })
  type: CategoryType;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  color: string;

  @Column({ default: false })
  isSystem: boolean;  // predefined vs user-created

  @Column({ nullable: true })
  userId: string;     // null = system-wide predefined

  @ManyToOne(() => User, { nullable: true })
  user: User;
}
