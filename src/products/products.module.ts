import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentEntity } from 'src/entity/comment.entity';
import { TokenModule } from 'src/token/token.module';
import { ProductEntity } from '../entity/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { LikeModule } from 'src/like/like.module';
import { CategoriesModule } from 'src/categories/categories.module';
import { ProductTranslateEntity } from 'src/entity/product_t.entity';
import { CartModule } from 'src/cart/cart.module';
import { Xitem } from 'src/entities_from_db/entities/xitem.entity';
import { UploadModule } from 'src/upload/upload.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ProductEntity,
            ProductTranslateEntity,
            CommentEntity,
            Xitem
        ]),
        CategoriesModule,
        TokenModule,
        LikeModule,
        forwardRef(() => CartModule),
        UploadModule,
    ],
    controllers: [ProductsController],
    providers: [
        ProductsService,
        // {
        //     provide: APP_GUARD,
        //     useClass: RolesGuard,
        // }
    ],
    exports: [ProductsService],
})
export class ProductsModule {}
