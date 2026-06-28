#!/usr/bin/env node
/** Master eval: fetch PNGs from gusha-api and upload to ASC iris API (run in ASC tab). */
const API = process.argv[2] || "https://gusha-api.onrender.com";

console.log(`(async () => {
  const API = ${JSON.stringify(API)};
  const manifest = await fetch(API + '/api/asc-screenshots/manifest').then(r => {
    if (!r.ok) throw new Error('manifest ' + r.status);
    return r.json();
  });
  const results = [];
  for (const file of manifest.files) {
    const { fileName, fileSize, md5, url } = file;
    const buf = await fetch(API + url).then(r => {
      if (!r.ok) throw new Error('fetch ' + fileName + ' ' + r.status);
      return r.arrayBuffer();
    });
    const bytes = new Uint8Array(buf);
    if (bytes.length !== fileSize) {
      results.push({ fileName, error: 'size', got: bytes.length, expected: fileSize });
      continue;
    }
    const reserve = await fetch('https://appstoreconnect.apple.com/iris/v1/appScreenshots', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'appScreenshots',
          attributes: { fileName, fileSize: bytes.length },
          relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: manifest.setId } } }
        }
      })
    });
    const reserveText = await reserve.text();
    if (!reserve.ok) {
      results.push({ fileName, step: 'reserve', status: reserve.status, body: reserveText.slice(0, 400) });
      continue;
    }
    const reserveJ = JSON.parse(reserveText);
    let screenshotId = reserveJ.data.id;
    let failed = false;
    for (const op of reserveJ.data.attributes.uploadOperations) {
      const chunk = bytes.slice(op.offset, op.offset + op.length);
      const headers = {};
      for (const h of op.requestHeaders || []) headers[h.name] = h.value;
      const put = await fetch(op.url, { method: op.method || 'PUT', headers, body: chunk });
      if (!put.ok) {
        results.push({ fileName, step: 'put', status: put.status, body: (await put.text()).slice(0, 200) });
        failed = true;
        break;
      }
    }
    if (failed) continue;
    const commit = await fetch('https://appstoreconnect.apple.com/iris/v1/appScreenshots/' + screenshotId, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { type: 'appScreenshots', id: screenshotId, attributes: { uploaded: true, sourceFileChecksum: md5 } }
      })
    });
    const commitText = await commit.text();
    let delivery = null;
    if (commit.ok) {
      await new Promise(r => setTimeout(r, 2000));
      const check = await fetch('https://appstoreconnect.apple.com/iris/v1/appScreenshots/' + screenshotId + '?include=assetDeliveryState', { credentials: 'include' });
      if (check.ok) delivery = (await check.json()).data?.attributes?.assetDeliveryState?.state;
    }
    results.push({ fileName, step: 'done', screenshotId, commitStatus: commit.status, delivery, body: commitText.slice(0, 200) });
  }
  return JSON.stringify(results, null, 2);
})()`);
