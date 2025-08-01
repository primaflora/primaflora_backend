import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { typeOrmAsyncConfig } from './config/typeorm.config';
import { AuthorizationModule } from './authorization/authorization.module';
import { UserModule } from './user/user.module';
import { MailerModule } from './mailer/mailer.module';
import { TokenModule } from './token/token.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { LikeModule } from './like/like.module';
import { AppController } from './app.controller';
import { RolesGuard } from './common/guards/roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { TokenService } from './token/token.service';
import { RoleModule } from './role/role.module';
import { XitemModule } from './xitem/xitem.module';
import { OrderModule } from './order/order.module';
import { SlidesModule } from './slides/slides.module';
import { UploadModule } from './upload/upload.module';

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            validationSchema: Joi.object({
                PORT: Joi.number().default(5000),
                CORS_ORIGIN: Joi.string()
                    .default('http://localhost:3000'),
            }),
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
        AuthorizationModule,
        CategoriesModule,
        ProductsModule,
        MailerModule,
        TokenModule,
        UserModule,
        CartModule,
        LikeModule,
        RoleModule,
        XitemModule,
        OrderModule,
        SlidesModule,
        UploadModule,
    ],
    controllers: [AppController],
})
export class AppModule {}
