import { User } from './user.entity';
import { UserAddress } from './user-address.entity';
import { ServiceCategory } from './service-category.entity';
import { ServiceItem } from './service-item.entity';
import { Employee } from './employee.entity';
import { Material } from './material.entity';
import { Order } from './order.entity';
import { OrderEmployee } from './order-employee.entity';
import { OrderMaterial } from './order-material.entity';
import { OrderPhoto } from './order-photo.entity';
import { OrderAdjustment } from './order-adjustment.entity';
import { OrderHistory } from './order-history.entity';
import { Coupon } from './coupon.entity';
import { UserCoupon } from './user-coupon.entity';
import { Review } from './review.entity';
import { OperationLog } from './operation-log.entity';
import { RoleMenuPermission } from './role-menu-permission.entity';

export const entities = [
  User, UserAddress,
  ServiceCategory, ServiceItem,
  Employee, Material,
  Order, OrderEmployee, OrderMaterial, OrderPhoto, OrderAdjustment, OrderHistory,
  Coupon, UserCoupon, Review, OperationLog, RoleMenuPermission,
];

export {
  User, UserAddress,
  ServiceCategory, ServiceItem,
  Employee, Material,
  Order, OrderEmployee, OrderMaterial, OrderPhoto, OrderAdjustment, OrderHistory,
  Coupon, UserCoupon, Review, OperationLog, RoleMenuPermission,
};
