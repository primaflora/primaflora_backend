import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
    UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import { AcceptLanguage } from 'src/common/decorators/accept-language.decorator';
import { ValidateLanguagePipe } from 'src/common/pipes/accept-language.pipe';
import { CategoriesService } from './categories.service';
import { SubcategoryDto } from './dto/subcategory.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get()
    public async findAllCategories() {
        return await this.categoriesService.findAllCategories();
    }

    @Get('findAllWithSub')
    @UsePipes(new ValidateLanguagePipe())
    public async findAllWithSub(
        @Req() req: Request,
        @AcceptLanguage() language: string
    ) {
        return await this.categoriesService.findAllWithSub(language);
    }

    // return subcategories with products. Products have minimal fields to be shown (not description and comments)
    @Get('/findSubcategoryWithProducts/:subcategoryId')
    @UsePipes(new ValidateLanguagePipe())
    public async findSubcategoryWithProducts(
        @Param('subcategoryId') subcategoryId: number,
        @Req() req: Request,
        @AcceptLanguage() language: string
    ) {
        let token = null;
        if (req.headers.authorization) {
            token = req.headers.authorization.split(' ')[1].trim();
        }

        return await this.categoriesService.findSubcategoryWithProducts(
            subcategoryId,
            language,
            token
        );
    }

    @Put('/subcategory/:uuid/move')
    async moveSubcategory(
        @Param('uuid') subcategoryId: string,
        @Body() body: { newCategoryId: string },
    ) {
        return this.categoriesService.moveToAnotherCategory(subcategoryId, body.newCategoryId);
    }
    @Put('/reorder')
    async reorderCategories(@Body() body: { orderedIds: { id: string, order: number }[] }) {
        console.log(body)
        await this.categoriesService.updateOrder(body.orderedIds);
        return { success: true };
    }
    @Put('/subcategory/reorder')
    async reorderSubcategories(@Body() body: { orderedIds: { id: string; order: number }[] }) {
    await this.categoriesService.reorderSubcategories(body.orderedIds);
      return { success: true };
    }
    
    @Put(':id')
    public async updateCategory(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ) {
        console.log("inside")
        return await this.categoriesService.updateCategory(id, updateCategoryDto);
    }

    @Post()
    async createCategory(@Body() categoryData: CreateCategoryDto) {
      return await this.categoriesService.createCategory(categoryData);
    }

    @Post('/subcategory/create')
    public async createSubategory(@Body() subcategoryDto: SubcategoryDto) {
        return await this.categoriesService.createSubcategory(subcategoryDto);
    }

    @Delete(':id')
    public async deleteCategory(@Param('id') id: string) {
        return await this.categoriesService.deleteCategory(id);
    }

    @Put('/subcategory/:id')
    public async updateSubcategory(
        @Param('id') id: string,
        @Body() updateSubcategoryDto: UpdateSubcategoryDto,
    ) {
        return await this.categoriesService.updateSubcategory(id, updateSubcategoryDto);
    }

    // Удаление подкатегории
    @Delete('/subcategory/:id')
    public async deleteSubcategory(@Param('id') id: string) {
        return await this.categoriesService.deleteSubcategory(id);
    }

    @Get('/subcategories')
    public async getAllSubcategories() {
        return await this.categoriesService.getAllSubcategories();
    }
    @Get('/subcategory/:uuid')
    public async getSubcategory(@Param('uuid') uuid: string) {
        console.log("id", uuid);
        return await this.categoriesService.getSubcategory(uuid);
    }
}
