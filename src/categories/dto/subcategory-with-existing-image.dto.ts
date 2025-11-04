import { IsOptional, IsString, IsNumber, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';

class SubcategoryTranslate {
    language: 'ukr' | 'rus';
    name: string;
    desc: string;
}

export class SubcategoryWithExistingImageDto {
    @IsOptional()
    @IsString()
    public existing_file_id?: string; // ID файла из архива

    @IsOptional()
    @IsString()
    public icon?: string; // Будет заполнено автоматически при выборе файла

    @IsOptional()
    @IsString()
    public parent?: string; // parent_uid для подкатегории

    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : 1)
    @IsNumber()
    @IsPositive()
    public categoryId?: number;

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

    @IsOptional()
    @IsString()
    public label?: string;

    @IsOptional()
    @IsString()
    public labelColor?: string;
}
