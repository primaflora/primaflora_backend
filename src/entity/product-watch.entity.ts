import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { UserEntity } from './user.entity';
import { ProductEntity } from './product.entity';

@Entity('product_watch')
export class ProductWatchEntity extends AbstractEntity {
    @ManyToOne(() => UserEntity, user => user.watchedProducts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    public user: UserEntity;

    @ManyToOne(() => ProductEntity, product => product.watchers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    public product: ProductEntity;

    @Column({ type: 'boolean', default: true })
    public isActive: boolean;

    @Column({ type: 'timestamp', nullable: true })
    public notifiedAt: Date;

    // Вспомогательное свойство для проверки, был ли уведомлен пользователь
    get isNotified(): boolean {
        return this.notifiedAt !== null;
    }
}