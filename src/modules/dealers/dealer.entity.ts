import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Survey } from '../surveys/survey.entity';

@Entity('dealers')
export class Dealer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  dealer_id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  logo: string;

  @Column('text', { array: true, default: [''] })
  reps: string[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => Survey, survey => survey.dealer, { eager: false })
  surveys: Survey[];
}
