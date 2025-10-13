import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name_ukr?: string;
  
  @IsOptional()  
  @IsNumber()
  order?: number;
}