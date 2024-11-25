import { IsString, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name_ukr: string;

  @IsString()
  name_rus: string;
}