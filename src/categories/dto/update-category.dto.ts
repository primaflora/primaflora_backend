import { IsString, IsOptional } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  name_ukr?: string;
  order?: number;
}