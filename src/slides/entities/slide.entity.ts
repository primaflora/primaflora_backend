import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Slide {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', {nullable: true})
  title: string;

  @Column()
  imageUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  order: number;

  @Column({ default: '#444444', nullable: true })
  textColor: string;

  @Column({ nullable: true })
  link: string;
}
