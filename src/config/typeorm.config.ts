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
            url: configService.get<string>('DATABASE_URL'),
            ssl: {
                rejectUnauthorized: false,
            },
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: false,
            logging: true,
        };
    },
};
