const { BadRequestError, HttpError, NotFoundError } = require('@gw/wind-core-http'),
    download = require('download'),
    axios = require('axios'),
    glob = require('glob'),
    fs = require('fs'),
    send = require('koa-send'),
    path = require('path'),
    compareVersions = require('compare-versions');

const ASSETS_PREFIX = '/assets',
    COLL_PKG_VERSION = 'package-versions',
    COLL_PKG = 'packages',
    OFFICIAL_NPM_SERVER = 'https://registry.npmjs.org';

module.exports = class AssetsService {
    constructor(app) {
        this.packageStorage = app.config.assetsPackageStorage || './';
        this.npmServer = app.config.npmServer || OFFICIAL_NPM_SERVER;
        this.app = app;
        this.logger = app.logger;
    }

    async initRoute(router) {
        this.db = await this.app.getDb(this.app.config.assetsDbName || 'assetsdb');
        // 获取npm版本包的信息
        router.get(ASSETS_PREFIX + '/info', async(ctx, next) => {
            const { name, version } = ctx.query;

            ctx.body = await this.getModuleVersionMeta(name, version);
            await next();
        });

        // 获取安装NPM包的特定版本
        router.get(ASSETS_PREFIX + '/install', async(ctx, next) => {
            const { name, version } = ctx.query;

            ctx.body = await this.installPackage(name, version);
            await next();
        });

        // 删除一个本地NPM包
        router.delete(ASSETS_PREFIX + '/:name+', async(ctx, next) => {
            const { name } = ctx.params;

            ctx.body = await this.removePackage(name);
            await next();
        });

        // 按名称查询NPM包
        router.get(ASSETS_PREFIX + '/searchname/:name+', async(ctx, next) => {
            const { name } = ctx.params;

            ctx.body = await this.searchPackageByName(name);
            await next();
        });

        // 获取本地资源包列表
        router.get(ASSETS_PREFIX + '/list', async(ctx, next) => {
            const { skip = 0, limit = 20 } = ctx.query;

            ctx.body = await this.listPackages(skip, limit);
            await next();
        });

        //  获取本地资源包信息
        router.get(ASSETS_PREFIX + '/:name+/versions', async(ctx, next) => {
            const { name } = ctx.params;

            ctx.body = await this.packageDetail(name);
            await next();
        });
        // 获取本地资源包的图元列表
        router.get(ASSETS_PREFIX + '/:name+/:version/fcs', async(ctx, next) => {
            const { name, version } = ctx.params;

            if (!name || !version) {
                throw new BadRequestError('missing parameter', {
                    name,
                    version
                });
            }

            ctx.body = await this.packageVersionDetail(name, version);

            await next();
        });

        // 下载某个特定图元
        router.get(ASSETS_PREFIX + '/download/:component+', this.downloadComponent);
    }

    /**
     * 使用 verdaccio 服务器提供的按名称搜索npm包方法，返回包列表
     * @param {String} name 包名称
     */
    searchPackageByName = async name => {
        const response = await axios.get(this.npmServer + '/-/verdaccio/search/' + name);

        return response.data;
    }

    ftSearchPackages = async query => {
        const response = await axios.get(OFFICIAL_NPM_SERVER + '/search?q=' + query);

        return response.data;
    }

    /**
     * 获取指定模块的的版本信息
     * @param {String} name 模块名称
     * @param {String} [version] 对应模块版本，空值表示获得最新的版本
     * @returns {Object} 版本信息， 如果未找到模块则返回 null
     */
    getModuleVersionMeta = async(name, version) => {
        try {
            const moduleMeta = await axios.get(this.npmServer + '/' + name);

            this.logger.debug('npm package found: ' + name);
            // 未提供版本号则直接下载最新版本
            const npmversion = version || moduleMeta.data['dist-tags'].latest;

            this.logger.debug('version:', npmversion);

            // 获取对应版本的数据
            const versionData = moduleMeta.data.versions[npmversion];

            return {
                module: moduleMeta.data,
                versionData
            };
        } catch (err) {
            if (err.response && err.response.status === 404) {
                this.logger.error('npm package not found name=%s version=%s', name, version);
                return null;
            } else {
                throw err;
            }
        }
    }

    /**
   * 从npm服务器获取资源包，将资源包下载到本地同时更新资源包库信息
   * @param nam
   * @param version
   * @returns {Promise<void>}
   */
    installPackage = async(name, version) => {
        if (!name) {
            throw new BadRequestError('package name must be provided');
        }
        this.logger.debug(`fetch with query name=${name}, version=${version}`);

        const moduleVersionMeta = await this.getModuleVersionMeta(name, version);

        if (moduleVersionMeta == null) {
            throw new HttpError(1004041, 'npm package not found');
        }
        if (moduleVersionMeta.versionData == null) {
            throw new HttpError(1004043, 'version not found', {
                versions: Object.keys(moduleVersionMeta.module.versions)
            });
        }

        const { versionData, module } = moduleVersionMeta;
        // 查找对应包是否已经存在
        let existPackage = await this.db.getCollection(COLL_PKG).findOne({
            name: versionData.name
        });

        // 插入对应包
        if (!existPackage) {
            existPackage = await this.db.getCollection(COLL_PKG).insert({
                name: versionData.name,
                description: versionData.description,
                author: versionData.author,
                type: versionData.packageType,
                version: versionData.version,
                time: module.time.created,
                modified: module.time.modified
            });
        }

        // 查找指定版本是否存在
        let existVersion = await this.db.getCollection(COLL_PKG_VERSION).findOne({
            name: versionData.name,
            version: versionData.version
        });

        const targetPath = path.resolve(this.packageStorage, `./${name}-${versionData.version}/`);

        if (!existVersion) {
            // 下载版本tar包
            try {
                await download(versionData.dist.tarball, targetPath, {
                    extract: true
                });
            } catch (e) {
                throw new HttpError(1005041, 'Download and extract failed, please retry', versionData);
            }
            this.logger.debug('downloaded to ' + targetPath);
            // 插入版本记录
            const packageVersion = {
                name: versionData.name,
                version: versionData.version,
                description: versionData.description,
                author: versionData.author,
                type: versionData.packageType,
                time: module.time[versionData.version]
            };

            existVersion = packageVersion;

            await this.db.getCollection(COLL_PKG_VERSION).insert(packageVersion);

            // 比较，并更新到最新版本
            if (compareVersions(versionData.version, existPackage.version) > 0) {
                this.db.getCollection(COLL_PKG).patch(existPackage.id, {
                    version: versionData.version,
                    time: module.time[versionData.version]
                });
            }
        } else {
            this.logger.debug('skip downloading: the version already exist');
        }

        return {
            location: targetPath,
            package: existPackage,
            version: existVersion
        };
    }

    /**
     * 获取本地资源包列表
     * @param ctx
     * @param next
     * @return {Promise<void>}
     */
    listPackages = async(skip, limit) => {
        const packages = await this.db.getCollection('packages').find({}, {
                skip,
                limit
            }),

            total = await this.db.getCollection('packages').count({});

        return {
            skip,
            limit,
            total,
            list: packages
        };
    }

    /**
     * 获取资源包信息及版本列表
     * @param {String} name 资源包名称
     */
    packageDetail = async name => {
        const packageObject = await this.db.getCollection(COLL_PKG).findOne({
            name
        });

        if (packageObject == null) {
            throw new NotFoundError('package not found');
        }

        const versions = await this.db.getCollection(COLL_PKG_VERSION).find({
            name
        });

        return {
            package: packageObject,
            versions
        };
    }

    /**
     * 删除本地资源模块
     * @param {String} name 模块名称
     */
    removePackage = async name => {
        const result = {
                name,
                versions: []
            },
            versions = await this.db.getCollection(COLL_PKG_VERSION).find({
                name
            });

        // 删除每个版本和对应的文件
        for (const version of versions) {
            await fs.promises.rmdir(path.resolve(this.packageStorage, `./${name}-${version.version}`), {
                recursive: true
            });
            await this.db.getCollection(COLL_PKG_VERSION).remove(version._id);

            result.versions.push(version.version);
        }
        await this.db.getCollection(COLL_PKG).remove({
            name
        });
        return result;
    }

    /**
     * 获取包版本信息，包含了内含的组件列表
     * @param ctx
     * @param next
     * @return {Promise<void>}
     */
    packageVersionDetail = async(name, version) => {
        this.logger.debug(`get components of ${name}-${version}`);
        const packageVersion = await this.db.getCollection(COLL_PKG_VERSION).findOne({
            name,
            version
        });

        if (packageVersion == null) {
            throw new NotFoundError('package version not found', {
                name,
                version
            });
        }

        this.logger.debug('glob folder %s ', path.resolve(this.packageStorage, `./${name}-${version}/package`));
        const componentFiles = await this.promiseGlob('./build/*.fcp.js', {
            cwd: path.resolve(this.packageStorage, `./${name}-${version}/package`)
        });

        return {
            packageVersion: version,
            components: componentFiles
        };
    }

    /**
     * 下载组件正文内容
     * @return {Promise<void>}
     */
    downloadComponent = async(ctx, next) => {
        const { component } = ctx.params,

            targetFile = path.resolve(this.packageStorage, component);

        if (fs.existsSync(targetFile)) {
            const fsState = fs.statSync(targetFile);

            if (fsState.isDirectory()) {
                const dirs = fs.readdirSync(targetFile);

                ctx.body = dirs;
            } else {
                await send(ctx, targetFile, {
                    root: '/'
                });
            }
        } else {
            throw new NotFoundError('component not found', {
                component
            });
        }
        await next();
    }

    promiseGlob = async(pattern, opts) => {
        return new Promise((resolve, reject) => {
            glob(pattern, opts, (er, files) => {
                if (er) {
                    reject(er);
                } else {
                    resolve(files);
                }
            });
        });
    }
};
