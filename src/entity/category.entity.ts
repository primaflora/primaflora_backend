import { Column, Entity, OneToMany } from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { SubcategoryEntity } from './subcategory.entity';

@Entity('category')
export class CategoryEntity extends AbstractEntity {
    // @OneToMany(() => CategoryTranslateEntity, categoryT => categoryT.category)
    // public translate: CategoryTranslateEntity[];

    @Column('varchar')
    name_ukr: string;

    @OneToMany(() => SubcategoryEntity, subcategory => subcategory.parent)
    public childrens: SubcategoryEntity[];

    @Column({ type: 'int', default: 0 })
    order: number;
}
