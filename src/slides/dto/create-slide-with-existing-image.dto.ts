import { IsOptional, IsString, IsUUID, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSlideWithExistingImageDto {
    @IsOptional()
    @IsUUID()
    public existing_file_id?: string; // ID файла из архива

    @IsOptional()
    @IsString()
    public image?: string; // Будет заполнено автоматически при выборе файла

    @IsOptional()
    @IsString()
    public title?: string;

    @IsOptional()
    @IsString()
    public description?: string;

    @IsOptional()
    @IsString()
    public link?: string;

    @IsOptional()
    @IsString()
    public textColor?: string;

    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : 0)
    @IsNumber()
    @Min(0)
    public order?: number;
}