import { IsBoolean, IsOptional, IsString, IsNumber, IsPositive, Min, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProductTranslateDto } from './create-product.dto';

export class CreateProductWithExistingImageDto {
    @IsOptional()
    @IsString()
    public existing_file_id?: string; // ID файла из архива

    @IsOptional()
    @IsString()
    public photo_url?: string; // Будет заполнено автоматически при выборе файла

    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : 0)
    @IsNumber()
    @IsPositive()
    public price_currency?: number;

    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : 0)
    @IsNumber()
    @Min(0)
    public price_points?: number;

    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : 0)
    @IsNumber()
    @Min(0)
    public percent_discount?: number;

    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : 1)
    @IsNumber()
    @IsPositive()
    public rating?: number;

    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed.map(id => parseInt(id.toString())) : [];
            } catch {
                return [];
            }
        }
        if (Array.isArray(value)) {
            return value.map(id => parseInt(id.toString()));
        }
        return [];
    })
    public categoryIds: number[];

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
    public translate: ProductTranslateDto[];

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
    public descriptionPoints: string[];

    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    readonly isPublished?: boolean;
}
