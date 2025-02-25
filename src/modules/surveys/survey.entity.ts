import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Dealer } from '../dealers/dealer.entity';

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  dealer_id: string;

  @Column()
  rep_name: string;

  @Column()
  customer_name: string;

  @Column()
  customer_address: string;

  @Column('jsonb')
  response_data: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Dealer, { eager: false })
  @JoinColumn({ name: 'dealer_id', referencedColumnName: 'dealer_id' })
  dealer: Dealer;
} 
