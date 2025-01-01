#!name=Bilibili 共享会员模块
#!desc=适用于 Surge 5 的 Bilibili 共享会员模块，支持 Authorization 和 User-Agent 配置
#!author=伟人
#!homepage=https://gitlab.com/isous/loonresource/-/blob/main/README.md
#!icon=https://gitlab.com/isous/loonresource/-/raw/main/Icon/Bilibili.png

[General]
Bilibili_Authorization=identify_v1 31b8c72c7c9903005f51e748ab3ba2c2jB34X6S04ZSf1r8iIMkxX_fwP51U-dRFP1B1_vBC_uMs3_uLfQ7RdBUri6aCxxxdysSVk1zT2FWdWQzSGc5OTYzYUt sb3MyTFlWTJBOVgwWDRPUlBYN2ZyYnpUak1ubW12NzF2MTJnUGgzcFdWTGVMNmI5ekh4NzFHYUstSnZxaVlFd0lZeHd3IIEC
Bilibili_User-Agent=bili-inter/82300100 os/ios model/iPhone 15 Pro Max mobi_app/iphone_i osVer/18.2 network/1 grpc-objc-cronet/1.47.0 grpc-c/25.0.0 (ios; cronet_http)

[Script]
http-request ^https?:\/\/(grpc\.biliapi\.net|app\.bilibili\.com)\/bilibili\.app\.playerunite\.v1\.Player\/PlayViewUnite(\?.+)?$ script-path=https://gitlab.com/isous/loonresource/-/raw/main/Script/Bilibili/Bilibili_shared_membership.js,tag=iPhone端共享会员
http-request ^https?:\/\/(grpc\.biliapi\.net|app\.bilibili\.com)\/bilibili\.pgc\.gateway\.player\.v2\.PlayURL\/PlayView$ script-path=https://gitlab.com/isous/loonresource/-/raw/main/Script/Bilibili/Bilibili_shared_membership.js,tag=iPad端共享会员

[MITM]
hostname=grpc.biliapi.net,app.bilibili.com