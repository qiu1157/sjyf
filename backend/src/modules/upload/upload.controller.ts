import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Menu } from '../../common/decorators/menu.decorator';

@ApiTags('文件上传')
@Controller()
export class UploadController {
  constructor(private uploadService: UploadService) {}

  // 品类图标上传：系统管理员与主管可访问，归属内容管理菜单
  @Roles(1, 3)
  @Menu('services')
  @Post('admin/upload/category-icon')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传品类图标' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async uploadCategoryIcon(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择要上传的文件');
    return this.uploadService.handleUpload('category-icon', file);
  }

  // 服务图片上传：系统管理员与主管可访问，归属内容管理菜单
  @Roles(1, 3)
  @Menu('services')
  @Post('admin/upload/service-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传服务图片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async uploadServiceImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择要上传的文件');
    return this.uploadService.handleUpload('service-image', file);
  }

  // 走马灯大图上传：系统管理员与主管可访问，归属内容管理菜单
  @Roles(1, 3)
  @Menu('services')
  @Post('admin/upload/banner-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传走马灯大图' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async uploadBannerImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择要上传的文件');
    return this.uploadService.handleUpload('banner-image', file);
  }

  // 领队现场照片上传：领队可访问
  @Roles(4)
  @Post('leader/upload/photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传领队现场照片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async uploadLeaderPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择要上传的文件');
    return this.uploadService.handleUpload('leader-photo', file);
  }
}
