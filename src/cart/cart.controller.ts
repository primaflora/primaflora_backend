import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Req,
    UsePipes,
    Patch
} from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from '../token/token.service';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { ValidateLanguagePipe } from 'src/common/pipes/accept-language.pipe';
import { AcceptLanguage } from 'src/common/decorators/accept-language.decorator';
import { UpdateCartDto } from './dto/update-cart.dto';

@Controller('cart')
export class CartController {
    constructor(
        private readonly cartService: CartService,
        private readonly tokenService: TokenService
    ) {}

    @Post()
    create(@Body() newCart: CreateCartDto, @Req() req: Request) {
        const token = req.headers.authorization.replace('Bearer ', '');
        const userUid = this.tokenService.verifyToken(token, 'access').uuid;
        return this.cartService.create(newCart, userUid);
    }

    @Get('/getAll')
    @UsePipes(new ValidateLanguagePipe())
    findAll(@Req() req: Request, @AcceptLanguage() language: string) {
        const token = req.headers.authorization.replace('Bearer ', '');
        const userFromToken = this.tokenService.verifyToken(token, 'access');
        console.log('UserFromToken -> ', userFromToken);
        return this.cartService.findAll(userFromToken.uuid, language);
    }

    @Patch()
    update(
        @Body() updateCartDto: UpdateCartDto,
        @Req() req: Request
    ) {
        const token = req.headers.authorization.replace('Bearer ', '');
        const userUid = this.tokenService.verifyToken(token, 'access').uuid;
        return this.cartService.update(userUid, updateCartDto);
    }

    @Delete('/:uuid')
    remove(@Param('uuid') uuid: string) {
        return this.cartService.remove(uuid);
    }
}
