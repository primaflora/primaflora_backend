import { IsString } from 'class-validator';
import { AbstractDto } from '../../dto/abstract.dto';

export class SubcategoryDto extends AbstractDto {
    @IsString()
    image: string;

    translate: SubcategoryTranslate[];

    @IsString()
    parent_uid: string;

    label?: string;
    
    labelColor?: string;
}

class SubcategoryTranslate {
    @IsString()
    language: 'ukr' | 'rus';

    @IsString()
    name: string;

    @IsString()
    desc: string;
}
