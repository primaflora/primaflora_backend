import { IsBoolean, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class CreateProductDto {
    @IsString()
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

    descriptionPoints: string[];

    @IsBoolean()
    readonly isPublished?: boolean; // Новый флаг

    @IsBoolean()
    readonly inStock?: boolean; // Флаг наличия товара
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

    public seoTitle?: string;

    public seoDescription?: string;
}
