import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '../../entities/user.entity';
import { Employee } from '../../entities/employee.entity';
import { Role } from '../../common/constants/roles.constants';
import { MenuPermissionService } from '../menu-permission/menu-permission.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private menuPermissionService: MenuPermissionService,
  ) {}

  /**
   * 用户端微信登录
   * 开发环境用 mock openid，生产环境调用微信 code2session
   * 登录后检测领队身份，返回 leaderEmployee 标识供小程序切换工作台
   */
  async wxLogin(code: string, nickname?: string, avatar?: string) {
    const openid = this.isProduction()
      ? await this.code2session(code)
      : `mock_openid_${code}`;
    let user = await this.userRepo.findOne({ where: { openid } });
    if (!user) {
      user = this.userRepo.create({
        openid,
        nickname: nickname || `微信用户${Math.floor(Math.random() * 10000)}`,
        avatar: avatar || '',
      });
      await this.userRepo.save(user);
    }
    // 更新最近登录时间
    user.last_login_time = new Date();
    await this.userRepo.save(user);
    // 检测是否为有效领队（role=4 status=1 is_leader_active=1）
    let leaderEmployee: { id: number; name: string } | null = null;
    const emp = await this.employeeRepo.findOne({
      where: { openid, role: Role.LEADER, status: 1, is_leader_active: 1 },
    });
    if (emp) leaderEmployee = { id: emp.id, name: emp.name };
    const token = await this.jwtService.signAsync({
      sub: user.id,
      userType: 'user',
      // 领队用户 role 设为 4，使领队接口 @Roles(4) 鉴权通过；普通用户 role 为 0
      role: emp ? emp.role : 0,
      leaderEmployeeId: emp?.id || null,
    });
    return { token, userInfo: user, leaderEmployee };
  }

  /**
   * 生产环境调用微信 code2session 换取真实 openid
   */
  private async code2session(code: string): Promise<string> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.configService.get('WX_APP_ID')}&secret=${this.configService.get('WX_SECRET')}&js_code=${code}&grant_type=authorization_code`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.openid) throw new BadRequestException('微信登录失败');
    return data.openid;
  }

  /**
   * @deprecated 领队登录已统一由 wxLogin 识别领队身份
   * 此方法保留兼容旧版小程序，后续版本将移除
   */
  async leaderWxLogin(code: string) {
    const openid = `mock_openid_${code}`;
    let employee = await this.employeeRepo.findOne({ where: { openid } });
    if (!employee) {
      // 找一个领队角色员工绑定（开发模式）
      employee = await this.employeeRepo.findOne({ where: { role: Role.LEADER } });
      if (employee) {
        employee.openid = openid;
        await this.employeeRepo.save(employee);
      }
    }
    if (!employee) throw new Error('未找到领队账号');
    const token = await this.jwtService.signAsync({
      sub: employee.id,
      userType: 'leader',
      role: employee.role,
    });
    return { token, userInfo: employee };
  }

  /**
   * 管理后台登录
   * 仅允许系统管理员与主管登录，返回 token + userInfo + 可见菜单
   */
  async adminLogin(username: string, password: string) {
    const emp = await this.employeeRepo.findOne({ where: { username } });
    if (!emp) throw new BadRequestException('账号或密码错误');
    if (emp.status !== 1) throw new BadRequestException('账号已被禁用');
    // 仅允许系统管理员与主管登录后台
    if (!([Role.ADMIN, Role.SUPERVISOR] as number[]).includes(emp.role)) {
      throw new BadRequestException('该账号无后台登录权限');
    }
    const ok = emp.password?.startsWith('$2')
      ? await bcrypt.compare(password, emp.password)
      : emp.password === password;
    if (!ok) throw new BadRequestException('账号或密码错误');
    // 更新最近登录时间
    emp.last_login_time = new Date();
    await this.employeeRepo.save(emp);
    // 获取可见菜单供前端动态渲染
    const menus = await this.menuPermissionService.getMenusByRole(emp.role);
    const token = await this.jwtService.signAsync({
      sub: emp.id,
      userType: 'admin',
      role: emp.role,
      name: emp.name,
    });
    return {
      token,
      userInfo: {
        id: emp.id, name: emp.name, role: emp.role, username: emp.username,
      },
      menus,
    };
  }

  /**
   * 开发环境兜底登录：按手机号查找或创建用户，签发 JWT
   * 生产环境由控制器层拦截，不暴露此方法
   */
  async devLogin(phone: string, nickname?: string) {
    if (!/^1\d{10}$/.test(phone)) {
      throw new BadRequestException('手机号格式无效');
    }
    let user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
      user = this.userRepo.create({
        phone,
        nickname: nickname || `微信用户${Math.floor(Math.random() * 10000)}`,
        avatar: '',
      });
      await this.userRepo.save(user);
    }
    const token = await this.jwtService.signAsync({
      sub: user.id,
      userType: 'user',
      role: 0,
    });
    return { token, userInfo: user };
  }

  /**
   * 获取当前登录用户信息（凭 token 中的 sub 查询最新数据）
   */
  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    let leaderEmployee: { id: number; name: string } | null = null;
    if (user.openid) {
      const emp = await this.employeeRepo.findOne({
        where: { openid: user.openid, role: Role.LEADER, status: 1, is_leader_active: 1 },
      });
      if (emp) {
        leaderEmployee = { id: emp.id, name: emp.name };
      }
    }
    return { ...user, leaderEmployee };
  }

  private buildMockPhone(userId: number) {
    return `139${String(10000000 + userId).slice(-8)}`;
  }

  async bindUserPhone(userId: number, code: string) {
    if (!code || !code.trim()) {
      throw new BadRequestException('缺少手机号授权 code');
    }

    let phone = '';
    const appId = this.configService.get<string>('WX_APP_ID');
    const secret = this.configService.get<string>('WX_SECRET');

    if (appId && secret && !code.startsWith('mock_')) {
      try {
        const tokenResp = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`);
        const tokenData: any = await tokenResp.json();
        if (!tokenData.access_token) {
          throw new Error(tokenData.errmsg || '获取微信 access_token 失败');
        }

        const phoneResp = await fetch(`https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${tokenData.access_token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const phoneData: any = await phoneResp.json();
        phone = phoneData?.phone_info?.phoneNumber || '';
        if (!phone) {
          throw new Error(phoneData.errmsg || '获取手机号失败');
        }
      } catch (error: any) {
        if (this.isProduction()) {
          throw new BadRequestException(error?.message || '获取手机号失败');
        }
      }
    }

    if (!phone) {
      if (this.isProduction()) {
        throw new BadRequestException('获取手机号失败');
      }
      phone = this.buildMockPhone(userId);
    }

    await this.userRepo.update({ id: userId }, { phone });
    return { phone };
  }

  /**
   * 判断当前运行环境是否为生产环境
   */
  isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }
}
