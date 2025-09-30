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
import { OrderModule } from 'src/order/order.module';
import { UserEntity } from 'src/entity/user.entity';
import { SubcategoryEntity } from 'src/entity/subcategory.entity';
import { ProductWatchEntity } from 'src/entity/product-watch.entity';
import { ProductWatchController } from './product-watch.controller';
import { ProductWatchService } from './product-watch.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ProductEntity,
            ProductTranslateEntity,
            CommentEntity,
            UserEntity,
            SubcategoryEntity,
            ProductWatchEntity,
            Xitem
        ]),
        CategoriesModule,
        TokenModule,
        LikeModule,
        forwardRef(() => CartModule),
        forwardRef(() => OrderModule),
        UploadModule,
    ],
    controllers: [ProductsController, ProductWatchController],
    providers: [
        ProductsService,
        ProductWatchService,
        // {
        //     provide: APP_GUARD,
        //     useClass: RolesGuard,
        // }
    ],
    exports: [ProductsService, ProductWatchService],
})
export class ProductsModule {}
