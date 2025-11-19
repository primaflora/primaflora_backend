import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        cors: {
            credentials: true,
            origin: ['http://localhost:3000', 'https://primaflora.store', 'https://store.primaflora.com.ua', 'https://primaflora-web-2759862b88c2.herokuapp.com'] //process.env.CORS_ORIGIN,
        },
    });
    const config = app.get<ConfigService>(ConfigService);

    app.setGlobalPrefix('api');

    // Настройка статического хостинга для загруженных файлов
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
    });

    app.use(cookieParser(config.get<string>('COOKIE_SECRET')));
    app.useGlobalPipes(new ValidationPipe());

    const server = await app.listen(config.get<number>('PORT'), () =>
        console.log('Host on http://localhost:5000')
    );
}
bootstrap();
