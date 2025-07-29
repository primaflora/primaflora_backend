import { IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class SubcategoryWithImageDto {
    @IsString()
    image?: string; // Будет заполнено автоматически при загрузке

    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return JSON.parse(value);
        }
        return value;
    })
    translate: SubcategoryTranslate[];

    @IsString()
    parent_uid: string;
}

class SubcategoryTranslate {
    @IsString()
    language: 'ukr' | 'rus';

    @IsString()
    name: string;

    @IsString()
    desc: string;
}
