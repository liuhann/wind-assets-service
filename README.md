# asset service
本地资源服务

## install & test

```shell script

npm install
npm run module

```

## 参数

- npmServer： 源NPM服务器地址
- assetsPackageStorage： 本地存放下载的资源包文件夹
- assetsDbName： 本地默认使用的资源数据库名称 
- lowdb： 使用lowdb存储时需要给出的数据库文件存放目录

示例
```

module.exports = {
    npmServer: 'http://10.10.247.1:4873',
    port: 8082, // REST服务端口
    assetsPackageStorage: path.resolve(__dirname, '../asset_store/npm_packages'),
    assetsDbName: 'assetsdb',
    lowdb: {
        store: path.resolve(__dirname, '../asset_store')
    },
    log4js: {
        appenders: {
            out: { type: 'stdout' },
            app: {
                type: 'file',
                filename: 'application.log'
            },
            project: {
                type: 'file',
                filename: 'project.log'
            }
        },
        categories: {
            default: {
                appenders: ['out', 'app'],
                level: 'debug'
            },
            project: {
                appenders: ['project'],
                level: 'debug'
            }
        }
    },
    api: '/api' // 默认rest接口统一前缀
};

```

## API

### 获取所有资源包

GET http://10.10.247.1:4877/api/assets/list

```json
{
  "code": "0",
  "msg": "成功",
  "data":{
  "skip": 0,
  "limit": 100,
  "total": 1,
  "list":[
    {
      "name": "@gw/components-pack-sample",
      "version": "0.1.7",
      "description": "开发类图元包样例",
      "author":{"name": "刘晗", "email": "liuhan@goldwind.com.cn"},
      "time": "2020-06-15T08:13:37.860Z",
      "id": "a7ed582a-ec91-4aa9-92e1-3e45475b1bb1"
    }
    ]
  }
}
```
### 获取资源包内图元

GET http://10.10.247.1:4877/api/assets/@gw/components-pack-sample/0.1.7/fcs

- 参数： 
包名 (@gw/components-pack-sample) 
版本 (0.1.7)

返回

```json
{
  "code": "0",
  "msg": "成功",
  "data":{
  "packageVersion": "0.1.7",
  "components":[
    "./build/Status.component.js"
    ]
  }
}
```

### 下载资源包图元

GET http://10.10.247.1:4877/api/assets/download/@gw/components-pack-sample-0.1.7/package/build/Status.component.js

参数：包名 （@gw/components-pack-sample）版本 (0.1.7) 组件名称 build/Status.component.js

返回js脚本

```javascript
this["@gw/components-pack-sample/build/Status.stories.js"]=function(e){}
```

### 安装图元包

GET http://10.10.247.1:4877/api/assets/install?name=@gw/components-pack-sample&version=0.1.7
- 参数： 
包名 (@gw/components-pack-sample) 
版本 (0.1.7)


### 获取图元包版本列表

GET http://10.10.247.1:4877/api/assets/@gw/components-pack-sample/versions

参数：包名 （@gw/components-pack-sample）

通过此方法可以获取特定的图元包版本

```json

{
  "code": "0",
  "msg": "成功",
  "data":{
  "package":{"name": "@gw/components-pack-sample", "description": "开发类图元包样例", "author":{"name": "刘晗",…},
  "versions":[
    {
    "name": "@gw/components-pack-sample",
    "version": "0.1.7",
    "description": "开发类图元包样例",
    "author":{"name": "刘晗", "email": "liuhan@goldwind.com.cn"},
    "time": "2020-06-15T08:13:37.860Z",
    "id": "a7ed582a-ec91-4aa9-92e1-3e45475b1bb1"
    },
    {
    "name": "@gw/components-pack-sample",
    "version": "0.1.8",
    "description": "开发类图元包样例",
    "author":{"name": "刘晗", "email": "liuhan@goldwind.com.cn"},
    "time": "2020-06-16T01:26:49.442Z",
    "id": "cc3e8069-4c63-4621-8139-519212d5159d"
    }
    ]
  }
}
```

## 说明

