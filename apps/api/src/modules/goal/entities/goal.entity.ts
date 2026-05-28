import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum GoalStatus { ACTIVE = 'active', COMPLETED = 'completed', PAUSED = 'paused', CANCELLED = 'cancelled' }

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  targetAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentAmount: number;

  @Column({ nullable: true })
  deadline: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyContribution: number;

  @Column({ type: 'enum', enum: GoalStatus, default: GoalStatus.ACTIVE })
  status: GoalStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
