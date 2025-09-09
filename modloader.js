const moduleCache = new Map();
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

const standaloneFetchBlob = async id => {
		if (! (await indexedDB.databases()).some(db => db.name === 'BlobDB' && db.version === 1)) throw new Error('IndexedDB "BlobDB" does not not exist');
		let db = await new Promise((resolve, reject) => Object.assign(indexedDB.open("BlobDB", 1), {
			onsuccess: evt => resolve(evt.target.result),
			onerror: evt => reject(evt)
		}));
		return new Promise((resolve, reject) => Object.assign(db.transaction("blobs").objectStore("blobs").get(id), {
			onsuccess: evt => resolve(evt.target.result?.blob),
			onerror: evt => reject(evt)
		}));
	}

function createModule(absUrl) {
	let module = {
		__absUrl: absUrl,
		__filename: new URL(absUrl).pathname.match(/\/([^\/]+)$/)[1],
		__dirname: new URL(".", absUrl).href,
		exports: null
	}
	module.require = require.bind(module);
	module.require.cache = moduleCache;
	return module;
}

async function loadModule(m) {
	let url = new URL(m.__absUrl);
	let textContent;
	switch (url.protocol) {
		case "blobdb:":
			try {
				let buffer = await standaloneFetchBlob(url.hostname + url.pathname);
				if (!buffer) throw new Error("blob not found");
				textContent = new TextDecoder().decode(buffer);
			} catch (err) {
				throw new Error(`unable to load module from url ${url.href}: ${err.message}`);
			}
			break;
		default:
			let response = await fetch(url.href);
			if (!response.ok) throw new Error(`unable to load module from url ${url.href}: ${response.status} ${response.statusText}`);
			textContent = await response.text();
	}
	await new AsyncFunction('module', 'require', textContent)(m, m.require);
}

async function require(path) {
	let absUrl = new URL(path, this.__dirname).href;
	if (moduleCache.has(absUrl)) return moduleCache.get(absUrl).exports;
	let m = createModule(absUrl);
	try {
		await loadModule(m);
		moduleCache.set(absUrl, m);
	} catch (err) {
		console.error(err);
	}
	return m.exports;
}
