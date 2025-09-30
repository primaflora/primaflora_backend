import { Column, Entity, OneToMany } from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { SubcategoryEntity } from './subcategory.entity';

@Entity('category')
export class CategoryEntity extends AbstractEntity {
    // @OneToMany(() => CategoryTranslateEntity, categoryT => categoryT.category)
    // public translate: CategoryTranslateEntity[];

    @Column('varchar', { nullable: true })
    name_ukr: string | null;

    @OneToMany(() => SubcategoryEntity, subcategory => subcategory.parent)
    public childrens: SubcategoryEntity[];

    @Column({ type: 'int', default: 0 })
    order: number;
}
