import { IsOptional, IsString, IsUUID, IsArray, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SubcategoryWithExistingImageDto {
    @IsOptional()
    @IsUUID()
    public existing_file_id?: string; // ID файла из архива

    @IsOptional()
    @IsString()
    public image?: string; // Будет заполнено автоматически при выборе файла

    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return [];
            }
        }
        return value;
    })
    @IsArray()
    public translate: any[];

    @IsString()
    public parent: string; // UUID категории

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    public order?: number;
}
