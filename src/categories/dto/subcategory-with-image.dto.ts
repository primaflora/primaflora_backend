import { IsString } from 'class-validator';
import { Transform } from 'class-transformer';

class SubcategoryTranslate {
    language: 'ukr' | 'rus';
    name: string;
    desc: string;
}

export class SubcategoryWithImageDto {
    @IsString()
    public parent: string;

    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return [];
            }
        }
        return Array.isArray(value) ? value : [];
    })
    public translate: SubcategoryTranslate[];
}
