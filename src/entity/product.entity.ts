import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { SubcategoryEntity } from './subcategory.entity';
import { CommentEntity } from './comment.entity';
import { ProductTranslateEntity } from './product_t.entity';
import { CartEntity } from './cart.entity';

@Entity('product')
export class ProductEntity extends AbstractEntity {
    @Column('varchar')
    public photo_url: string;

    @OneToMany(() => ProductTranslateEntity, translate => translate.product, { onDelete: 'CASCADE' })
    public translate: ProductTranslateEntity[];

    @Column('int')
    public price_currency: number;

    @Column('int', { nullable: true })
    public price_points: number;

    @Column('int', { nullable: true })
    public percent_discount: number;

    @Column('int')
    public rating: number;

    @ManyToMany(() => SubcategoryEntity, subcategory => subcategory.products, { cascade: true, onDelete: 'CASCADE' })
    @JoinTable() // Эта аннотация создаст промежуточную таблицу
    public categories: SubcategoryEntity[];

    @Column({ type: 'text', array: true, nullable: true })
    descriptionPoints: string[];

    @OneToMany(() => CommentEntity, comment => comment.product, { onDelete: 'CASCADE' })
    public comments: CommentEntity[];

    @OneToMany(() => CartEntity, cart => cart.product, { onDelete: 'CASCADE' })
    public carts: CartEntity[];

    @Column({ type: 'boolean', default: false })
    public isPublished: boolean;
}
