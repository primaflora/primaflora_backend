import { Column, Entity, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { CategoryEntity } from './category.entity';
import { ProductEntity } from './product.entity';
import { SubcategoryTranslateEntity } from './subcategory_t.entity';

@Entity('subcategory')
export class SubcategoryEntity extends AbstractEntity {
    @Column()
    image: string;

    @Column({ nullable: true })
    label?: string;

    @Column({ nullable: true })
    labelColor?: string;

    @OneToMany(
        () => SubcategoryTranslateEntity,
        translate => translate.subcategory,
        {cascade: true, onDelete: 'CASCADE'}
    )
    translate: SubcategoryTranslateEntity[];

    @ManyToOne(() => CategoryEntity, category => category.childrens)
    parent: CategoryEntity;

    @ManyToMany(() => ProductEntity, product => product.categories)
    public products: ProductEntity[];

    @Column({ type: 'int', default: 0 })
    order: number;
}
