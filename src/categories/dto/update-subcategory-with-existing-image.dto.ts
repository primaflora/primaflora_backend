import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

class SubcategoryTranslate {
    language: 'ukr' | 'rus';
    name: string;
    desc: string;
}

export class UpdateSubcategoryWithExistingImageDto {
    @IsOptional()
    @IsString()
    public existing_file_id?: string; // ID файла из архива

    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return {};
            }
        }
        return value || {};
    })
    public translate?: SubcategoryTranslate;

    @IsOptional()
    @IsString()
    public parentId?: string;
}