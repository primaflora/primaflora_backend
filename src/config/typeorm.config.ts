import {
    TypeOrmModuleAsyncOptions,
    TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (
        configService: ConfigService
    ): Promise<TypeOrmModuleOptions> => {
        return {
            type: 'postgres',
            // host: configService.get<string>('DB_HOST', 'localhost'),
            // port: configService.get<number>('DB_PORT', 5432),
            // username: configService.get<string>('DB_USERNAME', 'postgres'),
            // password: configService.get<string>('DB_PASSWORD', 'Tos_11235'),
            // database: configService.get<string>('DB_DATABASE_NAME', 'primaflora_test'),
            url: configService.get<string>('DATABASE_URL'),
            ssl: {
                rejectUnauthorized: false,
            },
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: true,
            // logging: true,
        };
    },
};
