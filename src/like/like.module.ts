import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LikeEntity } from '../entity/like.entity';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { LikeController } from './like.controller';
import { LikeService } from './like.service';
import { ProductEntity } from '../entity/product.entity';

@Module({
    imports: [TypeOrmModule.forFeature([LikeEntity, ProductEntity]), TokenModule, UserModule],
    controllers: [LikeController],
    providers: [LikeService],
    exports: [LikeService],
})
export class LikeModule {}
