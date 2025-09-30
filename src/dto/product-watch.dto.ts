import { IsUUID } from 'class-validator';

export class CreateProductWatchDto {
    @IsUUID()
    productUuid: string;
}

export class RemoveProductWatchDto {
    @IsUUID()
    productUuid: string;
}

export class ProductWatchResponseDto {
    uuid: string;
    userUuid: string;
    productUuid: string;
    createdAt: Date;
    isNotified: boolean;
    notifiedAt: Date | null;
}