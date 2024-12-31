var modifiedHeaders = $request.headers;

// 更新 Authorization 和 User-Agent
modifiedHeaders['Authorization'] = 'identify_v1 31b8c72c7c9903005f51e748ab3ba2c2CjB34X6S04ZSf1r8iIMkxX_fwP51U-dRFP1B1_vBC_uMs3_uLfQ7RdBUri6aCxxxdysSVk1zT2FWd0QzSGc5OTYzYUtsb3MyTFItWTJBOVgwWDRPUlBYN2ZyYnpUak1ubW12NzF2MTJnUGgzcFdWTGVMNml5ekh4NzFHYUstSnZxaVlFd0lZeHd3IIEC';
modifiedHeaders['User-Agent'] = 'bili-inter/74200100 os/ios model/iPhone16,2 mobi_app/iphone_i osVer/18.2 network/2 grpc-objc-cronet/1.47.0 grpc-c/25.0.0 (ios; cronet_http)';

$done({headers: modifiedHeaders});