import { Column, Entity } from 'typeorm';
import { AbstractEntity } from './abstract.entity';

@Entity('file')
export class FileEntity extends AbstractEntity {
    @Column('varchar')
    original_name: string;

    @Column('varchar')
    filename: string;

    @Column('varchar')
    path: string;

    @Column('varchar')
    url: string;

    @Column('varchar')
    mimetype: string;

    @Column('int')
    size: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    uploaded_at: Date;

    @Column('varchar', { nullable: true })
    description?: string;

    @Column('varchar', { array: true, default: '{}' })
    tags: string[];
}
