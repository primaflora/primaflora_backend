import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { VerificationEntity } from 'src/entity/verification.entity';
import { Repository } from 'typeorm';
import { UserEntity } from '../entity/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { TokenService } from 'src/token/token.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { RoleEntity } from 'src/entity/role.entity';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        @InjectRepository(VerificationEntity)
        private verificationRepository: Repository<VerificationEntity>,
        private tokenService: TokenService
    ) {}

    public async create(newUser: CreateUserDto, role: RoleEntity) {
        return await this.userRepository.save({
            login: newUser.login,
            name: newUser.name,
            phone: newUser.phone,
            consultation_allowed: newUser.consultation_allowed,
            email: newUser.email,
            phone_allowed: newUser.phone_allowed,
            is_activated: false,
            password: await hash(newUser.password, 10),
            cart: [],
            invitationCode: newUser.invitationCode,
            role,
        });
    }

    public async save(user: UserEntity) {
        return await this.userRepository.save(user);
    }


    public async delete(uuid: string, password: string){
        let user = await this.findOneById(uuid);
        console.log(password, user.password)
        if(!(await compare(password, user.password)))
        {
            throw new BadRequestException(
                `passwords are not same`
            );     
        }
        return await this.deleteByUUID(uuid)
    }

    public async findOneByToken(token: string, loadInvitedUser?: boolean) {
        const payload = this.tokenService.verifyToken(token, 'access');

        if (!loadInvitedUser) return await this.findOneById(payload.uuid, true);

        return await this.findOneByIdAndLoadInvitedUser(payload.uuid);
    }

    public async findOneById(uuid: string, getRole: boolean = false) {
        if (getRole)    
            return await this.userRepository.findOneOrFail({ where: { uuid }, relations: [ 'role' ] });
        else
            return await this.userRepository.findOneOrFail({ where: { uuid } });
    }

    public async findOneByIdAndLoadInvitedUser(uuid: string) {
        console.log('uuid: ', uuid);
        return await this.userRepository.findOneOrFail({
            where: { uuid },
            relations: ['invitedUser', 'role'],
        });
    }

    public async findOneByIdWithLikes(uuid: string) {
        return await this.userRepository.findOneOrFail({
            where: { uuid },
            relations: { likes: true },
        });
    }

    public async findOneByLogin(login: string) {
        try {
            return await this.userRepository.findOneOrFail({
                where: { login },
                relations: [ 'role' ]
            });
        } catch (error) {
            console.log(error);
            throw new BadRequestException('User not found');
        }
    }

    public async findOneByEmail(email: string){
        return await this.userRepository.findOne({
            where: { email },
        });
    }

    public async findOneByInviteCode(invitationCode: string) {
        try {
            return await this.userRepository.findOneOrFail({
                where: { invitationCode },
            });
        } catch (error) {
            console.log(error);
            throw new BadRequestException(
                `User not found by invitation code: ${invitationCode}`
            );
        }
    }
    
    public async deleteByUUID(uuid: string){
        try{
            return await this.userRepository.delete({
                "uuid": uuid
            });
        } catch (error){
            console.log(error)
            throw new BadRequestException(
                `User`
            );
        }
    }

    public async updateUser(token: string, updateUser: UpdateUserDto) {
        const payload = this.tokenService.verifyToken(token, 'access');
        return this.userRepository.update({ uuid: payload.uuid }, updateUser);
    }

    private generateSixDigitCode() {
        let code = Math.floor(Math.random() * (999999 - 1) + 1).toString();
        return `${"0".repeat(6 - code.length)}${code}`;
    }

    public async createVerificationCode(user: UserEntity) {
        return await this.verificationRepository.save({
            user,
            exp: new Date(Date.now() + 1000 * 60 * 10), // 10 minutes
            code: this.generateSixDigitCode(),
        });
    }

    public async activate(code: string) {
        try {
            const verify = await this.verificationRepository.findOneOrFail({
                where: { code },
                relations: { user: true },
            });

            console.log('verify: ', verify);

            if (new Date() > new Date(verify.exp)) {
                this.verificationRepository.delete(verify);
                throw new BadRequestException('Code expired');
            }

            return await this.userRepository.save({
                ...verify.user,
                is_activated: true,
            });
        } catch (error) {
            throw new BadRequestException('Invalid code');
        }
    }

    // test
    public async getAllUsers() {
        return await this.userRepository.find();
    }
}
