import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../src/entity/user.entity';
import { RoleEntity } from '../src/entity/role.entity';
import { EUserRole } from '../src/enum/role.enum';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения из .env файла
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('✗ Ошибка: DATABASE_URL не найден в переменных окружения');
    console.error('  Создайте файл .env с переменной DATABASE_URL');
    process.exit(1);
}

const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: {
        rejectUnauthorized: false,
    },
    entities: [
        __dirname + '/../src/entity/*.entity{.ts,.js}',
        __dirname + '/../src/**/entities/*.entity{.ts,.js}',
    ],
    synchronize: false,
    logging: true,
});

async function createAdmin() {
    try {
        await dataSource.initialize();
        console.log('✓ Подключение к базе данных установлено');

        const userRepository = dataSource.getRepository(UserEntity);
        const roleRepository = dataSource.getRepository(RoleEntity);

        // Проверяем существование роли админа
        let adminRole = await roleRepository.findOne({ 
            where: { name: EUserRole.ADMIN } 
        });

        if (!adminRole) {
            console.log('→ Создаем роль администратора...');
            adminRole = roleRepository.create({ name: EUserRole.ADMIN });
            await roleRepository.save(adminRole);
            console.log('✓ Роль администратора создана');
        } else {
            console.log('✓ Роль администратора уже существует');
        }

        // Данные админа из переменных окружения или значения по умолчанию
        const adminData = {
            name: process.env.ADMIN_NAME || 'Admin',
            login: process.env.ADMIN_LOGIN || 'admin',
            email: process.env.ADMIN_EMAIL || 'admin@primaflora.com',
            phone: process.env.ADMIN_PHONE || '+380000000000',
            password: process.env.ADMIN_PASSWORD || 'Admin123!',
        };

        // Проверяем существование админа
        const existingAdmin = await userRepository.findOne({
            where: [
                { login: adminData.login },
                { email: adminData.email },
                { phone: adminData.phone }
            ]
        });

        if (existingAdmin) {
            console.log('⚠ Администратор уже существует');
            console.log(`   Login: ${existingAdmin.login}`);
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Phone: ${existingAdmin.phone}`);
            return;
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        // Генерируем код приглашения
        const invitationCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        // Создаем администратора
        console.log('→ Создаем учетную запись администратора...');
        const admin = userRepository.create({
            name: adminData.name,
            login: adminData.login,
            email: adminData.email,
            phone: adminData.phone,
            password: hashedPassword,
            invitationCode: invitationCode,
            is_activated: true,
            phone_allowed: false,
            consultation_allowed: false,
            role: adminRole,
        });

        await userRepository.save(admin);

        console.log('\n✓ Администратор успешно создан!');
        console.log('════════════════════════════════════');
        console.log(`  Имя:   ${adminData.name}`);
        console.log(`  Login: ${adminData.login}`);
        console.log(`  Email: ${adminData.email}`);
        console.log(`  Phone: ${adminData.phone}`);
        console.log(`  Password: ${adminData.password}`);
        console.log('════════════════════════════════════');
        console.log('\n⚠ Сохраните эти данные в безопасном месте!');

    } catch (error) {
        console.error('✗ Ошибка при создании администратора:', error);
        throw error;
    } finally {
        await dataSource.destroy();
        console.log('\n✓ Соединение с базой данных закрыто');
    }
}

createAdmin()
    .then(() => {
        console.log('\n✓ Скрипт завершен успешно');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n✗ Скрипт завершен с ошибкой:', error);
        process.exit(1);
    });
