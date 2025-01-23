import { Controller, Delete, Get, Param, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { LikeService } from './like.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Request } from 'express';
import { TokenService } from '../token/token.service';
import { ValidateLanguagePipe } from 'src/common/pipes/accept-language.pipe';
import { AcceptLanguage } from 'src/common/decorators/accept-language.decorator';

@Controller('like')
@UseGuards(AuthGuard)
export class LikeController {
    constructor(
        private readonly likeService: LikeService,
        private readonly tokenService: TokenService
    ) {}

    @Get('/likes')
    @UsePipes(new ValidateLanguagePipe())
    public async getLikedProducts(@Req() req: Request, @AcceptLanguage() language: string) {
        const payload = this.getTokenPayloadFromRequest(req);
        return await this.likeService.getLikedProducts(payload.uuid, language);
    }

    // now like product in /product route
    // @Get('/:productUuid')
    // public async likeProduct(
    //     @Param('productUuid') productId: string,
    //     @Req() req: Request
    // ) {
    //     const payload = this.getTokenPayloadFromRequest(req);
    //     console.log('payload: ', payload);
    //     return await this.likeService.setLike(payload.uuid, productId);
    // }
    @Post(':productId')
    async likeProduct(@Param('productId') productId: string, @Req() req: any) {
        const payload = this.getTokenPayloadFromRequest(req);
        return await this.likeService.likeProduct(payload.uuid, productId);
    }
    // @Delete('/:likeUuid')
    // public async removeLike(
    //     @Param('likeUuid') likeUuid: string,
    //     @Req() req: Request
    // ) {
    //     const payload = this.getTokenPayloadFromRequest(req);
    //     return await this.likeService.removeLike(payload.uuid, likeUuid);
    // }

    @Delete(':productId')
    async unlikeProduct(@Param('productId') productId: string, @Req() req: any) {
        const payload = this.getTokenPayloadFromRequest(req);
        return await this.likeService.unlikeProduct(payload.uuid, productId);
    }
    
    private getTokenPayloadFromRequest(req: Request): any | null {
        const token = req.headers.authorization.replace('Bearer ', '');
        if (!token) {
            return null;
        }

        return this.tokenService.verifyToken(token, 'access');
    }
}
