const AssetsService = require('./assets_service'),
    name = require('../package.json').name,
    version = require('../package.json').version,
    description = require('../package.json').description;

module.exports = {
    name,
    description,
    version,
    type: 'node',
    // 模块初始化动作，对于核心模块可以进行koa相关插件注册
    // 业务模块可以进行服务创建
    async created(app) {
    },

    // 模块路由注册，对外提供API可在此写api相关地址
    async ready(app) {
        app.services.assetsService = new AssetsService(app);
        await app.services.assetsService.initRoute(app.router);
    },

    // 启动收尾工作，可以在此执行建库、建索引等一些全局的具体业务操作
    //
    async bootComplete(app) {
    }
};
