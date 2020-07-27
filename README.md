# asset service
������Դ����

## install & test

```shell script

npm install
npm run module

```

## ����

- npmServer�� ԴNPM��������ַ
- assetsPackageStorage�� ���ش�����ص���Դ���ļ���
- assetsDbName�� ����Ĭ��ʹ�õ���Դ���ݿ����� 
- lowdb�� ʹ��lowdb�洢ʱ��Ҫ���������ݿ��ļ����Ŀ¼

ʾ��
```

module.exports = {
    npmServer: 'http://10.10.247.1:4873',
    port: 8082, // REST����˿�
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
    api: '/api' // Ĭ��rest�ӿ�ͳһǰ׺
};

```

## API

### ��ȡ������Դ��

GET http://10.10.247.1:4877/api/assets/list

```json
{
  "code": "0",
  "msg": "�ɹ�",
  "data":{
  "skip": 0,
  "limit": 100,
  "total": 1,
  "list":[
    {
      "name": "@gw/components-pack-sample",
      "version": "0.1.7",
      "description": "������ͼԪ������",
      "author":{"name": "����", "email": "liuhan@goldwind.com.cn"},
      "time": "2020-06-15T08:13:37.860Z",
      "id": "a7ed582a-ec91-4aa9-92e1-3e45475b1bb1"
    }
    ]
  }
}
```
### ��ȡ��Դ����ͼԪ

GET http://10.10.247.1:4877/api/assets/@gw/components-pack-sample/0.1.7/fcs

- ������ 
���� (@gw/components-pack-sample) 
�汾 (0.1.7)

����

```json
{
  "code": "0",
  "msg": "�ɹ�",
  "data":{
  "packageVersion": "0.1.7",
  "components":[
    "./build/Status.component.js"
    ]
  }
}
```

### ������Դ��ͼԪ

GET http://10.10.247.1:4877/api/assets/download/@gw/components-pack-sample-0.1.7/package/build/Status.component.js

���������� ��@gw/components-pack-sample���汾 (0.1.7) ������� build/Status.component.js

����js�ű�

```javascript
this["@gw/components-pack-sample/build/Status.stories.js"]=function(e){}
```

### ��װͼԪ��

GET http://10.10.247.1:4877/api/assets/install?name=@gw/components-pack-sample&version=0.1.7
- ������ 
���� (@gw/components-pack-sample) 
�汾 (0.1.7)


### ��ȡͼԪ���汾�б�

GET http://10.10.247.1:4877/api/assets/@gw/components-pack-sample/versions

���������� ��@gw/components-pack-sample��

ͨ���˷������Ի�ȡ�ض���ͼԪ���汾

```json

{
  "code": "0",
  "msg": "�ɹ�",
  "data":{
  "package":{"name": "@gw/components-pack-sample", "description": "������ͼԪ������", "author":{"name": "����",��},
  "versions":[
    {
    "name": "@gw/components-pack-sample",
    "version": "0.1.7",
    "description": "������ͼԪ������",
    "author":{"name": "����", "email": "liuhan@goldwind.com.cn"},
    "time": "2020-06-15T08:13:37.860Z",
    "id": "a7ed582a-ec91-4aa9-92e1-3e45475b1bb1"
    },
    {
    "name": "@gw/components-pack-sample",
    "version": "0.1.8",
    "description": "������ͼԪ������",
    "author":{"name": "����", "email": "liuhan@goldwind.com.cn"},
    "time": "2020-06-16T01:26:49.442Z",
    "id": "cc3e8069-4c63-4621-8139-519212d5159d"
    }
    ]
  }
}
```

## ˵��

