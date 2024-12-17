import { IsBoolean, IsNumber, IsPositive, IsString, IsUrl, Min } from 'class-validator';

export class CreateProductDto {
    @IsString()
    @IsUrl()
    public photo_url: string;

    @IsNumber()
    @IsPositive()
    public price_currency: number;

    @IsNumber()
    @Min(0)
    public price_points: number;

    @IsNumber()
    @Min(0)
    public percent_discount: number;

    @IsNumber()
    @IsPositive()
    public rating: number;

    public categoryIds: number[];

    public translate: ProductTranslateDto[];

    @IsBoolean()
    readonly isPublished?: boolean; // Новый флаг
}

export class ProductTranslateDto {
    @IsString()
    public title: string;

    @IsString()
    public desc: string;

    @IsString()
    public shortDesc: string;

    @IsString()
    public language: string;
}
