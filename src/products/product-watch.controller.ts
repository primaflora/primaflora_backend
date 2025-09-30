import { 
    Controller, 
    Post, 
    Delete, 
    Get, 
    Body, 
    Param, 
    UseGuards, 
    Req,
    Query
} from '@nestjs/common';
import { ProductWatchService } from './product-watch.service';
import { CreateProductWatchDto, ProductWatchResponseDto } from '../dto/product-watch.dto';
import { AuthGuard } from '../common/guards/auth.guard';

@Controller('product-watch')
@UseGuards(AuthGuard)
export class ProductWatchController {
    constructor(private readonly productWatchService: ProductWatchService) {}

    @Post()
    async addWatch(
        @Body() dto: CreateProductWatchDto,
        @Req() req: any
    ): Promise<ProductWatchResponseDto> {
        const userUuid = req.user.uuid;
        return this.productWatchService.addWatch(userUuid, dto);
    }

    @Delete(':productUuid')
    async removeWatch(
        @Param('productUuid') productUuid: string,
        @Req() req: any
    ): Promise<{ message: string }> {
        const userUuid = req.user.uuid;
        await this.productWatchService.removeWatch(userUuid, productUuid);
        return { message: 'Product watch removed successfully' };
    }

    @Get('my-watches')
    async getUserWatches(@Req() req: any): Promise<ProductWatchResponseDto[]> {
        const userUuid = req.user.uuid;
        return this.productWatchService.getUserWatches(userUuid);
    }

    @Get('is-watching/:productUuid')
    async isWatching(
        @Param('productUuid') productUuid: string,
        @Req() req: any
    ): Promise<{ isWatching: boolean }> {
        const userUuid = req.user.uuid;
        const isWatching = await this.productWatchService.isWatching(userUuid, productUuid);
        return { isWatching };
    }

    @Get('product/:productUuid/watchers')
    async getProductWatchers(
        @Param('productUuid') productUuid: string
    ): Promise<ProductWatchResponseDto[]> {
        return this.productWatchService.getProductWatchers(productUuid);
    }

    @Get('available-products')
    async getAvailableWatchedProducts(
        @Req() req: any,
        @Query('language') language: string = 'ukr'
    ): Promise<any[]> {
        const userUuid = req.user.uuid;
        return this.productWatchService.getAvailableWatchedProducts(userUuid, language);
    }

    @Post('mark-viewed/:productUuid')
    async markAsViewed(
        @Param('productUuid') productUuid: string,
        @Req() req: any
    ): Promise<{ message: string }> {
        const userUuid = req.user.uuid;
        await this.productWatchService.markAsViewed(userUuid, productUuid);
        return { message: 'Product marked as viewed and removed from watch list' };
    }

    @Post('mark-all-viewed')
    async markAllAsViewed(@Req() req: any): Promise<{ message: string }> {
        const userUuid = req.user.uuid;
        await this.productWatchService.markAllAsViewed(userUuid);
        return { message: 'All available products marked as viewed' };
    }
}