import { AbstractEntity } from './abstract.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProductEntity } from './product.entity';
import { OrderItemEntity } from './orderItem.entity';

export enum OrderStatus {
    PENDING = 'pending',       // Ожидает оплаты
    PAID = 'paid',             // Оплачен
    SHIPPED = 'shipped',       // Отправлен
    COMPLETED = 'completed',   // Завершён
    CANCELED = 'canceled',     // Отменён
  }
  

@Entity('order')
export class OrderEntity extends AbstractEntity {
    @ManyToOne(() => UserEntity, user => user.orders, { eager: true })
    @JoinColumn({ name: 'user_id' })
    public user: UserEntity;
    
    @OneToMany(() => OrderItemEntity, (orderItem) => orderItem.order, { cascade: true })
    public items: OrderItemEntity[];
    
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    public totalPrice: number;
    
    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
    public status: OrderStatus;
}