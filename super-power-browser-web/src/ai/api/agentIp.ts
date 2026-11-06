import request from '../utils/request';
export const getAllCoupon = (params?: any) => request({url: 'ai-support/coupons', params});
export const getAllCouponAndDiscount = (data?: any) => request({url: 'ai-support/quote', method: 'POST', data});
export const getInfoByKey = (params?: any) => request({url: 'ai-support/config', params});
