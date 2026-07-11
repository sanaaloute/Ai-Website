import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { AdminAgentService, GenerationsQuery } from './admin-agent.service';
import { AdminAuthGuard } from './admin.guard';
import { CurrentAdmin } from './current-admin.decorator';
import { AdminUser } from './admin.types';
import { CookieService } from '@/lib/cookie.service';
import {
  AdminRegisterDto,
  AdminLoginDto,
  AdminForgotPasswordDto,
  AdminResetPasswordDto,
  UpdateUserStatusDto,
  CancelSubscriptionDto,
  UserListQueryDto,
  SubscriptionListQueryDto,
  ActivityQueryDto,
} from './dto';

@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminAgentService: AdminAgentService,
    private readonly cookies: CookieService,
  ) {}

  @Post('auth/register')
  async register(
    @Body() dto: AdminRegisterDto,
    @Headers('x-admin-registration-secret') registrationSecret?: string,
  ) {
    return this.adminService.register(dto, registrationSecret);
  }

  @Post('auth/login')
  async login(
    @Body() dto: AdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminService.login(dto);
    this.cookies.setAdminToken(res, result.access_token, result.expires_in, req);
    return { success: result.success, admin: result.admin };
  }

  @Post('auth/logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.cookies.clearAdminCookie(res, req);
    return { success: true };
  }

  @Post('auth/forgot-password')
  async forgotPassword(@Body() dto: AdminForgotPasswordDto) {
    return this.adminService.forgotPassword(dto);
  }

  @Post('auth/reset-password')
  async resetPassword(@Body() dto: AdminResetPasswordDto) {
    return this.adminService.resetPassword(dto);
  }

  @Get('auth/me')
  @UseGuards(AdminAuthGuard)
  getMe(@CurrentAdmin() admin: AdminUser) {
    return this.adminService.getMe(admin);
  }

  @Get('stats')
  @UseGuards(AdminAuthGuard)
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @UseGuards(AdminAuthGuard)
  getUsers(@Query() query: UserListQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @UseGuards(AdminAuthGuard)
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/status')
  @UseGuards(AdminAuthGuard)
  updateUserStatus(
    @CurrentAdmin() admin: AdminUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(admin, id, dto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminAuthGuard)
  async deleteUser(@CurrentAdmin() admin: AdminUser, @Param('id') id: string) {
    await this.adminService.deleteUser(admin, id);
  }

  @Get('subscriptions')
  @UseGuards(AdminAuthGuard)
  getSubscriptions(@Query() query: SubscriptionListQueryDto) {
    return this.adminService.getSubscriptions(query);
  }

  @Patch('subscriptions/:id/cancel')
  @UseGuards(AdminAuthGuard)
  cancelSubscription(
    @CurrentAdmin() admin: AdminUser,
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.adminService.cancelSubscription(admin, id, dto);
  }

  @Get('behavior')
  @UseGuards(AdminAuthGuard)
  getBehavior() {
    return this.adminService.getBehavior();
  }

  @Get('activity')
  @UseGuards(AdminAuthGuard)
  getActivity(@Query() query: ActivityQueryDto) {
    return this.adminService.getActivityLogs(query);
  }

  @Get('generations')
  @UseGuards(AdminAuthGuard)
  getGenerations(@Query() query: GenerationsQuery) {
    return this.adminAgentService.getGenerations(query);
  }

  @Get('generations/metrics')
  @UseGuards(AdminAuthGuard)
  getGenerationMetrics() {
    return this.adminAgentService.getGenerationMetrics();
  }

  @Get('queue')
  @UseGuards(AdminAuthGuard)
  getQueueMetrics() {
    return this.adminAgentService.getQueueMetrics();
  }

  @Get('sandboxes')
  @UseGuards(AdminAuthGuard)
  getSandboxInventory() {
    return this.adminAgentService.getSandboxInventory();
  }
}
