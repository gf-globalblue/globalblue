{
	IDBTransaction.prototype.toPromise = IDBRequest.prototype.toPromise = function() {
		const tInvalid = 0, tAnonymous = 1, tNamed = 2;
		const _t = arg => (arg instanceof Function) ? arg.name?.length > 0 ? tNamed : tAnonymous : tInvalid;
		let args = Array.from(arguments);
		return new Promise((resolve, reject) => {
			let ta0 = _t(args[0]);
			if (args.length === 0 || ta0 === tNamed) this.onsuccess = evt => resolve(evt.target.result);
			if (ta0 === tAnonymous) this.onsuccess = evt => resolve(args[0](evt.target.result));
			for (let arg of args) if (_t(arg) === tNamed) this[arg.name] = evt => arg(evt.target.result, resolve, reject);
			this.onerror = evt => reject(evt);
		});
	}

	class BlobDB {
		static async open() {
			return BlobDB.__db ??= await indexedDB.open("BlobDB", 1).toPromise(function onupgradeneeded(db) {
				db.createObjectStore("meta", {keyPath: "id"});
				db.createObjectStore("blobs", {keyPath: "id"});
			});
		}
		
		static async fetch(id) {
			let db = await BlobDB.open();
			return db.transaction("blobs").objectStore("blobs").get(id).toPromise(result => result?.blob);
		}
		
		static async getMeta(id) {
			let db = await BlobDB.open();
			return db.transaction("meta").objectStore("meta").get(id).toPromise(result => result?.meta);
		}
		
		static async store(id, blob, meta) {
			let db = await BlobDB.open();
			let tx = db.transaction(["blobs", "meta"], "readwrite");
			tx.objectStore("blobs").put({id, blob});
			if (meta) tx.objectStore("meta").put({id, meta});
			tx.commit();
			const oncomplete = (result, resolve) => resolve(result);
			return tx.toPromise(oncomplete);
		}
		
		static async selfContainedFetchBlob(id) {
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
	}
	window.BlobDB = BlobDB;
	
	class DirectorySync {
		/* new DirectorySync({path, handle, pattern, recurse}, {pathN, handleN, patternN, recurseN}, ...) */
		constructor() {
			this.directories = Array.from(arguments);
		}
		
		static async create(path, pattern) {
			let dirHandle = window.dirHandle = await window.showDirectoryPicker();
			return new DirectorySync(path, dirHandle, pattern);
		}
		
		async sync() {
			let directories = Array.from(this.directories);
			let tasks = [];
			while (directories.length > 0) {
				let thisDir = directories.shift();
				let hasFilterPattern = thisDir.pattern instanceof RegExp || typeof(thisDir.pattern) === 'string';
				for await (let [entryName, entryHandle] of thisDir.handle.entries()) {
					if (entryHandle.kind === "directory" && thisDir.recurse) {
						directories.push(Object.assign({}, thisDir, {path: thisDir.path + "/" + entryName, handle: entryHandle}));
						continue;
					} else if (entryHandle.kind === "file") {
						if (hasFilterPattern && ! entryName.match(thisDir.pattern)) continue;
						tasks.push(new Promise(async resolve => {
							let blobId = thisDir.path + "/" + entryName;
							let file = await entryHandle.getFile();
							let meta = await BlobDB.getMeta(blobId);
							if (!meta || meta.lastModified != file.lastModified || meta.size != file.size) {
								if (this.cbLog) this.cbLog(`uploading ${blobId}`);
								let content = await new Promise(resolve => {
									let reader = new FileReader();
									reader.onloadend = e => resolve(reader.result);
									reader.readAsArrayBuffer(file);
								});
								await BlobDB.store(blobId, content, {
									lastModified: file.lastModified,
									size: file.size,
									type: file.type
								});
							}
							resolve();
						}));
					}
				}
			}
			await Promise.all(tasks);
		}
		
		startMonitor(interval) {
			const dsInstance = this;
			return new Promise(async resolve => {
				dsInstance.__monitorRunning = true;
				while (dsInstance.__monitorRunning) {
					await dsInstance.sync();
					await new Promise(r => setTimeout(r, interval));
				}
				dsInstance.__monitorRunning = false;
				resolve();
			});
		}
		
		stopMonitor() {
			this.__monitorRunning = false;
		}
	}
	window.DirectorySync = DirectorySync;
}
