import { serve } from "https://deno.land/std/http/server.ts";

// 同查找 _U 一样, 查找 KievRPSSecAuth、_RwBf 的值并替换下方的xxx
const KievRPSSecAuth = 'xxx';
const _RwBf = 'xxx';
const SYDNEY_ORIGIN = 'https://sydney.bing.com';
const BING_ORIGIN = 'https://www.bing.com';
const KEEP_REQ_HEADERS = [
  'accept',
  'accept-encoding',
  'accept-language',
  'connection',
  'cookie',
  'upgrade',
  'user-agent',
  'sec-websocket-extensions',
  'sec-websocket-key',
  'sec-websocket-version',
  'x-request-id',
  'content-length',
  'content-type',
  'access-control-request-headers',
  'access-control-request-method',
];
const IP_RANGE = [
  ['3.2.50.0', '3.5.31.255'], //192,000
  ['3.12.0.0', '3.23.255.255'], //786,432
  ['3.30.0.0', '3.33.34.255'], //205,568
  ['3.40.0.0', '3.63.255.255'], //1,572,864
  ['3.80.0.0', '3.95.255.255'], //1,048,576
  ['3.100.0.0', '3.103.255.255'], //262,144
  ['3.116.0.0', '3.119.255.255'], //262,144
  ['3.128.0.0', '3.247.255.255'], //7,864,320
];

/**
 * 随机整数 [min,max)
 * @param {number} min
 * @param {number} max
 * @returns
 */
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;

/**
 * ip 转 int
 * @param {string} ip
 * @returns
 */
const ipToInt = (ip) => {
  const ipArr = ip.split('.');
  let result = 0;
  result += +ipArr[0] << 24;
  result += +ipArr[1] << 16;
  result += +ipArr[2] << 8;
  result += +ipArr[3];
  return result;
};

/**
 * int 转 ip
 * @param {number} intIP
 * @returns
 */
const intToIp = (intIP) => {
  return `${(intIP >> 24) & 255}.${(intIP >> 16) & 255}.${(intIP >> 8) & 255}.${intIP & 255}`;
};

const getRandomIP = () => {
  const randIndex = getRandomInt(0, IP_RANGE.length);
  const startIp = IP_RANGE[randIndex][0];
  const endIp = IP_RANGE[randIndex][1];
  const startIPInt = ipToInt(startIp);
  const endIPInt = ipToInt(endIp);
  const randomInt = getRandomInt(startIPInt, endIPInt);
  const randomIP = intToIp(randomInt);
  return randomIP;
};

/**
 * home
 * @param {string} pathname
 * @returns
 */
const home = async (pathname) => {
  const baseUrl = 'https://raw.githubusercontent.com/Harry-zklcdc/go-proxy-bingai/master/';
  let url;
  if (pathname.indexOf('/web/') === 0) {
    url = pathname.replace('/web/', baseUrl+'web/');
  } else {
    url = baseUrl + 'web/index.html';
  }
  const res = await fetch(url,{mode: "ipv4"});
  const newRes = new Response(res.body, res);
  if (pathname.endsWith('.js')) {
    newRes.headers.set('content-type', 'application/javascript');
  } else if (pathname.endsWith('.css')) {
    newRes.headers.set('content-type', 'text/css');
  } else if (pathname.endsWith('.svg')) {
    newRes.headers.set('content-type', 'image/svg+xml');
  } else if (pathname.endsWith('.ico') || pathname.endsWith('.png')) {
    newRes.headers.set('content-type', 'image/png');
  } else {
    newRes.headers.set('content-type', 'text/html; charset=utf-8');
  }
  newRes.headers.delete('content-security-policy');
  return newRes;
};

const server = Deno.listen({ port: 8000 });

console.log("Listening on http://localhost:8000/");

for await (const conn of server) {
  handleConnection(conn);
}

async function handleConnection(conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const requestEvent of httpConn) {
    const currentUrl = new URL(requestEvent.request.url);
    // if (currentUrl.pathname === '/' || currentUrl.pathname.startsWith('/github/')) {
    if (currentUrl.pathname === '/' || currentUrl.pathname.indexOf('/web/') === 0) {
      requestEvent.respondWith(await home(currentUrl.pathname));
    }
    if (currentUrl.pathname === '/sysconf') {
      requestEvent.respondWith(new Response('{"code":200,"message":"success","data":{"isSysCK":false,"isAuth":true}}'));
    }
    let targetUrl;
    if (currentUrl.pathname.includes('/sydney')) {
      targetUrl = new URL(SYDNEY_ORIGIN + currentUrl.pathname + currentUrl.search);
    } else {
      targetUrl = new URL(BING_ORIGIN + currentUrl.pathname + currentUrl.search);
    }

    const newHeaders = new Headers();
    requestEvent.request.headers.forEach((value, key) => {
      // console.log(`old : ${key} : ${value}`);
      if (KEEP_REQ_HEADERS.includes(key)) {
        newHeaders.set(key, value);
      }
    });
    newHeaders.set('host', targetUrl.host);
    newHeaders.set('origin', targetUrl.origin);
    newHeaders.set('referer', 'https://www.bing.com/search?q=Bing+AI');

    const response = await fetch(targetUrl, {
      method: requestEvent.request.method,
      headers: newHeaders,
      body: requestEvent.request.body,
      mode: "ipv4",
    });

    const newRes = new Response(response.body, response);
    newRes.headers.set('access-control-allow-origin', '*');
    newRes.headers.set('access-control-allow-headers', '*');
    newRes.headers.set('access-control-allow-methods', '*');
    newRes.headers.set('access-control-expose-headers', '*');
    newRes.headers.set('access-control-max-age', '86400');
    newRes.headers.set('content-security-policy', "default-src 'none'; img-src https: data:; script-src 'unsafe-inline' 'unsafe-eval' https: data: blob:; style-src 'unsafe-inline' https: data:; font-src https: data:");
    if (pathname.endsWith('.js')) {
      newRes.headers.set('content-type', 'application/javascript');
    } else if (pathname.endsWith('.css')) {
      newRes.headers.set('content-type', 'text/css');
    } else if (pathname.endsWith('.svg')) {
      newRes.headers.set('content-type', 'image/svg+xml');
    } else if (pathname.endsWith('.ico') || pathname.endsWith('.png')) {
      newRes.headers.set('content-type', 'image/png');
    } else {
      newRes.headers.set('content-type', 'text/html; charset=utf-8');
    }
    newRes.headers.delete('content-security-policy');
    requestEvent.respondWith(newRes);
  }
}
