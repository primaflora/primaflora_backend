import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('files')
export class FileEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    original_name: string;

    @Column()
    filename: string;

    @Column()
    path: string;

    @Column()
    url: string;

    @Column()
    mimetype: string;

    @Column()
    size: number;

    @CreateDateColumn()
    uploaded_at: Date;

    @Column({ nullable: true })
    description?: string;

    @Column('simple-array', { nullable: true })
    tags?: string[];
}
