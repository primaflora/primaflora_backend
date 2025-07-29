import { IsBoolean, IsOptional, IsString, IsNumber, IsPositive, Min, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProductTranslateDto } from './create-product.dto';

export class CreateProductWithImageDto {
    @IsOptional()
    @IsString()
    public photo_url?: string; // Будет заполнено автоматически при загрузке

    @Type(() => Number)
    @IsNumber()
    @IsPositive()
    public price_currency: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    public price_points: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    public percent_discount: number;

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
    @IsArray()
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
    @IsArray()
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
    @IsOptional()
    @IsArray()
    descriptionPoints?: string[];

    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value === 'true';
        }
        return Boolean(value);
    })
    @IsOptional()
    @IsBoolean()
    readonly isPublished?: boolean;
}
