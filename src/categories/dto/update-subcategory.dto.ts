import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TranslateDto {
    @IsString()
    @IsNotEmpty()
    language: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    desc: string;
}

export class UpdateSubcategoryDto {
    @IsOptional()
    @IsString()
    image?: string;

    @ValidateNested({ each: true })
    @Type(() => TranslateDto)
    @IsNotEmpty()
    translate: TranslateDto;
}