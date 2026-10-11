import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { createDatabaseOptions } from './config/database.config';
import { resolveUploadRoot } from './config/upload.config';

/**
 * 解析 JWT 过期时长为「秒数」（符合 JWT exp 声明的 NumericDate 标准）。
 *   - 纯数字 / 纯数字字符串 → 直接当作秒数；
 *   - 带单位：Xd / Xh / Xm / Xs（天/时/分/秒）→ 转成秒；
 *   - 无法识别 / 空 → 用默认值（默认 7 天）。
 */
function parseJwtExpiresIn(raw: string | undefined, defaultSec = 7 * 24 * 3600): number {
  if (!raw) return defaultSec;
  const s = String(raw).trim();
  if (!s) return defaultSec;
  // 纯数字秒数
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  // 带单位
  const m = /^(\d+(?:\.\d+)?)\s*([dhms]?)$/i.exec(s);
  if (!m) return defaultSec;
  const value = parseFloat(m[1]);
  const unit = (m[2] || 's').toLowerCase();
  const mult = unit === 'd' ? 24 * 3600 : unit === 'h' ? 3600 : unit === 'm' ? 60 : 1;
  return Math.max(1, Math.floor(value * mult));
}

/**
 * 组装环境变量文件加载列表。
 * 列表顺序即优先级：越靠后加载的文件，其中同名变量会覆盖前面的值。
 *   1) .env（兜底共享）
 *   2) .env.{NODE_ENV}（如 .env.production）
 *   3) ENV_FILE_PATH 显式指定（最高优先级，宝塔用户可把密码文件放在项目外任意路径）
 */
function buildEnvFilePaths(): string[] {
  const paths: string[] = ['.env'];
  const nodeEnv = process.env.NODE_ENV || 'development';
  paths.push(`.env.${nodeEnv}`);
  const explicit = process.env.ENV_FILE_PATH?.trim();
  if (explicit) {
    paths.push(explicit);
  }
  return paths;
}

// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { ServiceModule } from './modules/service/service.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { MaterialModule } from './modules/material/material.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AddressModule } from './modules/address/address.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { ReviewModule } from './modules/review/review.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UserModule } from './modules/user/user.module';
import { LeaderModule } from './modules/leader/leader.module';
import { SeedModule } from './modules/seed/seed.module';
import { UploadModule } from './modules/upload/upload.module';
import { MenuPermissionModule } from './modules/menu-permission/menu-permission.module';
import { AccountModule } from './modules/account/account.module';
import { UserAdminModule } from './modules/user-admin/user-admin.module';
import { LeaderAdminModule } from './modules/leader-admin/leader-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 环境变量文件加载优先级（后加载的覆盖前加载的）：
      // 1) .env（兜底共享）
      // 2) .env.{NODE_ENV}（如 .env.production）
      // 3) ENV_FILE_PATH 显式指定（最高优先级，宝塔用户可把密码文件放在项目外任意路径）
      envFilePath: buildEnvFilePaths(),
    }),
    // 静态资源服务：挂载 backend/uploads 到 /uploads 路径
    ServeStaticModule.forRoot({
      rootPath: resolveUploadRoot(),
      serveRoot: '/uploads',
      serveStaticOptions: { maxAge: 30 * 24 * 60 * 60 * 1000 },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => createDatabaseOptions(),
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'shijia-secret',
      // 注意：这里必须是 number 秒数（JWT exp 规范），字符串 Xd/Xh 会跟 TypeORM 的类型打架
      signOptions: { expiresIn: parseJwtExpiresIn(process.env.JWT_EXPIRES_IN, 7 * 24 * 3600) },
    }),
    AuthModule,
    UserModule,
    ServiceModule,
    EmployeeModule,
    MaterialModule,
    OrderModule,
    PaymentModule,
    AddressModule,
    CouponModule,
    ReviewModule,
    DashboardModule,
    LeaderModule,
    SeedModule,
    UploadModule,
    MenuPermissionModule,
    AccountModule,
    UserAdminModule,
    LeaderAdminModule,
  ],
})
export class AppModule {}
