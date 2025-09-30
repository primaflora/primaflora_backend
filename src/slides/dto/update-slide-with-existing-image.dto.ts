import { IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';

export class UpdateSlideWithExistingImageDto {
    @IsOptional()
    @IsUUID()
    public existing_file_id?: string; // ID файла из архива

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
    @IsBoolean()
    public isActive?: boolean;
}