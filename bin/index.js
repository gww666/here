#!/usr/bin/env node
const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const mime = require("./mime");
const exec = require("child_process").exec;
const alias = {
    "p": "port"
}
const _default = {
    port: "2234",
    hostname: "127.0.0.1"
}

//解析参数
const args = ((a) => {
    let _args = {};
    let params = process.argv.slice(2);
    if (params.length) {
        params.forEach(item => {
            //去掉代表参数的-
            let key = item.split("=")[0].slice(1);
            let value = item.split("=")[1];
            _args[a[key]] = value;
        });
    }
    return _args;
})(alias); 

const item = (name, parentPath) => {
    let path = parentPath = `${parentPath}/${name}`.slice(1);
    return `<div><a href="${path}">${name}</a></div>`;
}

const list = (arr, parentPath) => {
    return arr.map(name => item(name, parentPath)).join("");
}

const server = http.createServer((req, res) => {
    if (req.method === "GET") {
        let _path = url.parse(req.url).pathname;//去掉search
        let parentPath = _path;
        try {
            _path = path.join(process.cwd(), _path);
            let stats = fs.statSync(_path);
            if (stats.isFile()) {
                //判断文件是否有改动，没有改动返回304
                //从请求头获取modified时间
                let IfModifiedSince = req.headers["if-modified-since"];
                //获取文件的修改日期
                let mtime = stats.mtime;
                res.setHeader("last-modified", new Date(mtime).toString());
                if (IfModifiedSince && mtime <= new Date(IfModifiedSince).getTime()) {
                    //返回304
                    res.writeHead(304, "not modify");
                    res.end();
                    return;
                }
                let ext = path.parse(_path).ext;
                
                res.setHeader("content-type", mime[ext] || mime.txt);
                res.setHeader("content-encoding", "gzip");
                let reg = /\.html$/;
                //不同的文件类型设置不同的cache-control
                if (reg.test(_path)) {
                    res.setHeader("cache-control", "no-cache");
                } else {
                    res.setHeader("cache-control", `max-age=${1 * 60 * 60 * 24 * 30}`);
                }
                // res.setHeader("cache-control", "no-store");
                // res.setHeader("cache-control", "no-cache");
                
                //是文件
                const gzip = zlib.createGzip();
                let readStream = fs.createReadStream(_path);
                readStream.pipe(gzip).pipe(res);
            } else if (stats.isDirectory()) {
                //是目录
                let dirArray = fs.readdirSync(_path);
                res.setHeader("content-type", "text/html;charset=utf-8");
                res.end(list(dirArray, parentPath));
            }
        } catch (err) {
            console.log("err", err);
            
            res.writeHeader(404, "Not Found");
            res.end();
        }
    } else {
        res.end();
    }
});
let port = args.port || _default.port;
let host = _default.hostname;
server.listen(port, host, () => {
    console.log(`server is running on http://${host}:${port}`);
    exec(`open http://${host}:${port}`);
});