import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Slide {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  imageUrl: string;

  @Column({ default: true })
  isActive: boolean;
}
