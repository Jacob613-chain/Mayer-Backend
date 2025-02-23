import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dealers')
export class Dealer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: false })
  dealer_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  logo: string;

  @Column('text', { array: true })
  reps: string[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
