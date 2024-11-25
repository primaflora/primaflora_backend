import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from 'src/entity/role.entity';
import { EUserRole } from 'src/enum/role.enum';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(RoleEntity)
        private roleRepository: Repository<RoleEntity>,
    ) {}

    public async findAll() {
        return await this.roleRepository.find();
    }
    public async findOne(roleName: EUserRole) {
        return await this.roleRepository.findOneByOrFail({ name: roleName });
    }
    public async create(createRoleDto: CreateRoleDto) {
        const role = await this.roleRepository.create({
            name: EUserRole.ADMIN
        });
        return this.roleRepository.save(role);
    }
    public async remove(id: number) {
        await this.roleRepository.delete(id);
    }
}
